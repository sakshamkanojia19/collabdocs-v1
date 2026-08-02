import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
  BookOpen,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  FileText,
  Filter,
  Grid2X2,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Share2,
  Sparkles,
  Trash2,
  UsersRound,
  X
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const templates = [
  {
    label: 'Blank document',
    description: 'Start from a clean page',
    icon: FilePlus2,
    title: 'Untitled document',
    outline: []
  },
  {
    label: 'Meeting notes',
    description: 'Agenda, notes and actions',
    icon: CalendarDays,
    title: 'Meeting notes',
    outline: ['Agenda', 'Discussion notes', 'Decisions', 'Action items']
  },
  {
    label: 'Project brief',
    description: 'Goals, scope and owners',
    icon: Sparkles,
    title: 'Project brief',
    outline: ['Goals', 'Scope', 'Owners', 'Timeline']
  },
  {
    label: 'Decision record',
    description: 'Context, options and outcome',
    icon: FileCheck2,
    title: 'Decision record',
    outline: ['Context', 'Options considered', 'Decision', 'Outcome']
  }
];

const formatRelativeDate = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
};

const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-8">
    <div className="space-y-2">
      <div className="h-7 w-56 rounded bg-muted" />
      <div className="h-4 w-80 max-w-full rounded bg-muted/70" />
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((item) => <div key={item} className="h-24 rounded-xl border bg-card" />)}
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-48 rounded-xl border bg-card" />)}
    </div>
  </div>
);

