import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FileCode,
  Plus,
  Trash2,
  Download,
} from 'lucide-react';
import {
  CompiledPreviewResult,
  HostedProject,
  VirtualFile,
} from '../types/workspace';
import { formatBytes } from '../utils/fileIngest';

interface AssetGraphViewProps {
  project: HostedProject;
  compiled: CompiledPreviewResult;
  onSelectFileToEdit: (filePath: string) => void;
  onDeleteFile: (fileId: string) => void;
  onTriggerAddAssets: () => void;
  onCreateNewBlankFile: () => void;
}

export const AssetGraphView: React.FC<AssetGraphViewProps> = ({
  project,
  compiled,
  onSelectFileToEdit,
  onDeleteFile,
  onTriggerAddAssets,
  onCreateNewBlankFile,
}) => {
  const downloadVirtualFile = (file: VirtualFile) => {
    const a = document.createElement('a');
    if (file.isDataUrl) {
      a.href = file.content;
    } else {
      const blob = new Blob([file.content], { type: file.mimeType });
      a.href = URL.createObjectURL(blob);
    }
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resolvedCount = compiled.dependencies.filter(
    (d) => d.status === 'resolved-local' || d.status === 'inline-data'
  ).length;
  const unresolvedCount = compiled.dependencies.filter(
    (d) => d.status === 'unresolved'
  ).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-[#0b0f17]">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs text-slate-400">
            Offline Asset Linker · Virtual Filesystem Inspector
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
            {project.title} — Asset Dependency Graph
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span>Entry: {project.entryHtmlPath}</span>
            <span aria-hidden="true">·</span>
            <span>{project.files.length} Local Files</span>
            <span aria-hidden="true">·</span>
            <span>Total Bundle: {formatBytes(compiled.totalSizeBytes)}</span>
            <span aria-hidden="true">·</span>
            <span>Compile Latency: {compiled.compileTimeMs} ms</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onCreateNewBlankFile}
            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Text Asset</span>
          </button>
          <button
            onClick={onTriggerAddAssets}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Drop or Upload Assets into Site</span>
          </button>
        </div>
      </div>

      {/* Compiler Resolution Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-800 bg-[#0f1522] p-4 rounded-md">
          <div className="text-xs text-slate-400">Local Files in IndexedDB</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-100 font-mono tabular-nums">
            {project.files.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Persisted 100% offline in browser
          </div>
        </div>

        <div className="border border-slate-800 bg-[#0f1522] p-4 rounded-md">
          <div className="text-xs text-slate-400">Resolved Local References</div>
          <div className="mt-1.5 text-2xl font-semibold text-emerald-400 font-mono tabular-nums">
            {resolvedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Inlined into preview DOM automatically
          </div>
        </div>

        <div className="border border-slate-800 bg-[#0f1522] p-4 rounded-md">
          <div className="text-xs text-slate-400">Unresolved / Missing Links</div>
          <div
            className={`mt-1.5 text-2xl font-semibold font-mono tabular-nums ${
              unresolvedCount > 0 ? 'text-amber-400' : 'text-slate-100'
            }`}
          >
            {unresolvedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {unresolvedCount > 0
              ? 'Upload matching filenames to resolve'
              : 'All relative links satisfied'}
          </div>
        </div>

        <div className="border border-slate-800 bg-[#0f1522] p-4 rounded-md">
          <div className="text-xs text-slate-400">Compiled Standalone Weight</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-100 font-mono tabular-nums">
            {formatBytes(compiled.totalSizeBytes)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            HTML + CSS + JS + Base64/SVG media
          </div>
        </div>
      </div>

      {/* Table 1: Discovered HTML & CSS Dependency References */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            01. HTML &amp; CSS Dependency Resolution Table
          </h2>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {compiled.dependencies.length} references scanned
          </span>
        </div>

        <div className="border border-slate-800 rounded-md overflow-hidden bg-[#0f1522]">
          {compiled.dependencies.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-300">
                No external or relative asset references detected in{' '}
                <code className="font-mono text-amber-300">
                  {project.entryHtmlPath}
                </code>
                .
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This HTML document is already self-contained with inline styles or scripts.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-900/60">
                    <th className="py-2.5 px-4 font-medium">Source Reference</th>
                    <th className="py-2.5 px-4 font-medium">Origin Tag / Context</th>
                    <th className="py-2.5 px-4 font-medium">Asset Type</th>
                    <th className="py-2.5 px-4 font-medium">Resolution Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Matched Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {compiled.dependencies.map((dep) => (
                    <tr
                      key={dep.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-200">
                        {dep.originalRef}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400">
                        {dep.tagOrContext}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 capitalize">
                        {dep.kind}
                      </td>
                      <td className="py-2.5 px-4">
                        {dep.status === 'resolved-local' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Inlined from local file ({dep.resolvedFilePath})
                            </span>
                          </span>
                        )}
                        {dep.status === 'inline-data' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Embedded Data URI</span>
                          </span>
                        )}
                        {dep.status === 'external-url' && (
                          <span className="inline-flex items-center gap-1.5 text-amber-300">
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span>External URL (Requires network unless cached)</span>
                          </span>
                        )}
                        {dep.status === 'unresolved' && (
                          <span className="inline-flex items-center gap-1.5 text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Missing local file — drop &ldquo;
                              {dep.originalRef.split('/').pop()}&rdquo; to resolve
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-300">
                        {dep.sizeBytes ? formatBytes(dep.sizeBytes) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Table 2: All Virtual Files Stored in Project */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            02. Project Filesystem Contents
          </h2>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {project.files.length} files stored locally
          </span>
        </div>

        <div className="border border-slate-800 rounded-md overflow-hidden bg-[#0f1522]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-900/60">
                  <th className="py-2.5 px-4 font-medium">Relative Path</th>
                  <th className="py-2.5 px-4 font-medium">MIME Type</th>
                  <th className="py-2.5 px-4 font-medium">Encoding</th>
                  <th className="py-2.5 px-4 font-medium text-right">Size</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {project.files.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono text-slate-200 flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{file.path}</span>
                      {file.path === project.entryHtmlPath && (
                        <span className="text-amber-400 font-sans">
                          · Entry HTML
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {file.mimeType}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {file.isDataUrl ? 'Base64 Data URI' : 'UTF-8 Text'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-300">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {!file.isDataUrl && (
                          <button
                            onClick={() => onSelectFileToEdit(file.path)}
                            className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                          >
                            Edit Source
                          </button>
                        )}
                        <button
                          onClick={() => downloadVirtualFile(file)}
                          className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                          title="Download raw file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {project.files.length > 1 && (
                          <button
                            onClick={() => onDeleteFile(file.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Delete file from project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
