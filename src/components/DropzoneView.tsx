import React, { useRef, useState } from 'react';
import {
  Upload,
  FolderUp,
  FileCode,
  Play,
  Layers,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { HostedProject, VirtualFile } from '../types/workspace';
import { ingestDataTransfer, ingestFileList } from '../utils/fileIngest';

interface DropzoneViewProps {
  activeProject: HostedProject;
  autoPublishOnDrop: boolean;
  onFilesIngested: (
    files: VirtualFile[],
    mode: 'new-project' | 'merge-current'
  ) => void;
  onCreateFromRawHtml: (title: string, htmlContent: string) => void;
}

const DEFAULT_PASTE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Offline HTML Sandbox</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0b0f17;
      color: #f8fafc;
      font-family: system-ui, sans-serif;
    }
    .card {
      padding: 2.5rem;
      border: 1px solid #1e293b;
      background: #111827;
      border-radius: 8px;
      max-width: 520px;
    }
    h1 { margin: 0 0 0.75rem; font-size: 1.5rem; color: #f59e0b; }
    p { margin: 0 0 1.25rem; color: #94a3b8; line-height: 1.6; font-size: 0.95rem; }
    button {
      background: #f59e0b;
      color: #0b0f17;
      border: none;
      padding: 0.6rem 1.1rem;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Offline HTML Host Active</h1>
    <p>This document is rendered 100% offline inside StaticDock and ready for automatic GitHub Pages deployment.</p>
    <button id="pingBtn">Run Script</button>
  </div>
  <script>
    document.getElementById('pingBtn').addEventListener('click', function() {
      this.textContent = 'Active at ' + new Date().toLocaleTimeString();
      console.log('Script running in offline sandbox');
    });
  </script>
</body>
</html>`;

export const DropzoneView: React.FC<DropzoneViewProps> = ({
  activeProject,
  autoPublishOnDrop,
  onFilesIngested,
  onCreateFromRawHtml,
}) => {
  const [ingestMode, setIngestMode] = useState<'new-project' | 'merge-current'>(
    'new-project'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawTitle, setRawTitle] = useState('Custom Offline Page');
  const [rawHtml, setRawHtml] = useState(DEFAULT_PASTE_HTML);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsProcessing(true);
    try {
      const files = await ingestDataTransfer(e.dataTransfer);
      if (files.length > 0) {
        onFilesIngested(files, ingestMode);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessing(true);
    try {
      const files = await ingestFileList(e.target.files);
      if (files.length > 0) {
        onFilesIngested(files, ingestMode);
      }
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-[#0b0f17]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs text-slate-400">
            Offline File Ingest · HTML, CSS, JS, SVG, Images &amp; ZIP Bundles
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
            Drag &amp; Drop HTML or Website Files
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
            Drop any <code className="font-mono text-slate-200">.html</code> file, companion <code className="font-mono text-slate-200">.css</code>/<code className="font-mono text-slate-200">.js</code> assets, a folder, or a <code className="font-mono text-slate-200">.zip</code>. Parsed in-memory and rendered dynamically offline.
          </p>
        </div>

        {/* Mode Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-md self-start">
          <button
            onClick={() => setIngestMode('new-project')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              ingestMode === 'new-project'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Host as New Site
          </button>
          <button
            onClick={() => setIngestMode('merge-current')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              ingestMode === 'merge-current'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Add to &ldquo;{activeProject.title.slice(0, 18)}&rdquo;
          </button>
        </div>
      </div>

      {/* Main Drag and Drop Target */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-700 bg-[#0f1522] hover:border-slate-600'
        }`}
      >
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
          <Upload className="w-5 h-5 text-amber-400" />
        </div>

        <h2 className="text-lg font-semibold text-slate-100">
          {isProcessing
            ? 'Compiling Local Files & Resolving Assets...'
            : ingestMode === 'new-project'
            ? 'Drop HTML File, Multi-File Bundle, Folder, or .ZIP to Preview'
            : `Drop Additional CSS, JS, SVG, or Image Assets into "${activeProject.title}"`}
        </h2>

        {autoPublishOnDrop && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Publish on Drop is ENABLED — Will publish to GitHub Pages immediately</span>
          </div>
        )}

        <p className="mt-2 text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
          Relative links like <code className="font-mono text-slate-300">&lt;link href=&quot;./style.css&quot;&gt;</code> and{' '}
          <code className="font-mono text-slate-300">&lt;script src=&quot;./app.js&quot;&gt;</code> are matched and inlined into the preview frame automatically.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".html,.htm,.css,.js,.mjs,.svg,.png,.jpg,.jpeg,.webp,.gif,.json,.woff,.woff2,.ttf,.txt,.md,.zip"
            onChange={handleFileInput}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={handleFileInput}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <FileCode className="w-4 h-4" />
            <span>Select HTML &amp; Asset Files</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:text-white transition-colors cursor-pointer"
          >
            <FolderUp className="w-4 h-4 text-amber-400" />
            <span>Select Entire Folder</span>
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            100% Client-Side Parsing
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Automatic CSS &amp; JS Inlining
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            IndexedDB Offline Persistence
          </span>
        </div>
      </div>

      {/* Raw HTML Launcher */}
      <div className="border border-slate-800 bg-[#0f1522] rounded-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Layers className="w-3.5 h-3.5" />
              <span>INSTANT RAW HTML LAUNCHER</span>
            </div>
            <h3 className="mt-1 text-base font-semibold text-slate-100">
              Paste Raw HTML Code to Host &amp; Preview
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={rawTitle}
              onChange={(e) => setRawTitle(e.target.value)}
              placeholder="Page Title"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => onCreateFromRawHtml(rawTitle || 'Untitled HTML', rawHtml)}
              className="flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Preview HTML</span>
            </button>
          </div>
        </div>

        <textarea
          value={rawHtml}
          onChange={(e) => setRawHtml(e.target.value)}
          rows={10}
          spellCheck={false}
          className="w-full rounded-md border border-slate-800 bg-[#070a10] p-4 font-mono text-xs text-slate-200 leading-relaxed focus:border-amber-500/70 focus:outline-none"
        />
      </div>
    </div>
  );
};
