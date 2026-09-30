import React, { useState } from 'react';
import {
  Download,
  FileArchive,
  FileCode,
  Check,
  Copy,
  HardDrive,
} from 'lucide-react';
import { CompiledPreviewResult, HostedProject } from '../types/workspace';
import {
  downloadGitHubPagesZip,
  downloadSingleHtmlBundle,
  formatBytes,
} from '../utils/fileIngest';

interface GitHubDeployViewProps {
  project: HostedProject;
  compiled: CompiledPreviewResult;
}

export const GitHubDeployView: React.FC<GitHubDeployViewProps> = ({
  project,
  compiled,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  const handleExportZip = async () => {
    setExportingZip(true);
    try {
      await downloadGitHubPagesZip(project, compiled.standaloneHtml);
    } finally {
      setExportingZip(false);
    }
  };

  const gitCommands = `unzip ${project.slug}-gh-pages.zip -d ${project.slug}
cd ${project.slug}
git init && git checkout -b main
git add . && git commit -m "Deploy offline static bundle via StaticDock"
git remote add origin https://github.com/<your-username>/${project.slug}.git
git push -u origin main`;

  const copyCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-[#0b0f17]">
      <div className="border-b border-slate-800 pb-6">
        <p className="text-xs text-slate-400">
          Zero-Dependency Static Packaging · GitHub Pages Export
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
          Deploy &amp; Export &ldquo;{project.title}&rdquo;
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
          Package your locally hosted HTML and all linked CSS, JS, SVG, and image assets into a single portable offline HTML file or a ready-to-push GitHub Pages repository archive.
        </p>
      </div>

      {/* Two Primary Export Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option 1: Single Self-Contained HTML File */}
        <div className="border border-slate-800 bg-[#0f1522] p-6 rounded-md flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400">
                01. SINGLE-FILE PORTABLE ARTIFACT
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {formatBytes(new Blob([compiled.standaloneHtml]).size)}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-100">
              Compiled Self-Contained Offline HTML
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Combines <code className="font-mono text-slate-200">{project.entryHtmlPath}</code> and all{' '}
              <span className="font-mono tabular-nums text-slate-200">
                {project.files.length}
              </span>{' '}
              project assets into a single standalone <code className="font-mono text-slate-200">.html</code> file. Double-click it on any computer or USB drive to open offline without a web server.
            </p>
            <div className="pt-2 text-xs text-slate-400 space-y-1 font-mono">
              <div>· All linked CSS stylesheets inlined in &lt;head&gt;</div>
              <div>· All linked JS scripts embedded in document</div>
              <div>· All SVG &amp; raster images encoded as Data URIs</div>
            </div>
          </div>

          <button
            onClick={() =>
              downloadSingleHtmlBundle(
                compiled.standaloneHtml,
                `${project.slug}.standalone.html`
              )
            }
            className="w-full flex items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <FileCode className="w-4 h-4" />
            <span>Download {project.slug}.standalone.html</span>
          </button>
        </div>

        {/* Option 2: GitHub Pages Ready ZIP */}
        <div className="border border-slate-800 bg-[#0f1522] p-6 rounded-md flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400">
                02. GITHUB PAGES REPOSITORY BUNDLE
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {project.files.length + 3} files in archive
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-100">
              GitHub Pages Ready Archive (.zip)
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Exports the complete multi-file directory structure alongside a{' '}
              <code className="font-mono text-slate-200">.nojekyll</code> marker and a preconfigured{' '}
              <code className="font-mono text-slate-200">.github/workflows/static-pages.yml</code> GitHub Action.
            </p>
            <div className="pt-2 text-xs text-slate-400 space-y-1 font-mono">
              <div>· Preserves original relative CSS/JS/asset directory paths</div>
              <div>· Includes .nojekyll to prevent Jekyll asset stripping</div>
              <div>· Includes automated GitHub Pages deployment workflow</div>
            </div>
          </div>

          <button
            onClick={handleExportZip}
            disabled={exportingZip}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-100 hover:border-amber-500/60 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FileArchive className="w-4 h-4 text-amber-400" />
            <span>
              {exportingZip
                ? 'Packaging ZIP Archive...'
                : `Download ${project.slug}-gh-pages.zip`}
            </span>
          </button>
        </div>
      </div>

      {/* Git CLI Push Instructions */}
      <div className="border border-slate-800 bg-[#0f1522] p-6 rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              03. Quick GitHub Pages Terminal Workflow
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Run these commands after downloading the GitHub Pages ZIP bundle to publish live.
            </p>
          </div>
          <button
            onClick={copyCommands}
            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 cursor-pointer"
          >
            {copiedCmd ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Commands</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded bg-[#070a10] border border-slate-800/80 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {gitCommands}
        </pre>
      </div>

      {/* Hosting StaticDock Itself on GitHub Pages */}
      <div className="border border-slate-800 bg-[#0f1522] p-6 rounded-md space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>SELF-HOSTING STATICDOCK WORKBENCH</span>
        </div>
        <h3 className="text-base font-semibold text-slate-100">
          Deploying This StaticDock Host Application to GitHub Pages
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          StaticDock itself is configured with <code className="font-mono text-slate-200">base: &apos;./&apos;</code> in Vite and a Workbox Service Worker that precaches all UI scripts, stylesheets, and icons. Running <code className="font-mono text-slate-200">npm run build</code> outputs a static <code className="font-mono text-slate-200">dist/</code> directory that can be pushed directly to any <code className="font-mono text-slate-200">gh-pages</code> branch. Once visited once, the entire workbench loads offline from Service Worker cache and stores all dropped HTML sites in IndexedDB.
        </p>
      </div>
    </div>
  );
};
