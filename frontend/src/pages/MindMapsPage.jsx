import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  FileText,
  Globe2,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ArtifactGeneratorDialog from '../components/ai/ArtifactGeneratorDialog';
import MindMapCanvas from '../components/ai/MindMapCanvas';
import MindMapEditorDialog from '../components/ai/MindMapEditorDialog';
import NodeSourcePanel from '../components/ai/NodeSourcePanel';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getKnowledgeError } from '../lib/knowledge-errors';
import { cn } from '../lib/utils';

const relativeTime = (value) => {
  if (!value) return 'Recently';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const MindMapsPage = () => {
  const [searchParams] = useSearchParams();
  const [artifacts, setArtifacts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mode, setMode] = useState('documents');
  const [graph, setGraph] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [layoutState, setLayoutState] = useState('idle');
  const pendingLayoutRef = useRef({ timer: null, positions: new Map(), artifactId: null });
  const requestedArtifactId = searchParams.get('selected');

  const loadMindMaps = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/ai/artifacts?type=mind_map&limit=100');
      const nextArtifacts = response.data?.artifacts || [];
      setArtifacts(nextArtifacts);
      setSelectedId((current) =>
        nextArtifacts.some((artifact) => artifact.id === requestedArtifactId)
          ? requestedArtifactId
          : nextArtifacts.some((artifact) => artifact.id === current)
            ? current
            : nextArtifacts[0]?.id || ''
      );
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'Mind maps could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [requestedArtifactId]);

  useEffect(() => {
    loadMindMaps();
  }, [loadMindMaps]);

  const loadGraph = useCallback(async () => {
    setGraphLoading(true);
    setError('');
    try {
      const response = await api.get('/ai/knowledge-graph');
      setGraph(response.data?.graph || null);
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'The workspace map could not be built.'));
    } finally {
      setGraphLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'workspace' && !graph) {
      loadGraph();
    }
  }, [graph, loadGraph, mode]);

  // Selecting a node is meaningful per map; switching maps clears the inspector.
  useEffect(() => {
    setSelectedNode(null);
  }, [mode, selectedId]);

  const filteredArtifacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return artifacts;
    return artifacts.filter((artifact) =>
      `${artifact.result?.title || ''} ${artifact.documentTitle || ''}`.toLowerCase().includes(query)
    );
  }, [artifacts, search]);

  const selected =
    filteredArtifacts.find((artifact) => artifact.id === selectedId) || filteredArtifacts[0];

  /**
   * Node positions are applied locally straight away and flushed to the server on a
   * short debounce, so dragging stays at pointer speed while still persisting.
   */
  const persistPositions = useCallback((artifactId, positions) => {
    if (pendingLayoutRef.current.timer) clearTimeout(pendingLayoutRef.current.timer);
    pendingLayoutRef.current.artifactId = artifactId;
    positions.forEach((position) => {
      pendingLayoutRef.current.positions.set(position.id, position);
    });

    pendingLayoutRef.current.timer = setTimeout(async () => {
      const batch = [...pendingLayoutRef.current.positions.values()];
      pendingLayoutRef.current.positions.clear();
      pendingLayoutRef.current.timer = null;
      if (batch.length === 0) return;

      setLayoutState('saving');
      try {
        await api.patch(`/ai/artifacts/${artifactId}/layout`, { positions: batch });
        setLayoutState('saved');
      } catch (requestError) {
        setLayoutState('error');
        setError(getKnowledgeError(requestError, 'The new layout could not be saved.'));
      }
    }, 600);
  }, []);

  useEffect(
    () => () => {
      if (pendingLayoutRef.current.timer) clearTimeout(pendingLayoutRef.current.timer);
    },
    []
  );

  const handleMoveNode = useCallback(
    (nodeId, position) => {
      if (!selected?.id || !selected.canEdit) return;

      // A null node id is the "reset positions" request from the canvas controls.
      if (nodeId === null) {
        // Dropping x/y hands the node back to the automatic tidy layout.
        const cleared = {
          ...selected.result,
          nodes: (selected.result?.nodes || []).map((node) => {
            const next = { ...node };
            delete next.x;
            delete next.y;
            return next;
          })
        };
        setArtifacts((current) =>
          current.map((artifact) =>
            artifact.id === selected.id ? { ...artifact, result: cleared } : artifact
          )
        );
        api
          .patch(`/ai/artifacts/${selected.id}`, { payload: cleared })
          .then((response) => {
            if (response.data?.artifact) {
              setArtifacts((current) =>
                current.map((artifact) =>
                  artifact.id === selected.id ? response.data.artifact : artifact
                )
              );
            }
            setLayoutState('saved');
          })
          .catch((requestError) => {
            setLayoutState('error');
            setError(getKnowledgeError(requestError, 'The layout could not be reset.'));
          });
        return;
      }

      setArtifacts((current) =>
        current.map((artifact) =>
          artifact.id === selected.id
            ? {
                ...artifact,
                result: {
                  ...artifact.result,
                  nodes: (artifact.result?.nodes || []).map((node) =>
                    node.id === nodeId ? { ...node, x: position.x, y: position.y } : node
                  )
                }
              }
            : artifact
        )
      );
      persistPositions(selected.id, [{ id: nodeId, x: position.x, y: position.y }]);
    },
    [persistPositions, selected]
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <header className="border-b bg-background px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-caption font-medium text-primary">
              <Sparkles className="size-3.5" strokeWidth={1.8} /> Knowledge artifacts
            </div>
            <h1 className="mt-1 text-title-lg font-semibold tracking-tight">Mind maps</h1>
            <p className="mt-1 text-body text-muted-foreground">
              {mode === 'workspace'
                ? 'How your documents connect through shared themes.'
                : 'Drag to pan, drag a node to rearrange, and select one to see its source.'}
            </p>
          </div>
          {/* Actions wrap instead of overflowing the viewport at narrow widths. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-secondary p-0.5">
              {[
                { id: 'documents', label: 'Documents', icon: Network },
                { id: 'workspace', label: 'Workspace map', icon: Globe2 }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-full px-3 text-caption transition-colors duration-control',
                    mode === option.id
                      ? 'bg-card font-medium text-foreground shadow-raised'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <option.icon className="size-3.5" strokeWidth={1.8} />
                  {option.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="h-9 gap-2 rounded-full px-4 text-body"
              onClick={mode === 'workspace' ? loadGraph : loadMindMaps}
              disabled={loading || graphLoading}
            >
              <RefreshCw
                className={cn('size-3.5', (loading || graphLoading) && 'animate-spin')}
              />{' '}
              Refresh
            </Button>
            <Button
              className="h-9 gap-2 rounded-full px-4 text-body font-medium shadow-raised"
              onClick={() => setGeneratorOpen(true)}
            >
              <Plus className="size-3.5" /> Generate mind map
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'mx-auto grid min-h-0 w-full max-w-[1600px] flex-1',
          mode === 'documents' && 'lg:grid-cols-[310px_minmax(0,1fr)]'
        )}
      >
        <aside
          className={cn(
            'min-h-0 flex-col border-r bg-[hsl(var(--sidebar))]',
            mode === 'documents' ? 'flex' : 'hidden'
          )}
        >
          <div className="border-b p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search mind maps"
                className="h-9 rounded-lg bg-background pl-8 text-body"
              />
            </label>
            <p className="mt-2 px-1 text-caption text-muted-foreground">
              {filteredArtifacts.length} {filteredArtifacts.length === 1 ? 'mind map' : 'mind maps'}
            </p>
          </div>

          <div className="workspace-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
            {loading && artifacts.length === 0 ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-secondary/70" />)}
              </div>
            ) : filteredArtifacts.length ? (
              <div className="space-y-1">
                {filteredArtifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => setSelectedId(artifact.id)}
                    aria-current={selected?.id === artifact.id ? 'true' : undefined}
                    className={cn(
                      'w-full p-3 text-left',
                      selected?.id === artifact.id
                        ? 'surface-card border-primary/40 ring-1 ring-primary/15'
                        : 'interactive-card border-transparent bg-transparent shadow-none'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="icon-chip size-8">
                        <Network className="size-4" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-caption font-semibold">
                          {artifact.result?.title || artifact.documentTitle}
                        </span>
                        <span className="mt-0.5 block truncate text-meta text-muted-foreground">
                          {artifact.documentTitle}
                        </span>
                      </span>
                    </div>
                    <span className="mt-2 flex items-center gap-1 text-meta text-muted-foreground">
                      <Clock3 className="size-3" /> {relativeTime(artifact.generatedAt)}
                      <span className="ml-auto">{artifact.result?.nodes?.length || 0} nodes</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <span className="icon-chip mx-auto">
                  <Network className="size-4" strokeWidth={1.8} />
                </span>
                <p className="mt-3 text-body font-medium">
                  {search ? 'No matching mind maps' : 'No mind maps yet'}
                </p>
                <p className="mt-1 text-caption text-muted-foreground">
                  {search ? 'Try a document title or map topic.' : 'Generate one from any saved document.'}
                </p>
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 bg-[hsl(var(--workspace))] p-4 sm:p-6">
          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-body text-destructive">
              {error}
            </div>
          )}

          {mode === 'workspace' ? (
            <div className="flex h-full min-h-[620px] flex-col">
              <div className="mb-4">
                <h2 className="text-title font-semibold tracking-tight">
                  Workspace knowledge map
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">
                  {graph?.coverage
                    ? `${graph.coverage.documents} documents · ${graph.coverage.summarised} summarised · ${graph.coverage.themes} shared themes`
                    : 'Documents connected by the themes their summaries share.'}
                </p>
              </div>
              {graphLoading && !graph ? (
                <div className="grid flex-1 place-items-center rounded-xl border border-dashed bg-card/50">
                  <p className="flex items-center gap-2 text-body text-muted-foreground">
                    <RefreshCw className="size-3.5 animate-spin" /> Building the workspace map…
                  </p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                  <div className="min-h-0 flex-1">
                    <MindMapCanvas
                      mindMap={graph}
                      selectedNodeId={selectedNode?.id}
                      onSelectNode={setSelectedNode}
                    />
                  </div>
                  {selectedNode && (
                    <NodeSourcePanel
                      node={selectedNode}
                      documentId={selectedNode.documentId}
                      onClose={() => setSelectedNode(null)}
                    />
                  )}
                </div>
              )}
            </div>
          ) : selected ? (
            <div className="flex h-full min-h-[620px] flex-col">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-title font-semibold tracking-tight">
                      {selected.result?.title || 'Document mind map'}
                    </h2>
                    <span className="status-pill status-pill--neutral">
                      {selected.result?.nodes?.length || 0} nodes
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
                    <FileText className="size-3" /> {selected.documentTitle}
                    <span>·</span> Generated {relativeTime(selected.generatedAt)}
                    {layoutState !== 'idle' && (
                      <>
                        <span>·</span>
                        <span
                          aria-live="polite"
                          className={cn(
                            layoutState === 'error'
                              ? 'text-destructive'
                              : layoutState === 'saving'
                                ? 'text-muted-foreground'
                                : 'text-success'
                          )}
                        >
                          {layoutState === 'saving'
                            ? 'Saving layout…'
                            : layoutState === 'saved'
                              ? 'Layout saved'
                              : 'Layout not saved'}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {selected.canEdit && (
                    <Button
                      variant="outline"
                      className="h-8 gap-1.5 rounded-full px-3 text-caption"
                      onClick={() => setEditorOpen(true)}
                    >
                      <Pencil className="size-3" /> Edit map
                    </Button>
                  )}
                  <Button variant="outline" className="h-8 gap-1.5 rounded-full px-3 text-caption" asChild>
                    <Link to={`/document/${selected.documentId}?ai=mind_map`}>
                      Open source document <ArrowUpRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                <div className="min-h-0 min-w-0 flex-1">
                  <MindMapCanvas
                    mindMap={selected.result}
                    selectedNodeId={selectedNode?.id}
                    onSelectNode={setSelectedNode}
                    onMoveNode={handleMoveNode}
                    editable={Boolean(selected.canEdit)}
                  />
                </div>
                {selectedNode && (
                  <NodeSourcePanel
                    artifactId={selected.id}
                    documentId={selected.documentId}
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                  />
                )}
              </div>
            </div>
          ) : !loading && (
            <div className="grid min-h-[620px] place-items-center rounded-xl border border-dashed bg-card/50 text-center">
              <div className="max-w-sm px-6">
                <span className="icon-chip mx-auto size-10">
                  <Network className="size-4" strokeWidth={1.8} />
                </span>
                <h2 className="mt-4 text-body-lg font-semibold">Build your visual knowledge library</h2>
                <p className="mt-1 text-body text-muted-foreground">
                  Turn a document into a structured, evidence-grounded map of topics and relationships.
                </p>
                <Button
                  className="mt-4 h-9 gap-2 rounded-full px-4 text-body font-medium"
                  onClick={() => setGeneratorOpen(true)}
                >
                  <Plus className="size-3.5" /> Generate your first mind map
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <ArtifactGeneratorDialog
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        defaultType="mind_map"
        onGenerated={loadMindMaps}
      />
      <MindMapEditorDialog
        artifact={selected}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={(updated) => {
          setArtifacts((current) =>
            current.map((artifact) => artifact.id === updated.id ? updated : artifact)
          );
          setSelectedId(updated.id);
        }}
      />
    </div>
  );
};

export default MindMapsPage;