const Dashboard = ({ forcedView = null }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { documents, loading, error } = useSelector((state) => state.document);
  const { user } = useSelector((state) => state.auth);

  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [layout, setLayout] = useState('grid');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const activeView = forcedView || searchParams.get('view') || 'all';

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

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

  const visibleDocuments = useMemo(() => {
    const source =
      activeView === 'mine'
        ? ownedDocuments
        : activeView === 'shared'
          ? sharedDocuments
          : documents;
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
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [activeView, documents, ownedDocuments, searchTerm, sharedDocuments]);

  const selectedDocument = useMemo(
    () => visibleDocuments.find((document) => document._id === selectedDocumentId) || null,
    [selectedDocumentId, visibleDocuments]
  );

  useEffect(() => {
    if (visibleDocuments.length > 0 && !selectedDocument) {
      setSelectedDocumentId(visibleDocuments[0]._id);
    }
    if (visibleDocuments.length === 0 && selectedDocumentId) {
      setSelectedDocumentId(null);
    }
  }, [selectedDocument, selectedDocumentId, visibleDocuments]);

  const viewCopy = {
    all: {
      title: `Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`,
      description: 'Pick up where you left off or start something new.'
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

  const createAndOpen = async (title) => {
    if (!title.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const document = await dispatch(createDocument({ title: title.trim() })).unwrap();
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

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] min-w-0">
      <div className="mx-auto min-w-0 max-w-[1500px] flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      {loading && documents.length === 0 ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6 rise-in">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-meta font-medium text-muted-foreground">
                CollabDocs <span className="text-border">/</span> Documents <span className="text-border">/</span> {activeView === 'all' ? 'Overview' : viewCopy.title}
              </div>
              <h1 className="text-title-lg font-semibold tracking-tight">
                {viewCopy.title}
              </h1>
              <p className="mt-1 max-w-2xl text-body text-muted-foreground">{viewCopy.description}</p>
            </div>
            <Button
              className="h-9 gap-2 self-start rounded-full px-4 text-body font-medium shadow-raised"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="size-4" strokeWidth={1.8} />
              New document
            </Button>
          </section>

          {activeView === 'all' && (
            <section aria-labelledby="start-heading" className="surface-card p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">Quick start</p>
                  <h2 id="start-heading" className="mt-1 text-title-sm font-semibold">Start from a template</h2>
                  <p className="mt-1 text-body text-muted-foreground">Move faster with a focused structure you can adapt.</p>
                </div>
                <span className="hidden shrink-0 rounded-full bg-secondary px-2.5 py-1 text-meta font-medium text-muted-foreground sm:inline-flex">
                  {templates.length} templates
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.label}
                    {...template}
                    disabled={isCreating}
                    onClick={() => createAndOpen(template.title)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="surface-card grid overflow-hidden sm:grid-cols-3 sm:divide-x" aria-label="Document summary">
            {[
              { label: 'All documents', value: documents.length, icon: BookOpen, view: 'all' },
              { label: 'Owned by me', value: ownedDocuments.length, icon: FileText, view: 'mine' },
              { label: 'Shared with me', value: sharedDocuments.length, icon: UsersRound, view: 'shared' }
            ].map((stat) => (
              <button
                type="button"
                key={stat.label}
                onClick={() => {
                  const route = {
                    all: '/dashboard',
                    mine: '/documents',
                    shared: '/shared'
                  }[stat.view];
                  navigate(route);
                }}
                className={cn(
                  'flex items-center gap-3 border-b px-4 py-3.5 text-left transition-colors duration-control hover:bg-secondary/50 sm:border-b-0',
                  activeView === stat.view && 'bg-accent/50'
                )}
              >
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-lg',
                    activeView === stat.view
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  <stat.icon className="size-4" strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-title font-semibold">{stat.value}</span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">{stat.label}</span>
                </span>
              </button>
            ))}
          </section>

          <MyWorkSection />

          <section aria-labelledby="documents-heading">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">Your library</p>
                <h2 id="documents-heading" className="mt-1 text-title-sm font-semibold">
                  {activeView === 'all' ? 'Recent documents' : viewCopy.title}
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">
                  {visibleDocuments.length} {visibleDocuments.length === 1 ? 'document' : 'documents'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative min-w-0 flex-1 md:w-60 md:flex-none">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Filter documents"
                    className="h-9 rounded-lg bg-card pl-8 text-body shadow-raised"
                  />
                  <span className="sr-only">Filter documents</span>
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="size-9 rounded-lg bg-card shadow-raised" aria-label="Filter documents">
                      <Filter className="size-4" strokeWidth={1.8} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => navigate('/dashboard')}>All documents</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate('/documents/my')}>Owned by me</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate('/documents/shared')}>Shared with me</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              </div>
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-body text-destructive">
                {error.error || error.message || error.msg || 'Documents could not be loaded.'}
              </div>
            )}

            {visibleDocuments.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center">
                <span className="icon-chip mb-4 size-10">
                  <FileText className="size-4" strokeWidth={1.8} />
                </span>
                <h4 className="text-body-lg font-semibold">
                  {searchTerm ? 'No matching documents' : activeView === 'shared' ? 'Nothing shared yet' : 'Create your first document'}
                </h4>
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
            ) : layout === 'grid' ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-5 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleDocuments.map((document) => {
                  const isOwner = document.owner?.userId === user?.id;
                  return (
                    <DocumentPreviewCard
                      key={document._id}
                      document={document}
                      isOwner={isOwner}
                      relativeDate={formatRelativeDate(document.updatedAt)}
                      selected={selectedDocumentId === document._id}
                      onSelect={(nextDocument) => {
                        setSelectedDocumentId(nextDocument._id);
                        setDetailsOpen(true);
                      }}
                      actions={
                        isOwner ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="size-8 rounded-lg border bg-background/95 text-foreground shadow-raised backdrop-blur hover:bg-background"
                              >
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
                        ) : null
                      }
                    />
                  );
                })}
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
                          onClick={() => {
                            setSelectedDocumentId(document._id);
                            setDetailsOpen(true);
                          }}
                          className={cn(
                            'cursor-pointer border-t transition-colors duration-control hover:bg-secondary/40',
                            selectedDocumentId === document._id && 'bg-accent/50'
                          )}
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
          </section>
        </div>
      )}
      </div>

      {detailsOpen && (
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[292px] shrink-0 flex-col border-l bg-card lg:flex">
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <h2 className="text-body font-semibold">Document details</h2>
            <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={() => setDetailsOpen(false)} aria-label="Close document details">
              <X className="size-4" strokeWidth={1.8} />
            </Button>
          </div>

          {selectedDocument ? (
            <>
              <div className="workspace-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Personal workspace / Documents
                </p>
                <h3 className="mt-3 text-title-sm font-semibold">
                  {selectedDocument.title || 'Untitled document'}
                </h3>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      'status-pill',
                      selectedDocument.owner?.userId === user?.id ? 'status-pill--info' : 'status-pill--neutral'
                    )}
                  >
                    {selectedDocument.owner?.userId === user?.id ? 'Owned by you' : 'Shared with you'}
                  </span>
                  <span className="status-pill status-pill--success">Active</span>
                </div>

                <dl className="mt-6 space-y-3 border-y py-4 text-caption">
                  <div className="grid grid-cols-[86px_1fr] gap-2">
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd className="truncate font-medium">{selectedDocument.owner?.name || selectedDocument.owner?.email || 'You'}</dd>
                  </div>
                  <div className="grid grid-cols-[86px_1fr] gap-2">
                    <dt className="text-muted-foreground">Collaborators</dt>
                    <dd className="font-medium">{(selectedDocument.collaborators?.length || 0) + 1} people</dd>
                  </div>
                  <div className="grid grid-cols-[86px_1fr] gap-2">
                    <dt className="text-muted-foreground">Last edited</dt>
                    <dd className="font-medium">{formatRelativeDate(selectedDocument.updatedAt)}</dd>
                  </div>
                  <div className="grid grid-cols-[86px_1fr] gap-2">
                    <dt className="text-muted-foreground">Access</dt>
                    <dd className="flex items-center gap-1 font-medium">
                      <ShieldCheck className="size-3.5 text-success" strokeWidth={1.8} /> Protected
                    </dd>
                  </div>
                </dl>

                <section className="mt-5">
                  <p className="text-caption font-semibold">Collaboration pulse</p>
                  <div className="mt-2 rounded-xl border bg-secondary/50 p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.8} />
                      <div>
                        <p className="text-caption font-semibold">Ready for your next edit</p>
                        <p className="mt-1 text-meta text-muted-foreground">Changes are synced and collaborators can continue from the latest version.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mt-5">
                  <p className="text-caption font-semibold">About this document</p>
                  <p className="mt-2 text-caption text-muted-foreground">
                    A shared working document in your personal workspace. Open it to edit content, review decisions, or collaborate with your team.
                  </p>
                </section>

                {selectedDocument.tags?.length > 0 && (
                  <section className="mt-5">
                    <p className="text-caption font-semibold">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedDocument.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="rounded-md border bg-secondary/60 px-2 py-0.5 text-meta text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="flex shrink-0 gap-2 border-t p-3">
                {selectedDocument.owner?.userId === user?.id && (
                  <Button variant="outline" className="h-9 rounded-full px-3.5 text-caption" onClick={() => handleShare(selectedDocument._id)}>
                    <Share2 className="mr-1.5 size-4" strokeWidth={1.8} /> Share
                  </Button>
                )}
                <Button className="h-9 flex-1 rounded-full text-caption font-medium" onClick={() => navigate(`/document/${selectedDocument._id}`)}>
                  Open document <ArrowRight className="ml-1.5 size-4" strokeWidth={1.8} />
                </Button>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center px-6 text-center">
              <div>
                <span className="icon-chip mx-auto size-10">
                  <FileText className="size-4" strokeWidth={1.8} />
                </span>
                <p className="mt-3 text-body font-semibold">Select a document</p>
                <p className="mt-1 text-caption text-muted-foreground">Document details and actions will appear here.</p>
              </div>
            </div>
          )}
        </aside>
      )}

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
