import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ArrowUpRight, FileText, Loader2, Quote, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '../../services/api';
import { requestAnchorFocus } from '../../store/documentSlice';
import { getKnowledgeError } from '../../lib/knowledge-errors';

/**
 * Shows the document passages a mind-map node was derived from. This is what turns
 * the map from a picture into navigation: every node points back at its evidence.
 */
const NodeSourcePanel = ({ artifactId, documentId, node, onClose }) => {
  const dispatch = useDispatch();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const indexes = node?.sourceChunks || [];

  useEffect(() => {
    if (!artifactId || indexes.length === 0) {
      setSources([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/ai/artifacts/${artifactId}/sources?indexes=${indexes.join(',')}`)
      .then((response) => {
        if (!cancelled) setSources(response.data?.sources || []);
      })
      .catch((requestError) => {
        if (!cancelled) setError(getKnowledgeError(requestError, 'Sources could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactId, indexes.join(',')]);

  if (!node) {
    return null;
  }

  const openInDocument = (text) => {
    dispatch(
      requestAnchorFocus({
        documentId,
        quote: text.slice(0, 120),
        requestedAt: Date.now()
      })
    );
  };

  return (
    <aside className="surface-card flex w-full flex-col lg:w-[320px]">
      <header className="flex items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Node evidence
          </p>
          <h3 className="mt-1 truncate text-body font-semibold">{node.label}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 rounded-lg text-muted-foreground"
          onClick={onClose}
          aria-label="Close node evidence"
        >
          <X className="size-3.5" />
        </Button>
      </header>

      <div className="workspace-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        {node.description && (
          <p className="rounded-lg bg-secondary/60 px-2.5 py-2 text-caption text-muted-foreground">
            {node.description}
          </p>
        )}

        {node.documentId ? (
          <Button variant="outline" size="sm" className="h-8 w-full gap-1.5 rounded-lg text-caption" asChild>
            <Link to={`/document/${node.documentId}`}>
              <FileText className="size-3" /> Open this document
              <ArrowUpRight className="ml-auto size-3" />
            </Link>
          </Button>
        ) : loading ? (
          <p className="flex items-center gap-1.5 py-6 text-caption text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading source passages…
          </p>
        ) : error ? (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-caption text-destructive">
            {error}
          </p>
        ) : sources.length === 0 ? (
          <p className="rounded-lg border border-dashed px-2.5 py-6 text-center text-caption text-muted-foreground">
            This node has no linked source passage.
          </p>
        ) : (
          sources.map((source) => (
            <article
              key={source.chunkIndex}
              className="rounded-lg border-l-2 border-primary/50 bg-secondary/50 p-2.5"
            >
              <p className="flex items-center gap-1 text-meta font-medium text-muted-foreground">
                <Quote className="size-3" /> Passage {source.chunkIndex + 1}
              </p>
              <p className="mt-1.5 line-clamp-[10] text-caption">{source.text}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5 h-6 gap-1 rounded-full px-2 text-meta"
                onClick={() => openInDocument(source.text)}
                asChild
              >
                <Link to={`/document/${documentId}`}>
                  Show in document <ArrowUpRight className="size-2.5" />
                </Link>
              </Button>
            </article>
          ))
        )}
      </div>
    </aside>
  );
};

export default NodeSourcePanel;
