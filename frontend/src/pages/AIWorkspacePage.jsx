import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bot,
  FileText,
  Network,
  Plus,
  Search,
  Sparkles,
  WandSparkles
} from 'lucide-react';
import { Link } from 'react-router';
import api from '../services/api';
import ArtifactGeneratorDialog from '../components/ai/ArtifactGeneratorDialog';
import WorkspaceAskPanel from '../components/ai/WorkspaceAskPanel';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getKnowledgeError } from '../lib/knowledge-errors';
import { cn } from '../lib/utils';

const AIWorkspacePage = () => {
  const [artifacts, setArtifacts] = useState([]);
  const [type, setType] = useState('summary');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatorOpen, setGeneratorOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const artifactsResponse = await api.get('/ai/artifacts?limit=100');
      setArtifacts(artifactsResponse.data?.artifacts || []);
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'The knowledge workspace could not be loaded.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summaries = artifacts.filter((artifact) => artifact.type === 'summary');
  const mindMaps = artifacts.filter((artifact) => artifact.type === 'mind_map');
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return artifacts.filter((artifact) => {
      if (artifact.type !== type) return false;
      if (!query) return true;
      const content = artifact.type === 'summary'
        ? `${artifact.documentTitle} ${artifact.result?.title} ${artifact.result?.overview}`
        : `${artifact.documentTitle} ${artifact.result?.title}`;
      return content.toLowerCase().includes(query);
    });
  }, [artifacts, search, type]);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-caption font-medium text-primary">
            <WandSparkles className="size-3.5" strokeWidth={1.8} /> Context-aware intelligence
          </div>
          <h1 className="mt-1 text-title-lg font-semibold tracking-tight">AI workspace</h1>
          <p className="mt-1 max-w-2xl text-body text-muted-foreground">
            Generate grounded summaries and visual maps from documents you can access. Results stay connected to their source documents.
          </p>
        </div>
        <Button
          className="h-9 shrink-0 gap-2 self-start rounded-full px-4 text-body font-medium shadow-raised"
          onClick={() => setGeneratorOpen(true)}
        >
          <Plus className="size-3.5" /> Generate
        </Button>
      </header>

      <div className="mt-6">
        <WorkspaceAskPanel />
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'AI summaries', value: summaries.length, icon: FileText },
          { label: 'Mind maps', value: mindMaps.length, icon: Network },
          { label: 'Available capabilities', value: 3, icon: Bot }
        ].map((item) => (
          <div key={item.label} className="surface-card flex items-center gap-3 p-4">
            <span className="icon-chip">
              <item.icon className="size-4" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-title font-semibold leading-none">{item.value}</p>
              <p className="mt-1 text-caption text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-title-sm font-semibold tracking-tight">Generated knowledge</h2>
            <p className="mt-0.5 text-body text-muted-foreground">Reusable AI artifacts from your workspace documents.</p>
          </div>
          <label className="relative block sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search generated knowledge"
              className="h-9 rounded-lg bg-card pl-8 text-body"
            />
          </label>
        </div>

        <div className="mb-4 flex w-fit rounded-full border bg-card p-0.5">
          {[
            { value: 'summary', label: 'Summaries', count: summaries.length, icon: FileText },
            { value: 'mind_map', label: 'Mind maps', count: mindMaps.length, icon: Network }
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setType(tab.value)}
              className={cn(
                'flex h-8 items-center gap-2 rounded-full px-3 text-caption transition-colors duration-control',
                type === tab.value
                  ? 'bg-secondary font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="size-3.5" strokeWidth={1.8} /> {tab.label}
              <span className="rounded-full bg-background px-1.5 text-meta tabular-nums">{tab.count}</span>
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-body text-destructive">{error}</div>
        )}

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-xl border bg-secondary/60" />)}
          </div>
        ) : visible.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((artifact) => (
              <article key={artifact.id} className="interactive-card group flex min-h-52 flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="icon-chip">
                    {artifact.type === 'summary' ? (
                      <FileText className="size-4" strokeWidth={1.8} />
                    ) : (
                      <Network className="size-4" strokeWidth={1.8} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-body-lg font-semibold">{artifact.result?.title || artifact.documentTitle}</h3>
                    <p className="mt-0.5 truncate text-caption text-muted-foreground">{artifact.documentTitle}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-meta">
                    {artifact.type === 'summary' ? 'Summary' : 'Mind map'}
                  </Badge>
                </div>

                {artifact.type === 'summary' ? (
                  <>
                    <p className="mt-4 line-clamp-3 text-body text-muted-foreground">{artifact.result?.overview}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {artifact.result?.themes?.slice(0, 4).map((theme) => (
                        <Badge key={theme} variant="outline" className="rounded-full text-meta font-normal">{theme}</Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {artifact.result?.nodes?.slice(0, 6).map((node) => (
                      <div key={node.id} className="truncate rounded-lg border bg-secondary/50 px-2 py-1.5 text-meta">{node.label}</div>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t pt-3">
                  <span className="status-pill status-pill--success">Grounded in source</span>
                  <Button variant="ghost" className="h-7 gap-1 rounded-full px-2.5 text-caption" asChild>
                    <Link to={artifact.type === 'mind_map' ? `/mind-maps?selected=${artifact.id}` : `/document/${artifact.documentId}?ai=summary`}>
                      Open <ArrowUpRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card/50 text-center">
            <div className="max-w-sm px-6">
              <span className="icon-chip mx-auto size-10">
                <Sparkles className="size-4" strokeWidth={1.8} />
              </span>
              <h3 className="mt-3 text-body-lg font-semibold">No {type === 'summary' ? 'summaries' : 'mind maps'} yet</h3>
              <p className="mt-1 text-body text-muted-foreground">Generate one from a saved document to begin.</p>
              <Button
                className="mt-4 h-9 gap-2 rounded-full px-4 text-body font-medium"
                onClick={() => setGeneratorOpen(true)}
              >
                <Plus className="size-3.5" /> Generate
              </Button>
            </div>
          </div>
        )}
      </section>

      <ArtifactGeneratorDialog
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        defaultType={type}
        onGenerated={load}
      />
    </div>
  );
};

export default AIWorkspacePage;
