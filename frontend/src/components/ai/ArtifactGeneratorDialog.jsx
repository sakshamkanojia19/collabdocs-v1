import { useEffect, useState } from 'react';
import { FileText, Network, RefreshCw, Sparkles } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments } from '../../store/documentSlice';
import api from '../../services/api';
import { getKnowledgeError } from '../../lib/knowledge-errors';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Label } from '../ui/label';

const ArtifactGeneratorDialog = ({
  open,
  onOpenChange,
  defaultType = 'summary',
  onGenerated
}) => {
  const dispatch = useDispatch();
  const { documents } = useSelector((state) => state.document);
  const [documentId, setDocumentId] = useState('');
  const [type, setType] = useState(defaultType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    dispatch(fetchDocuments());
    setType(defaultType);
    setError('');
  }, [defaultType, dispatch, open]);

  useEffect(() => {
    if (open && !documentId && documents.length) {
      setDocumentId(documents[0]._id);
    }
  }, [documentId, documents, open]);

  const generate = async (event) => {
    event.preventDefault();
    if (!documentId || loading) return;
    setLoading(true);
    setError('');

    try {
      const endpoint = type === 'mind_map' ? 'mind-map' : 'summary';
      const response = await api.post(`/ai/documents/${documentId}/${endpoint}`);
      onGenerated?.({
        ...response.data.artifact,
        documentId,
        type
      });
      onOpenChange(false);
    } catch (requestError) {
      setError(getKnowledgeError(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0">
        <div className="border-b px-5 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-title-sm font-semibold tracking-tight">
              <span className="icon-chip size-8">
                <Sparkles className="size-4" strokeWidth={1.8} />
              </span>
              Generate from document
            </DialogTitle>
            <DialogDescription className="text-body">
              Choose a source document. Results stay grounded in its saved content.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={generate} className="space-y-5 px-5 pb-5">
          <div className="space-y-2">
            <Label htmlFor="artifact-document" className="text-caption font-medium">
              Source document
            </Label>
            <select
              id="artifact-document"
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-body outline-none transition-colors duration-control focus:ring-2 focus:ring-ring"
            >
              {documents.length === 0 && <option value="">No documents available</option>}
              {documents.map((document) => (
                <option key={document._id} value={document._id}>
                  {document.title}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-caption font-medium">Create</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'summary', label: 'Summary', icon: FileText },
                { value: 'mind_map', label: 'Mind map', icon: Network }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`flex h-16 items-center gap-3 rounded-xl border px-3 text-left transition-[border-color,background-color,box-shadow] duration-control ${
                    type === option.value
                      ? 'border-primary bg-accent/60 ring-1 ring-primary/15'
                      : 'hover:bg-secondary/60'
                  }`}
                >
                  <option.icon
                    strokeWidth={1.8}
                    className={`size-4 ${
                      type === option.value ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="text-body font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-body text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-full px-4 text-body"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!documentId || loading}
              className="h-9 gap-2 rounded-full px-4 text-body font-medium"
            >
              {loading && <RefreshCw className="size-3.5 animate-spin" />}
              {loading
                ? 'Generating…'
                : `Generate ${type === 'mind_map' ? 'mind map' : 'summary'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ArtifactGeneratorDialog;
