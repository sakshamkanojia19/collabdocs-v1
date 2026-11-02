import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Gavel,
  Grid2X2,
  LayoutTemplate,
  List,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  UsersRound,
  WandSparkles
} from 'lucide-react';
import {
  createDocument,
  deleteDocument,
  fetchDocuments,
  updateDocument
} from '../store/documentSlice';
import MyWorkSection from '../components/documents/MyWorkSection';
import DocumentPreviewCard from '../components/documents/DocumentPreviewCard';
import TemplateCard from '../components/documents/TemplateCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/document-display';
import api from '../services/api';

// Each template creates its sections, so a new document opens with structure.
const templates = [
  {
    label: 'Meeting notes',
    icon: NotebookPen,
    title: 'Meeting notes',
    outline: ['Agenda', 'Discussion notes', 'Decisions', 'Action items']
  },
  {
    label: 'Product spec',
    icon: LayoutTemplate,
    title: 'Product spec',
    outline: ['Problem', 'Goals', 'Requirements', 'Open questions']
  },
  {
    label: 'Project brief',
    icon: FileText,
    title: 'Project brief',
    outline: ['Goals', 'Scope', 'Owners', 'Timeline']
  },
  {
    label: 'Decision record',
    icon: Gavel,
    title: 'Decision record',
    outline: ['Context', 'Options considered', 'Decision', 'Outcome']
  }
];

const templateContent = ({ title, outline }) =>
  `<h1>${title}</h1>${outline.map((section) => `<h2>${section}</h2><p></p>`).join('')}`;

const SORTS = {
  edited: { label: 'Last edited', compare: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt) },
  created: { label: 'Newest first', compare: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  title: { label: 'Title A–Z', compare: (a, b) => (a.title || '').localeCompare(b.title || '') }
};

const HOME_DOCUMENT_LIMIT = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

const greetingFor = (date) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="space-y-2">
      <div className="h-4 w-40 rounded bg-muted/70" />
      <div className="h-7 w-64 rounded bg-muted" />
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => <div key={item} className="h-[92px] rounded-xl border bg-card" />)}
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((item) => <div key={item} className="h-40 rounded-xl border bg-card" />)}
    </div>
  </div>
);

const StatTile = ({ label, value, detail, detailTone = 'success', onClick }) => (
  <button type="button" onClick={onClick} className="interactive-card p-4 text-left">
    <span className="block text-caption text-muted-foreground">{label}</span>
    <span className="mt-1 block text-title font-semibold">{value}</span>
    <span
      className={cn(
        'mt-0.5 block truncate text-caption font-medium',
        detailTone === 'success' ? 'text-success' : 'text-muted-foreground'
      )}
    >
      {detail}
    </span>
  </button>
);

