import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router';
import {
  ArrowUpRight,
  FileText,
  Gavel,
  Loader2,
  MessagesSquare,
  Quote,
  Search,
  SendHorizontal,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '../../services/api';
import { getKnowledgeError } from '../../lib/knowledge-errors';

const MODES = [
  { id: 'ask', label: 'Ask', icon: Sparkles, placeholder: 'Ask across every document you can access…' },
  { id: 'search', label: 'Search', icon: Search, placeholder: 'Search documents and conversations…' }
];

/**
 * Workspace-scope retrieval. Both modes are permission-aware on the server and
 * always cite the document a statement came from.
 */
const WorkspaceAskPanel = () => {
  const { entitlements } = useSelector((state) => state.auth);
  const providerAI = entitlements?.features?.providerAI;
  const [mode, setMode] = useState('ask');
  const [query, setQuery] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2 || loading) return;

    setLoading(true);
    setError('');
    setAskedQuestion(trimmed);
    setAnswer(null);
    setResults(null);

    try {
      if (mode === 'ask') {
        const response = await api.post('/ai/ask', { question: trimmed });
        setAnswer(response.data?.answer || null);
      } else {
        const response = await api.get('/ai/search', {
          params: { q: trimmed, limit: 8 }
        });
        setResults(response.data || null);
      }
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'That request could not be completed.'));
    } finally {
      setLoading(false);
    }
  };

  const activeMode = MODES.find((option) => option.id === mode);

  return (
    <section className="surface-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="icon-chip">
            <Sparkles className="size-4" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-body-lg font-semibold">Ask your workspace</h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Answers are grounded in documents you have access to, with citations.
            </p>
            {!providerAI && (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
                <span className="status-pill status-pill--neutral">Standard answers</span>
                Pro and Team unlock advanced AI answers.
              </p>
            )}
          </div>
        </div>
        <div className="flex w-fit shrink-0 rounded-full bg-secondary p-0.5">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setMode(option.id);
                setAskedQuestion('');
                setAnswer(null);
                setResults(null);
                setError('');
              }}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-full px-3 text-caption transition-colors duration-control',
                mode === option.id
                  ? 'bg-card font-medium text-foreground shadow-raised'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <option.icon className="size-3" strokeWidth={1.8} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={activeMode.placeholder}
          aria-label={activeMode.placeholder}
          className="h-9 rounded-full px-4 text-body"
        />
        <Button
          type="submit"
          className="h-9 shrink-0 gap-1.5 rounded-full px-4 text-body font-medium"
          disabled={loading || query.trim().length < 2}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <SendHorizontal className="size-3.5" />
          )}
          {mode === 'ask' ? 'Ask' : 'Search'}
        </Button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-caption text-destructive"
        >
          {error}
        </p>
      )}

      {mode === 'ask' && (loading || answer) && (
        <div className="mt-4 space-y-3">
          {askedQuestion && (
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-body text-primary-foreground">
                {askedQuestion}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-start">
              <span
                className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-secondary px-3.5 py-3"
                aria-label="Preparing an answer"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
              </span>
            </div>
          ) : (
            <div className="flex justify-start">
              <div className="w-full max-w-full rounded-2xl rounded-bl-md bg-secondary p-3.5 sm:max-w-[92%]">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'status-pill',
                      answer.mode === 'ai' ? 'status-pill--info' : 'status-pill--warning'
                    )}
                  >
                    {answer.mode === 'ai' ? 'Advanced AI answer' : 'From your documents'}
                  </span>
                  {answer.retrieval && (
                    <span className="text-meta text-muted-foreground">
                      {answer.retrieval === 'semantic' ? 'Semantic retrieval' : 'Keyword retrieval'}
                    </span>
                  )}
                </div>

                <p className="mt-2.5 whitespace-pre-wrap text-body">{answer.answer}</p>

                {answer.citations?.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-border/80 pt-3">
                    <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Sources
                    </p>
                    {answer.citations.map((citation, index) => (
                      <Link
                        key={`${citation.documentId}-${index}`}
                        to={`/document/${citation.documentId}`}
                        className="block rounded-lg border bg-card px-2.5 py-2 transition-colors duration-control hover:border-foreground/20"
                      >
                        <span className="flex items-center gap-1.5 text-caption font-medium">
                          <FileText className="size-3 shrink-0" strokeWidth={1.8} />
                          <span className="truncate">{citation.documentTitle}</span>
                          <ArrowUpRight className="ml-auto size-3 shrink-0 opacity-60" />
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-caption italic text-muted-foreground">
                          “{citation.quote}”
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {answer.followUpQuestions?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/80 pt-3">
                    {answer.followUpQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => setQuery(question)}
                        className="rounded-full border bg-card px-2.5 py-1 text-caption text-muted-foreground transition-colors duration-control hover:bg-background hover:text-foreground"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'search' && loading && (
        <p className="mt-4 flex items-center gap-2 text-caption text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Searching your workspace…
        </p>
      )}

      {results && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <FileText className="size-3" strokeWidth={1.8} /> Documents
              <Badge variant="outline" className="ml-1 rounded-full text-meta font-normal">
                {results.mode === 'semantic' ? 'semantic' : 'keyword'}
              </Badge>
            </p>
            {results.documents?.length ? (
              <div className="mt-2 space-y-1.5">
                {results.documents.map((result) => (
                  <Link
                    key={result.documentId}
                    to={`/document/${result.documentId}`}
                    className="block rounded-lg border bg-card p-2.5 transition-colors duration-control hover:bg-secondary/50"
                  >
                    <span className="flex items-center gap-1.5 text-caption font-medium">
                      <span className="truncate">{result.documentTitle}</span>
                      <ArrowUpRight className="ml-auto size-3 shrink-0 opacity-60" />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-caption text-muted-foreground">
                      {result.passage}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-caption text-muted-foreground">No matching documents.</p>
            )}
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <MessagesSquare className="size-3" strokeWidth={1.8} /> Conversations
            </p>
            {results.conversations?.length ? (
              <div className="mt-2 space-y-1.5">
                {results.conversations.map((result) => (
                  <Link
                    key={result.messageId}
                    to={`/messages?group=${result.groupId}`}
                    className="block rounded-lg border bg-card p-2.5 transition-colors duration-control hover:bg-secondary/50"
                  >
                    <span className="flex items-center gap-1.5 text-caption font-medium">
                      <span className="truncate">{result.groupName}</span>
                      {result.isDecision && (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-0.5 rounded-full border-success/40 text-meta font-normal text-success"
                        >
                          <Gavel className="size-2.5" /> decision
                        </Badge>
                      )}
                      <ArrowUpRight className="ml-auto size-3 shrink-0 opacity-60" />
                    </span>
                    <span className="mt-1 flex items-start gap-1 text-caption text-muted-foreground">
                      <Quote className="mt-0.5 size-3 shrink-0" strokeWidth={1.8} />
                      <span className="line-clamp-2">
                        <span className="font-medium">{result.sender?.name}: </span>
                        {result.content}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-caption text-muted-foreground">No matching messages.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default WorkspaceAskPanel;
