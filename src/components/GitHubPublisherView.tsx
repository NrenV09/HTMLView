import React, { useState, useEffect } from 'react';
import {
  Github,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Rocket,
  Shield,
  Key,
  FolderGit2,
  Globe,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  CompiledPreviewResult,
  GitHubPublishPipelineStatus,
  HostedProject,
} from '../types/workspace';
import {
  publishProjectToGitHubPages,
  verifyGitHubToken,
  GitHubUser,
} from '../utils/githubPublisher';
import { formatBytes } from '../utils/fileIngest';

interface GitHubPublisherViewProps {
  project: HostedProject;
  compiled: CompiledPreviewResult;
  autoPublishOnDrop: boolean;
  onToggleAutoPublish: (val: boolean) => void;
  onUpdateProjectGithubInfo: (info: NonNullable<HostedProject['githubPublishInfo']>) => void;
}

export const GitHubPublisherView: React.FC<GitHubPublisherViewProps> = ({
  project,
  compiled,
  autoPublishOnDrop,
  onToggleAutoPublish,
  onUpdateProjectGithubInfo,
}) => {
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('staticdock_gh_token') || '';
  });
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [repoName, setRepoName] = useState<string>(project.slug);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [branch, setBranch] = useState<string>('main');

  const [pipeline, setPipeline] = useState<GitHubPublishPipelineStatus>({
    step: 'auth',
    status: 'idle',
    message: '',
  });

  const [copiedUrl, setCopiedUrl] = useState(false);

  // Update repoName when project changes if not dirty
  useEffect(() => {
    setRepoName(project.slug);
  }, [project.slug]);

  // Check saved token on mount
  useEffect(() => {
    if (token) {
      setIsVerifyingToken(true);
      verifyGitHubToken(token)
        .then((userData) => {
          setUser(userData);
          setTokenError(null);
        })
        .catch((err) => {
          setTokenError(err.message);
          setUser(null);
        })
        .finally(() => setIsVerifyingToken(false));
    }
  }, []);

  const handleSaveAndVerifyToken = async (newTokenValue: string) => {
    const clean = newTokenValue.trim();
    setToken(clean);
    localStorage.setItem('staticdock_gh_token', clean);
    if (!clean) {
      setUser(null);
      setTokenError(null);
      return;
    }

    setIsVerifyingToken(true);
    setTokenError(null);
    try {
      const userData = await verifyGitHubToken(clean);
      setUser(userData);
      setTokenError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      setTokenError(message);
      setUser(null);
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handlePublishNow = async () => {
    if (!token) {
      setTokenError('Please enter a GitHub Personal Access Token to publish.');
      return;
    }

    setPipeline({
      step: 'auth',
      status: 'running',
      message: 'Authenticating with GitHub API...',
    });

    try {
      const result = await publishProjectToGitHubPages({
        token,
        repoName: repoName || project.slug,
        repoDescription: `${project.title} — Published offline via StaticDock`,
        isPrivate,
        branch,
        files: project.files,
        standaloneHtml: compiled.standaloneHtml,
        onProgress: (step, message, detail) => {
          setPipeline({
            step,
            status: step === 'done' ? 'success' : 'running',
            message,
            owner: detail?.owner,
            repo: detail?.repo,
            repoUrl: detail?.repoUrl,
            pagesUrl: detail?.pagesUrl,
            commitSha: detail?.commitSha,
          });
        },
      });

      // Update project with live published details
      const info = {
        publishedAt: Date.now(),
        repoUrl: result.repoUrl,
        pagesUrl: result.pagesUrl,
        repoName: result.repo,
        owner: result.owner,
        commitSha: result.commitSha,
        branch: result.branch,
        isLive: true,
      };
      onUpdateProjectGithubInfo(info);

      // Celebrate with confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setPipeline((prev) => ({
        ...prev,
        status: 'error',
        message: 'Deployment failed',
        error: msg,
      }));
    }
  };

  const copyPagesUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const tokenCreationUrl =
    'https://github.com/settings/tokens/new?scopes=repo,workflow&description=StaticDock%20GitHub%20Pages%20Publisher';

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-[#0b0f17]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Rocket className="w-4 h-4" />
            <span>AUTOMATIC GITHUB PAGES DEPLOYMENT ENGINE</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
            Publish &ldquo;{project.title}&rdquo; to GitHub Pages
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Automatically create a GitHub repository, upload all {project.files.length} static assets with <code className="font-mono text-slate-200">.nojekyll</code>, configure GitHub Pages, and get a live public <code className="font-mono text-slate-200">https://username.github.io/repo/</code> URL in seconds.
          </p>
        </div>

        {/* Auto Publish Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-md border border-slate-800 bg-[#0f1522] shrink-0">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Publish on Drop</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Publish immediately when HTML is dropped
            </div>
          </div>
          <button
            onClick={() => onToggleAutoPublish(!autoPublishOnDrop)}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              autoPublishOnDrop ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                autoPublishOnDrop ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* GitHub Authentication Box */}
      <div className="border border-slate-800 bg-[#0f1522] rounded-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-slate-100" />
            <h2 className="text-base font-semibold text-slate-100">
              01. GitHub Account Authorization
            </h2>
          </div>

          <a
            href={tokenCreationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Generate Token with Pre-Filled Scopes (repo, workflow)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">
            GitHub Personal Access Token (Classic <code className="font-mono text-amber-300">repo</code> or Fine-Grained with <code className="font-mono text-amber-300">Contents: Read/Write</code> &amp; <code className="font-mono text-amber-300">Pages: Read/Write</code>)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => handleSaveAndVerifyToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => handleSaveAndVerifyToken(token)}
              disabled={isVerifyingToken || !token}
              className="px-4 py-2 rounded-md bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {isVerifyingToken ? 'Verifying...' : 'Verify Token'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            Stored locally in your browser&apos;s <code className="font-mono">localStorage</code>. Calls are made directly from your browser to <code className="font-mono">api.github.com</code>.
          </p>
        </div>

        {/* User Badge or Error Notice */}
        {user && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-emerald-950/30 border border-emerald-800/60">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-8 h-8 rounded-full border border-emerald-600"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected as @{user.login}</span>
                {user.name && <span className="text-slate-400">({user.name})</span>}
              </div>
              <div className="text-[11px] text-emerald-400/80">
                Ready to automatically create repos and publish to {user.login}.github.io
              </div>
            </div>
          </div>
        )}

        {tokenError && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{tokenError}</span>
          </div>
        )}
      </div>

      {/* Target Repo & Publishing Settings */}
      <div className="border border-slate-800 bg-[#0f1522] rounded-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-amber-400" />
          <span>02. Repository &amp; Deployment Configuration</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-slate-300">
              Repository Name
            </label>
            <div className="flex items-center rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-400 font-mono">
              <span>{user ? `${user.login}/` : 'github-user/'}</span>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-static-site"
                className="flex-1 bg-transparent text-slate-100 focus:outline-none ml-0.5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Publish Branch
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="main">main (recommended)</option>
              <option value="gh-pages">gh-pages</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
            />
            <span>Create as Private Repository (GitHub Pages requires GitHub Pro for private repos)</span>
          </label>

          <div className="text-xs font-mono text-slate-400">
            {project.files.length} files to commit · {formatBytes(compiled.totalSizeBytes)}
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-2">
          <button
            onClick={handlePublishNow}
            disabled={pipeline.status === 'running' || !token}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/10"
          >
            {pipeline.status === 'running' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Publishing to GitHub Pages...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>Publish to GitHub Pages Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Pipeline Progress Display */}
      {pipeline.status !== 'idle' && (
        <div className="border border-slate-800 bg-[#0f1522] rounded-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Deployment Pipeline Status</span>
            </h3>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                pipeline.status === 'success'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : pipeline.status === 'error'
                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
              }`}
            >
              {pipeline.status === 'success'
                ? 'Published Live'
                : pipeline.status === 'error'
                ? 'Failed'
                : 'In Progress'}
            </span>
          </div>

          {/* Stepper Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div
              className={`p-3 rounded border flex items-center gap-2.5 ${
                pipeline.step === 'auth' && pipeline.status === 'running'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : pipeline.step !== 'auth' || pipeline.status === 'success'
                  ? 'border-emerald-800/80 bg-emerald-950/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900/50 text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="min-w-0 font-medium">1. Auth Token</div>
            </div>

            <div
              className={`p-3 rounded border flex items-center gap-2.5 ${
                pipeline.step === 'repo' && pipeline.status === 'running'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : ['commit', 'pages', 'done'].includes(pipeline.step) || pipeline.status === 'success'
                  ? 'border-emerald-800/80 bg-emerald-950/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900/50 text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="min-w-0 font-medium">2. Repository</div>
            </div>

            <div
              className={`p-3 rounded border flex items-center gap-2.5 ${
                pipeline.step === 'commit' && pipeline.status === 'running'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : ['pages', 'done'].includes(pipeline.step) || pipeline.status === 'success'
                  ? 'border-emerald-800/80 bg-emerald-950/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900/50 text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="min-w-0 font-medium">3. Git Tree Commit</div>
            </div>

            <div
              className={`p-3 rounded border flex items-center gap-2.5 ${
                pipeline.step === 'pages' && pipeline.status === 'running'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : pipeline.status === 'success'
                  ? 'border-emerald-800/80 bg-emerald-950/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900/50 text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="min-w-0 font-medium">4. GitHub Pages</div>
            </div>
          </div>

          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 flex items-center gap-2">
            <span className="text-amber-400 font-bold">&gt;</span>
            <span>{pipeline.message || 'Initializing...'}</span>
          </div>

          {pipeline.error && (
            <div className="p-4 rounded bg-rose-950/40 border border-rose-800/70 text-xs text-rose-300 space-y-1">
              <div className="font-semibold text-rose-200">Deployment Error:</div>
              <div>{pipeline.error}</div>
            </div>
          )}

          {/* Success Banner with Live GitHub Pages URL */}
          {pipeline.status === 'success' && pipeline.pagesUrl && (
            <div className="p-5 rounded-md bg-emerald-950/30 border border-emerald-600/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <span>Your Site Is Published on GitHub Pages!</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyPagesUrl(pipeline.pagesUrl!)}
                    className="flex items-center gap-1.5 rounded border border-emerald-700 bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-800/50 cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  <a
                    href={pipeline.pagesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                  >
                    <span>Open Live Site</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="p-3 rounded bg-slate-950/80 border border-emerald-800/60 font-mono text-sm text-emerald-300 break-all select-all">
                {pipeline.pagesUrl}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                {pipeline.repoUrl && (
                  <a
                    href={pipeline.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-300 hover:text-white underline inline-flex items-center gap-1"
                  >
                    <span>View GitHub Repo ({pipeline.owner}/{pipeline.repo})</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}
                {pipeline.commitSha && (
                  <span className="font-mono text-slate-500">
                    Commit: {pipeline.commitSha.slice(0, 7)}
                  </span>
                )}
                <span className="text-slate-500">
                  (Note: GitHub Pages initial DNS/CDN propagation typically takes 30-60 seconds on first creation)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previously Published Info if exists on project */}
      {project.githubPublishInfo && pipeline.status === 'idle' && (
        <div className="border border-slate-800 bg-[#0f1522] rounded-md p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Globe className="w-4 h-4" />
              <span>PREVIOUSLY PUBLISHED TO GITHUB PAGES</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {new Date(project.githubPublishInfo.publishedAt).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs">
            <span className="text-emerald-300 break-all select-all font-semibold">
              {project.githubPublishInfo.pagesUrl}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyPagesUrl(project.githubPublishInfo!.pagesUrl)}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
              >
                Copy
              </button>
              <a
                href={project.githubPublishInfo.pagesUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 cursor-pointer"
              >
                Open Site
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