const Dashboard = ({ forcedView = null }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { documents, loading, error } = useSelector((state) => state.document);
  const { user } = useSelector((state) => state.auth);
  const { items: notifications } = useSelector((state) => state.notifications);

  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [layout, setLayout] = useState('grid');
  const [sortKey, setSortKey] = useState('edited');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [workItems, setWorkItems] = useState([]);
  const [workLoading, setWorkLoading] = useState(true);
  const [decisionPulse, setDecisionPulse] = useState({ total: 0, thisWeek: 0, decisions: [] });

  const activeView = forcedView || searchParams.get('view') || 'all';
  const isHome = activeView === 'all';

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  // Open work and the decision pulse feed both the stat tiles and the rail.
  const loadPulse = useCallback(() => {
    api
      .get('/ai/action-items?status=open&limit=50')
      .then((response) => setWorkItems(response.data?.actionItems || []))
      .catch(() => setWorkItems([]))
      .finally(() => setWorkLoading(false));
    api
      .get('/chat/decisions?limit=3')
      .then((response) =>
        setDecisionPulse({
          total: response.data?.total || 0,
          thisWeek: response.data?.thisWeek || 0,
          decisions: response.data?.decisions || []
        })
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isHome) loadPulse();
  }, [isHome, loadPulse]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setIsCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const ownedDocuments = useMemo(
    () => documents.filter((document) => document.owner?.userId === user?.id),
    [documents, user?.id]
  );
  const sharedDocuments = useMemo(
    () => documents.filter((document) => document.owner?.userId !== user?.id),
    [documents, user?.id]
  );
  const documentTitles = useMemo(
    () => new Map(documents.map((document) => [document._id, document.title || 'Untitled document'])),
    [documents]
  );

  const pulse = useMemo(() => {
    const now = Date.now();
    return {
      createdThisWeek: documents.filter((document) => now - new Date(document.createdAt) < 7 * DAY_MS).length,
      changedByOthers: documents.filter(
        (document) =>
          now - new Date(document.updatedAt) < DAY_MS &&
          document.lastEditedBy?.userId &&
          document.lastEditedBy.userId !== user?.id
      ).length,
      unreadShares: notifications.filter((item) => item.status === 'pending').length,
      assignedToMe: workItems.filter((item) => item.assignee?.userId === user?.id).length
    };
  }, [documents, notifications, user?.id, workItems]);

  const visibleDocuments = useMemo(() => {
    const source =
      activeView === 'mine' ? ownedDocuments : activeView === 'shared' ? sharedDocuments : documents;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return [...source]
      .filter((document) => {
        if (!normalizedSearch) return true;
        return (
          document.title?.toLowerCase().includes(normalizedSearch) ||
          document.tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ||
          document.owner?.name?.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort(SORTS[sortKey].compare);
  }, [activeView, documents, ownedDocuments, searchTerm, sharedDocuments, sortKey]);

  const listedDocuments = isHome ? visibleDocuments.slice(0, HOME_DOCUMENT_LIMIT) : visibleDocuments;

  const today = new Date();
  const firstName = user?.name?.split(' ')[0];
  const viewCopy = {
    all: {
      title: `${greetingFor(today)}${firstName ? `, ${firstName}` : ''}`,
      description:
        pulse.changedByOthers > 0
          ? `${pulse.changedByOthers} ${pulse.changedByOthers === 1 ? 'document' : 'documents'} changed by teammates in the last day.`
          : 'Pick up where you left off or start something new.'
    },
    mine: {
      title: 'My documents',
      description: 'Documents you own and can share with your team.'
    },
    shared: {
      title: 'Shared with me',
      description: 'Documents teammates have invited you to collaborate on.'
    }
  }[activeView] || {
    title: 'Workspace',
    description: 'Everything your team is working on.'
  };

  const createAndOpen = async (title, content) => {
    if (!title.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const document = await dispatch(
        createDocument(content ? { title: title.trim(), content } : { title: title.trim() })
      ).unwrap();
      setNewDocumentTitle('');
      setIsCreateOpen(false);
      navigate(`/document/${document._id}`);
    } catch {
      // The document slice exposes the API error in the dashboard state.
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateDocument = (event) => {
    event.preventDefault();
    createAndOpen(newDocumentTitle);
  };

  const openRenameDialog = (document) => {
    setRenameTarget(document);
    setRenameTitle(document.title || '');
  };

  const handleRename = async (event) => {
    event.preventDefault();
    const nextTitle = renameTitle.trim();
    if (!renameTarget || !nextTitle) return;
    try {
      await dispatch(
        updateDocument({
          id: renameTarget._id,
          documentData: { title: nextTitle }
        })
      ).unwrap();
      setRenameTarget(null);
      dispatch(fetchDocuments());
    } catch {
      // Keep the dialog open so the user can retry.
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteDocument(deleteTarget._id)).unwrap();
      setDeleteTarget(null);
      dispatch(fetchDocuments());
    } catch {
      // Keep the confirmation open so the user can retry.
    }
  };

  const handleShare = (documentId) => {
    navigate(`/document/${documentId}`, { state: { openShare: true } });
  };

  const ownerActions = (document) =>
    document.owner?.userId === user?.id ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground">
            <MoreHorizontal className="size-4" strokeWidth={1.8} />
            <span className="sr-only">Document actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => openRenameDialog(document)}>
            <Pencil className="mr-2 size-4" strokeWidth={1.8} />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleShare(document._id)}>
            <Share2 className="mr-2 size-4" strokeWidth={1.8} />
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteTarget(document)}>
            <Trash2 className="mr-2 size-4" strokeWidth={1.8} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const library = (
    <section aria-labelledby="documents-heading">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="documents-heading" className="text-body-lg font-semibold">
          {isHome ? 'Recent documents' : `${visibleDocuments.length} ${visibleDocuments.length === 1 ? 'document' : 'documents'}`}
        </h2>
        <div className="flex items-center gap-2">
          {!isHome && (
            <>
              <label className="relative min-w-0 flex-1 sm:w-60 sm:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Filter documents"
                  className="h-9 rounded-lg bg-card pl-8 text-body shadow-raised"
                />
                <span className="sr-only">Filter documents</span>
              </label>
              <div className="flex rounded-lg border bg-card p-0.5 shadow-raised" aria-label="Document layout">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('size-7 rounded-md', layout === 'grid' && 'bg-accent text-accent-foreground')}
                  onClick={() => setLayout('grid')}
                  aria-label="Grid view"
                >
                  <Grid2X2 className="size-4" strokeWidth={1.8} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('size-7 rounded-md', layout === 'list' && 'bg-accent text-accent-foreground')}
                  onClick={() => setLayout('list')}
                  aria-label="List view"
                >
                  <List className="size-4" strokeWidth={1.8} />
                </Button>
              </div>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-1 rounded-lg px-2 text-caption text-muted-foreground transition-colors duration-control hover:bg-secondary hover:text-foreground"
              >
                {SORTS[sortKey].label} <ChevronDown className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-caption">Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortKey} onValueChange={setSortKey}>
                {Object.entries(SORTS).map(([key, sort]) => (
                  <DropdownMenuRadioItem key={key} value={key} className="text-body">
                    {sort.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-body text-destructive">
          {error.error || error.message || error.msg || 'Documents could not be loaded.'}
        </div>
      )}

      {visibleDocuments.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center">
          <span className="icon-chip mb-4 size-10">
            <FileText className="size-4" strokeWidth={1.8} />
          </span>
          <h3 className="text-body-lg font-semibold">
            {searchTerm ? 'No matching documents' : activeView === 'shared' ? 'Nothing shared yet' : 'Create your first document'}
          </h3>
          <p className="mt-1 max-w-sm text-body text-muted-foreground">
            {searchTerm
              ? 'Try another title, tag, or owner.'
              : activeView === 'shared'
                ? 'Documents shared by teammates will appear here.'
                : 'Start with a blank page or a focused template.'}
          </p>
          {!searchTerm && activeView !== 'shared' && (
            <Button className="mt-4 h-9 gap-2 rounded-full px-4 text-body font-medium" onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" strokeWidth={1.8} />
              New document
            </Button>
          )}
        </div>
      ) : layout === 'grid' || isHome ? (
        <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', isHome ? 'xl:grid-cols-3' : 'xl:grid-cols-3 2xl:grid-cols-4')}>
          {listedDocuments.map((document) => (
            <DocumentPreviewCard
              key={document._id}
              document={document}
              userId={user?.id}
              relativeDate={formatRelativeDate(document.updatedAt)}
              actions={ownerActions(document)}
            />
          ))}
        </div>
      ) : (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-raised">
                <table className="w-full min-w-[560px] border-collapse text-body">
                  <thead>
                    <tr className="bg-secondary/50 text-left text-caption font-medium text-muted-foreground">
                      <th scope="col" className="px-4 py-2.5 font-medium">Document</th>
                      <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Access</th>
                      <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Last edited</th>
                      <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">People</th>
                      <th scope="col" className="px-4 py-2.5">
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDocuments.map((document) => {
                      const isOwner = document.owner?.userId === user?.id;
                      const isCollaborator = document.collaborators?.some(
                        (collaborator) => collaborator.userId === user?.id
                      );
                      // Neither owner nor invited — readable through workspace
                      // visibility on the Team plan.
                      const isTeamAccess = !isOwner && !isCollaborator;
                      return (
                        <tr
                          key={document._id}
                          onClick={() => navigate(`/document/${document._id}`)}
                          className="cursor-pointer border-t transition-colors duration-control hover:bg-secondary/40"
                        >
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                                <FileText className="size-4" strokeWidth={1.8} />
                              </span>
                              <div className="min-w-0">
                                <Link
                                  to={`/document/${document._id}`}
                                  className="block max-w-[38ch] truncate font-medium text-foreground transition-colors duration-control hover:text-primary"
                                >
                                  {document.title || 'Untitled document'}
                                </Link>
                                <span className="block truncate text-meta text-muted-foreground">
                                  {isOwner
                                    ? 'Owned by you'
                                    : isTeamAccess
                                      ? `Workspace document · ${document.owner?.name || document.owner?.email}`
                                      : `Shared by ${document.owner?.name || document.owner?.email}`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <span
                              className={cn(
                                'status-pill',
                                isOwner
                                  ? 'status-pill--success'
                                  : isTeamAccess
                                    ? 'status-pill--neutral'
                                    : 'status-pill--info'
                              )}
                            >
                              {isOwner ? 'Owner' : isTeamAccess ? 'Team' : 'Shared'}
                            </span>
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">
                            {formatRelativeDate(document.updatedAt)}
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                            <span className="inline-flex items-center gap-1.5">
                              <UsersRound className="size-4" strokeWidth={1.8} />
                              {(document.collaborators?.length || 0) + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2.5 text-caption" asChild>
                              <Link to={`/document/${document._id}`}>Open</Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
      )}

      {isHome && visibleDocuments.length > HOME_DOCUMENT_LIMIT && (
        <Link
          to="/documents"
          className="mt-3 inline-flex items-center gap-1 text-caption font-semibold text-primary transition-colors duration-control hover:text-primary/80"
        >
          View all {visibleDocuments.length} documents <ArrowRight className="size-3.5" />
        </Link>
      )}
    </section>
  );

  return (
    <div className="min-w-0">
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {loading && documents.length === 0 ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6 rise-in">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-caption font-medium text-muted-foreground">
                  {isHome
                    ? today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Documents'}
                </p>
                <h1 className="mt-1 text-title-lg font-semibold tracking-tight">{viewCopy.title}</h1>
                <p className="mt-1 max-w-2xl text-body text-muted-foreground">{viewCopy.description}</p>
              </div>
              <div className="flex gap-2 self-start">
                {isHome && (
                  <Button asChild variant="outline" className="h-9 gap-2 rounded-full bg-card px-4 text-body font-medium shadow-raised">
                    <Link to="/ai">
                      <WandSparkles className="size-4 text-primary" strokeWidth={1.8} />
                      Ask AI
                    </Link>
                  </Button>
                )}
                <Button
                  className="h-9 gap-2 rounded-full px-4 text-body font-medium shadow-raised"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="size-4" strokeWidth={1.8} />
                  New document
                </Button>
              </div>
            </section>

            {isHome ? (
              <>
                <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Workspace summary">
                  <StatTile
                    label="Documents"
                    value={documents.length}
                    detail={pulse.createdThisWeek > 0 ? `+${pulse.createdThisWeek} this week` : 'None new this week'}
                    detailTone={pulse.createdThisWeek > 0 ? 'success' : 'muted'}
                    onClick={() => navigate('/documents')}
                  />
                  <StatTile
                    label="Shared with you"
                    value={sharedDocuments.length}
                    detail={pulse.unreadShares > 0 ? `${pulse.unreadShares} unread` : 'All caught up'}
                    detailTone={pulse.unreadShares > 0 ? 'success' : 'muted'}
                    onClick={() => navigate('/shared')}
                  />
                  <StatTile
                    label="Open action items"
                    value={workItems.length}
                    detail={pulse.assignedToMe > 0 ? `${pulse.assignedToMe} assigned to you` : 'None assigned to you'}
                    detailTone={pulse.assignedToMe > 0 ? 'success' : 'muted'}
                    onClick={() => document.getElementById('my-work')?.scrollIntoView({ behavior: 'smooth' })}
                  />
                  <StatTile
                    label="Decisions logged"
                    value={decisionPulse.total}
                    detail={decisionPulse.thisWeek > 0 ? `+${decisionPulse.thisWeek} this week` : 'None this week'}
                    detailTone={decisionPulse.thisWeek > 0 ? 'success' : 'muted'}
                    onClick={() =>
                      decisionPulse.decisions[0] && navigate(`/document/${decisionPulse.decisions[0].documentId}`)
                    }
                  />
                </section>

                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="min-w-0 space-y-6">
                    <section aria-labelledby="start-heading">
                      <h2 id="start-heading" className="mb-3 text-body-lg font-semibold">
                        Start from a template
                      </h2>
                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {templates.map((template) => (
                          <TemplateCard
                            key={template.label}
                            {...template}
                            disabled={isCreating}
                            onClick={() => createAndOpen(template.title, templateContent(template))}
                          />
                        ))}
                      </div>
                    </section>
                    {library}
                  </div>
                  <MyWorkSection
                    items={workItems}
                    onItemsChange={setWorkItems}
                    latestDecision={decisionPulse.decisions[0]}
                    documentTitles={documentTitles}
                    loading={workLoading}
                  />
                </div>
              </>
            ) : (
              library
            )}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-xl p-0">
          <div className="border-b px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-title-sm">Create a document</DialogTitle>
              <DialogDescription className="text-body">Give it a clear name. You can change this anytime.</DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleCreateDocument} className="space-y-4 px-5 pb-5">
            <div className="space-y-1.5">
              <Label htmlFor="document-title" className="text-caption font-medium text-foreground">Document title</Label>
              <Input
                id="document-title"
                autoFocus
                value={newDocumentTitle}
                onChange={(event) => setNewDocumentTitle(event.target.value)}
                placeholder="e.g. Product launch plan"
                className="h-9 rounded-lg text-body"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" className="h-9 rounded-lg text-body" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newDocumentTitle.trim() || isCreating} className="h-9 rounded-full px-4 text-body font-medium">
                {isCreating ? 'Creating…' : 'Create and open'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-title-sm">Rename document</DialogTitle>
            <DialogDescription className="text-body">Choose a name teammates can recognize.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <Input
              autoFocus
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              className="h-9 rounded-lg text-body"
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" className="h-9 rounded-lg text-body" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameTitle.trim()} className="h-9 rounded-full px-4 text-body font-medium">
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-title-sm">Delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-body">
              This permanently removes the document for every collaborator. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 rounded-lg text-body">Keep document</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-9 rounded-full bg-destructive px-4 text-body font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
