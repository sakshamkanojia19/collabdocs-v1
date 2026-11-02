import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router';
import {
  ArrowUpRight,
  Check,
  Copy,
  FileText,
  Gavel,
  Loader2,
  MessagesSquare,
  Network,
  Quote,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '../../services/api';
import { getKnowledgeError } from '../../lib/knowledge-errors';

const MODES = [
  { id: 'ask', label: 'Ask', icon: Sparkles, placeholder: 'Ask about any document, decision, or meeting…' },
  { id: 'search', label: 'Search', icon: Search, placeholder: 'Search documents and conversations…' }
];

const STARTER_QUESTIONS = [
  'What decisions have we made recently?',
  'Which tasks are still open?',
  'What are the next steps across our documents?'
];

const SourceNumber = ({ n, active }) => (
  <span
    className={cn(
      'grid size-5 shrink-0 place-items-center rounded text-meta font-semibold',
      active ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
    )}
  >
    {n}
  </span>
);

/**
 * Workspace-scope retrieval laid out as a conversation with a sources rail.
 * Both modes are permission-aware on the server and always cite the document a
 * statement came from; the rail lists the sources of the selected answer.
 */
const WorkspaceAskPanel = ({ onGenerate }) => {
  const { entitlements } = useSelector((state) => state.auth);
  const providerAI = entitlements?.features?.providerAI;
  const [mode, setMode] = useState('ask');
  const [query, setQuery] = useState('');
  const [thread, setThread] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [results, setResults] = useState(null);
  const [searchedFor, setSearchedFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [thread.length, loading]);

  // No explicit selection means the latest answer drives the sources rail.
  const activeIndex = selectedIndex ?? thread.length - 1;
  const selectedAnswer = thread[activeIndex]?.answer || null;
  const sources = selectedAnswer?.citations || [];

  const ask = async (question) => {
    const trimmed = question.trim();
    if (trimmed.length < 2 || loading) return;
    setLoading(true);
    setError('');
    setQuery('');

    if (mode === 'ask') {
      try {
        const response = await api.post('/ai/ask', { question: trimmed });
        const answer = response.data?.answer || null;
        setThread((current) => [...current, { question: trimmed, answer }]);
        setSelectedIndex(null);
      } catch (requestError) {
        setQuery(trimmed);
        setError(getKnowledgeError(requestError, 'That request could not be completed.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    setSearchedFor(trimmed);
    setResults(null);
    try {
      const response = await api.get('/ai/search', { params: { q: trimmed, limit: 8 } });
      setResults(response.data || null);
    } catch (requestError) {
      setQuery(trimmed);
      setError(getKnowledgeError(requestError, 'That request could not be completed.'));
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = async (index) => {
    try {
      await navigator.clipboard.writeText(thread[index].answer?.answer || '');
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      // Clipboard access can be denied; the answer stays selectable.
    }
  };

  const activeMode = MODES.find((option) => option.id === mode);

  return (
    <section className="surface-card grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-h-[520px] min-w-0 flex-col p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="icon-chip">
              <Sparkles className="size-4" strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-title-sm font-semibold">Ask your workspace</h2>
              <p className="mt-0.5 text-caption text-muted-foreground">
                Answers cite the documents they come from, and only use documents you can open.
              </p>
            </div>
          </div>
          <div className="flex w-fit shrink-0 rounded-full bg-secondary p-0.5">
            {MODES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setMode(option.id);
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

        <div className="workspace-scrollbar mt-5 max-h-[560px] min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {mode === 'ask' && thread.length === 0 && !loading && (
            <div className="grid h-full place-items-center py-8 text-center">
              <div className="max-w-md">
                <p className="text-body-lg font-semibold">What do you want to know?</p>
                <p className="mt-1 text-body text-muted-foreground">
                  Ask in plain language. CollabDocs finds the relevant passages and shows where each answer comes from.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {STARTER_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => ask(question)}
                      className="rounded-full border bg-card px-3 py-1.5 text-caption text-muted-foreground transition-colors duration-control hover:border-foreground/20 hover:text-foreground"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'ask' &&
            thread.map((turn, index) => (
              <div key={`${turn.question}-${index}`} className="space-y-3">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-body text-primary-foreground">
                    {turn.question}
                  </p>
                </div>
                {turn.answer && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedIndex(index)}
                    onKeyDown={(event) => event.key === 'Enter' && setSelectedIndex(index)}
                    className={cn(
                      'max-w-[92%] cursor-pointer rounded-2xl rounded-bl-md border bg-card p-4 text-left shadow-raised transition-colors duration-control',
                      activeIndex === index ? 'border-primary/40' : 'hover:border-foreground/20'
                    )}
                  >
                    <p className="flex flex-wrap items-center gap-2 text-caption font-semibold text-primary">
                      <Sparkles className="size-3.5" />
                      {turn.answer.mode === 'ai' ? 'Advanced AI answer' : 'Answer from your documents'}
                      {turn.answer.citations?.length > 0 && (
                        <span className="font-normal text-muted-foreground">
                          · {turn.answer.citations.length} {turn.answer.citations.length === 1 ? 'source' : 'sources'}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-body leading-6">{turn.answer.answer}</p>

                    {turn.answer.citations?.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {turn.answer.citations.map((citation, citationIndex) => (
                          <span
                            key={`${citation.documentId}-${citationIndex}`}
                            className="flex max-w-[220px] items-center gap-1.5 rounded-full border bg-secondary/60 py-0.5 pl-0.5 pr-2.5 text-meta"
                          >
                            <SourceNumber n={citationIndex + 1} />
                            <span className="truncate">{citation.documentTitle}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          copyAnswer(index);
                        }}
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-meta font-semibold transition-colors duration-control hover:bg-secondary"
                      >
                        {copiedIndex === index ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                        {copiedIndex === index ? 'Copied' : 'Copy answer'}
                      </button>
                      {turn.answer.citations?.[0] && (
                        <Link
                          to={`/document/${turn.answer.citations[0].documentId}`}
                          onClick={(event) => event.stopPropagation()}
                          className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-meta font-semibold transition-colors duration-control hover:bg-secondary"
                        >
                          <ArrowUpRight className="size-3" /> Open top source
                        </Link>
                      )}
                    </div>

                    {turn.answer.followUpQuestions?.length > 0 && index === thread.length - 1 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {turn.answer.followUpQuestions.map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              ask(question);
                            }}
                            className="rounded-full bg-secondary px-2.5 py-1 text-caption text-muted-foreground transition-colors duration-control hover:text-foreground"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

          {loading && (
            <div className="flex justify-start">
              <span
                className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-secondary px-3.5 py-3"
                aria-label={mode === 'ask' ? 'Preparing an answer' : 'Searching'}
              >
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
              </span>
            </div>
          )}

          {mode === 'search' && !loading && !results && (
            <div className="grid h-full place-items-center py-8 text-center">
              <div className="max-w-md">
                <p className="text-body-lg font-semibold">Search documents and conversations</p>
                <p className="mt-1 text-body text-muted-foreground">
                  {providerAI
                    ? 'Search matches by meaning, so you can find the passage you mean.'
                    : 'Search matches keywords across your documents and messages.'}
                </p>
              </div>
            </div>
          )}

          {mode === 'search' && results && (
            <div className="space-y-4">
              <p className="text-caption text-muted-foreground">
                Results for <span className="font-semibold text-foreground">“{searchedFor}”</span> ·{' '}
                {results.mode === 'semantic' ? 'matched by meaning' : 'keyword match'}
              </p>
              <div>
                <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <FileText className="size-3" strokeWidth={1.8} /> Documents
                </p>
                {results.documents?.length ? (
                  <div className="mt-2 space-y-1.5">
                    {results.documents.map((result) => (
                      <Link
                        key={result.documentId}
                        to={`/document/${result.documentId}`}
                        className="block rounded-lg border bg-card p-3 transition-colors duration-control hover:bg-secondary/50"
                      >
                        <span className="flex items-center gap-1.5 text-body font-medium">
                          <span className="truncate">{result.documentTitle}</span>
                          <ArrowUpRight className="ml-auto size-3.5 shrink-0 opacity-60" />
                        </span>
                        <span className="mt-1 line-clamp-2 block text-caption text-muted-foreground">{result.passage}</span>
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
                        className="block rounded-lg border bg-card p-3 transition-colors duration-control hover:bg-secondary/50"
                      >
                        <span className="flex items-center gap-1.5 text-body font-medium">
                          <span className="truncate">{result.groupName}</span>
                          {result.isDecision && (
                            <span className="status-pill status-pill--success shrink-0">
                              <Gavel className="size-3" /> Decision
                            </span>
                          )}
                          <ArrowUpRight className="ml-auto size-3.5 shrink-0 opacity-60" />
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
          <div ref={threadEndRef} />
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-caption text-destructive">
            {error}
          </p>
        )}

        <div className="mt-4">
          {onGenerate && (
            <div className="mb-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onGenerate('summary')}
                className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-caption transition-colors duration-control hover:border-foreground/20"
              >
                <FileText className="size-3.5 text-primary" /> Summarize a document
              </button>
              <button
                type="button"
                onClick={() => onGenerate('mind_map')}
                className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-caption transition-colors duration-control hover:border-foreground/20"
              >
                <Network className="size-3.5 text-primary" /> Generate a mind map
              </button>
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask(query);
            }}
            className="flex items-center gap-2 rounded-xl border bg-card p-1.5 pl-3 shadow-raised focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={activeMode.placeholder}
              aria-label={activeMode.placeholder}
              className="h-8 border-0 px-0 text-body shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              className="size-8 shrink-0 rounded-lg"
              disabled={loading || query.trim().length < 2}
              aria-label={mode === 'ask' ? 'Ask' : 'Search'}
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizontal className="size-3.5" />}
            </Button>
          </form>
        </div>
      </div>

      <aside className="border-t bg-[hsl(var(--sidebar))] p-4 lg:border-l lg:border-t-0">
        <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">Sources</p>
        {sources.length > 0 ? (
          <div className="mt-3 space-y-2.5">
            {sources.map((citation, index) => (
              <Link
                key={`${citation.documentId}-${index}`}
                to={`/document/${citation.documentId}`}
                className={cn(
                  'block rounded-xl border bg-card p-3 transition-colors duration-control hover:border-foreground/20',
                  index === 0 && 'border-primary/30 bg-accent/40'
                )}
              >
                <span className="flex items-center gap-2">
                  <SourceNumber n={index + 1} active={index === 0} />
                  <span className="truncate text-caption font-semibold">{citation.documentTitle}</span>
                  <ArrowUpRight className="ml-auto size-3 shrink-0 opacity-60" />
                </span>
                {citation.quote && (
                  <span className="mt-1.5 line-clamp-3 block border-l-2 border-primary/40 pl-2 text-meta text-muted-foreground">
                    “{citation.quote}”
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-caption text-muted-foreground">
            {mode === 'ask'
              ? 'When you ask a question, the documents behind the answer appear here.'
              : 'Search results link straight to their documents and conversations.'}
          </p>
        )}

        <div className="mt-5 rounded-xl bg-card p-3 ring-1 ring-border">
          <p className="flex items-center gap-1.5 text-caption font-semibold">
            <ShieldCheck className="size-3.5 text-success" /> Grounded answers only
          </p>
          <p className="mt-1 text-meta text-muted-foreground">
            {providerAI
              ? 'Answers come from your workspace and list their sources, so you can check every claim.'
              : 'Free-plan answers are assembled from your own documents inside your workspace. Pro and Team add advanced AI answers.'}
          </p>
        </div>
      </aside>
    </section>
  );
};

export default WorkspaceAskPanel;
