import { useEffect, useMemo, useState } from 'react';
import { Network, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { getKnowledgeError } from '../../lib/knowledge-errors';
import { cn } from '../../lib/utils';

const clonePayload = (artifact) => ({
  title: artifact?.result?.title || 'Mind map',
  nodes: (artifact?.result?.nodes || []).map((node) => ({
    ...node,
    sourceChunks: Array.isArray(node.sourceChunks) ? node.sourceChunks : []
  }))
});

const MindMapEditorDialog = ({ artifact, open, onOpenChange, onSaved }) => {
  const [draft, setDraft] = useState(() => clonePayload(artifact));
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const nextDraft = clonePayload(artifact);
    setDraft(nextDraft);
    setSelectedId(nextDraft.nodes[0]?.id || '');
    setError('');
  }, [artifact, open]);

  const selected = draft.nodes.find((node) => node.id === selectedId) || null;
  const byId = useMemo(
    () => new Map(draft.nodes.map((node) => [node.id, node])),
    [draft.nodes]
  );

  const getDepth = (node) => {
    let depth = 0;
    let parentId = node.parentId;
    const visited = new Set([node.id]);
    while (parentId && byId.has(parentId) && !visited.has(parentId)) {
      visited.add(parentId);
      depth += 1;
      parentId = byId.get(parentId).parentId;
    }
    return depth;
  };

  const descendantIds = useMemo(() => {
    if (!selected) return new Set();
    const descendants = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      draft.nodes.forEach((node) => {
        if (
          node.parentId &&
          (node.parentId === selected.id || descendants.has(node.parentId)) &&
          !descendants.has(node.id)
        ) {
          descendants.add(node.id);
          changed = true;
        }
      });
    }
    return descendants;
  }, [draft.nodes, selected]);

  const updateSelected = (updates) => {
    setDraft((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedId ? { ...node, ...updates } : node
      )
    }));
  };

  const addTopic = () => {
    if (draft.nodes.length >= 40) {
      setError('A mind map can contain up to 40 nodes.');
      return;
    }
    const root = draft.nodes.find((node) => node.parentId === null);
    const id = `manual-${Date.now().toString(36)}`;
    const node = {
      id,
      label: 'New topic',
      description: 'Add a concise description.',
      parentId: selected?.id || root?.id || null,
      sourceChunks: []
    };
    setDraft((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelectedId(id);
    setError('');
  };

  const removeSelected = () => {
    if (!selected || selected.parentId === null) return;
    const removing = new Set([selected.id, ...descendantIds]);
    const nextNodes = draft.nodes.filter((node) => !removing.has(node.id));
    setDraft((current) => ({ ...current, nodes: nextNodes }));
    setSelectedId(selected.parentId);
    setError('');
  };

  const save = async () => {
    if (!artifact?.id || saving) return;
    if (draft.nodes.some((node) => !node.label.trim())) {
      setError('Every node needs a label.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: draft.title.trim() || 'Mind map',
        nodes: draft.nodes.map((node) => ({
          ...node,
          label: node.label.trim(),
          description: node.description.trim() || node.label.trim()
        })),
        edges: draft.nodes
          .filter((node) => node.parentId)
          .map((node) => ({
            source: node.parentId,
            target: node.id,
            label: 'contains'
          }))
      };
      const response = await api.patch(`/ai/artifacts/${artifact.id}`, { payload });
      onSaved?.(response.data.artifact);
      onOpenChange(false);
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'The mind map could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(760px,90vh)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="border-b px-5 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-title-sm font-semibold tracking-tight">
              <span className="icon-chip size-8">
                <Network className="size-4" strokeWidth={1.8} />
              </span>
              Edit mind map
            </DialogTitle>
            <DialogDescription className="text-body">
              Rename, reorganize, add, or remove topics. Changes are saved to this mind map.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r bg-[hsl(var(--sidebar))]">
            <div className="border-b p-3">
              <Button variant="outline" className="h-8 w-full gap-2 rounded-lg text-caption" onClick={addTopic}>
                <Plus className="size-3.5" /> Add topic
              </Button>
            </div>
            <div className="workspace-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
              {draft.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className={cn(
                    'mb-1 flex h-9 w-full items-center rounded-lg px-2 text-left text-caption transition-colors duration-control',
                    selectedId === node.id
                      ? 'bg-background font-medium text-foreground shadow-raised'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                  style={{ paddingLeft: 8 + Math.min(getDepth(node), 5) * 14 }}
                >
                  <span className={cn(
                    'mr-2 size-1.5 shrink-0 rounded-full',
                    node.parentId === null ? 'bg-primary' : 'bg-primary/40'
                  )} />
                  <span className="truncate">{node.label || 'Untitled topic'}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="workspace-scrollbar min-h-0 overflow-y-auto p-5">
            <div className="space-y-1.5">
              <Label htmlFor="map-title" className="text-caption font-medium">Map title</Label>
              <Input
                id="map-title"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                className="h-9 rounded-lg text-body"
                maxLength={120}
              />
            </div>

            {selected && (
              <div className="mt-6 space-y-4 rounded-xl border bg-secondary/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-semibold">Selected topic</p>
                    <p className="mt-0.5 text-meta text-muted-foreground">
                      {selected.parentId === null ? 'Root topic' : `Level ${getDepth(selected)}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    disabled={selected.parentId === null}
                    onClick={removeSelected}
                    title={selected.parentId === null ? 'The root topic cannot be removed' : 'Remove topic and its children'}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="node-label" className="text-caption font-medium">Label</Label>
                  <Input
                    id="node-label"
                    value={selected.label}
                    onChange={(event) => updateSelected({ label: event.target.value })}
                    className="h-9 rounded-lg text-body"
                    maxLength={64}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="node-description" className="text-caption font-medium">Description</Label>
                  <Textarea
                    id="node-description"
                    value={selected.description}
                    onChange={(event) => updateSelected({ description: event.target.value })}
                    className="min-h-24 resize-none rounded-lg text-body"
                    maxLength={180}
                  />
                </div>

                {selected.parentId !== null && (
                  <div className="space-y-1.5">
                    <Label htmlFor="node-parent" className="text-caption font-medium">Parent topic</Label>
                    <select
                      id="node-parent"
                      value={selected.parentId}
                      onChange={(event) => updateSelected({ parentId: event.target.value })}
                      className="h-9 w-full rounded-lg border bg-background px-3 text-body outline-none transition-colors duration-control focus:ring-2 focus:ring-ring"
                    >
                      {draft.nodes
                        .filter((node) => node.id !== selected.id && !descendantIds.has(node.id))
                        .map((node) => (
                          <option key={node.id} value={node.id}>
                            {'— '.repeat(Math.min(getDepth(node), 4))}{node.label}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-body text-destructive">
                {error}
              </p>
            )}
          </main>
        </div>

        <DialogFooter className="border-t bg-background px-5 py-3">
          <Button variant="ghost" className="h-9 rounded-full px-4 text-body" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-9 gap-2 rounded-full px-4 text-body font-medium" onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MindMapEditorDialog;
