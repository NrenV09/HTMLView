import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  Columns,
  Download,
  Eye,
  FileCode,
  FileImage,
  FileText,
  FolderPlus,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Smartphone,
  Tablet,
  Terminal,
  Trash2,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import {
  EditorSplitMode,
  HostedProject,
  IframeConsoleMessage,
  ViewportPreset,
  VirtualFile,
  WorkbenchTab,
} from './types/workspace';
import { STARTER_PROJECTS } from './data/starterProjects';
import {
  deleteProjectFromDb,
  loadAllProjects,
  resetStarterProjectsInDb,
  saveProject,
} from './utils/localDb';
import { compileProjectHtml, fileToDataUrl, findMatchingFile } from './utils/assetCompiler';
import {
  buildProjectFromFiles,
  detectFileKindAndMime,
  downloadSingleHtmlBundle,
  formatBytes,
  ingestDataTransfer,
  ingestFileList,
} from './utils/fileIngest';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { AssetGraphView } from './components/AssetGraphView';
import { GitHubDeployView } from './components/GitHubDeployView';
import { DropzoneView } from './components/DropzoneView';

export default function App() {
  const isOnline = useOnlineStatus();

  const [projects, setProjects] = useState<HostedProject[]>(STARTER_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>(
    STARTER_PROJECTS[0].id
  );
  const [activeHtmlPath, setActiveHtmlPath] = useState<string>(
    STARTER_PROJECTS[0].entryHtmlPath
  );
  const [selectedEditorFilePath, setSelectedEditorFilePath] = useState<string>(
    STARTER_PROJECTS[0].entryHtmlPath
  );

  const [activeTab, setActiveTab] = useState<WorkbenchTab>('workspace');
  const [splitMode, setSplitMode] = useState<EditorSplitMode>('preview-only');
  const [viewportPreset, setViewportPreset] = useState<ViewportPreset>('fluid');
  const [isFullWindowHost, setIsFullWindowHost] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(1);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<IframeConsoleMessage[]>([]);

  // Global drag-and-drop overlay state
  const [windowDragActive, setWindowDragActive] = useState<boolean>(false);
  const dragDepthRef = useRef<number>(0);

  // Hidden file inputs for quick header / sidebar actions
  const quickOpenHtmlInputRef = useRef<HTMLInputElement | null>(null);
  const addAssetsToCurrentInputRef = useRef<HTMLInputElement | null>(null);

  // Modal for adding a new text file (e.g., styles.css, script.js, page.html)
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('custom.css');

  // Toast notification
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const notify = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Load persisted projects from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    loadAllProjects().then((loaded) => {
      if (!mounted || loaded.length === 0) return;
      setProjects(loaded);
      setActiveProjectId(loaded[0].id);
      setActiveHtmlPath(loaded[0].entryHtmlPath);
      setSelectedEditorFilePath(loaded[0].entryHtmlPath);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const activeProject = useMemo(() => {
    return (
      projects.find((p) => p.id === activeProjectId) ||
      projects[0] ||
      STARTER_PROJECTS[0]
    );
  }, [projects, activeProjectId]);

  // Compile the active HTML + all local CSS, JS, SVG, and image files
  const compiled = useMemo(() => {
    return compileProjectHtml(activeProject, activeHtmlPath);
  }, [activeProject, activeHtmlPath]);

  const selectedEditorFile = useMemo(() => {
    return (
      activeProject.files.find((f) => f.path === selectedEditorFilePath) ||
      activeProject.files.find((f) => f.path === activeHtmlPath) ||
      activeProject.files[0]
    );
  }, [activeProject, selectedEditorFilePath, activeHtmlPath]);

  // Listen for postMessage events from the previewed HTML iframe (console logs & local links)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'STATICDOCK_PREVIEW') return;

      if (data.type === 'CONSOLE' && data.payload) {
        setConsoleLogs((prev) => [
          ...prev.slice(-99),
          {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            level: data.payload.level || 'log',
            text: String(data.payload.text || ''),
            timestamp: data.payload.timestamp || new Date().toLocaleTimeString(),
          },
        ]);
      } else if (data.type === 'NAVIGATE_LOCAL' && data.payload?.href) {
        const matched = findMatchingFile(
          activeProject.files,
          activeHtmlPath,
          data.payload.href
        );
        if (matched && matched.kind === 'html') {
          setActiveHtmlPath(matched.path);
          setSelectedEditorFilePath(matched.path);
          notify(`Navigated to local file: ${matched.path}`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeProject, activeHtmlPath]);

  // Global window drag-and-drop listeners so dropping an HTML file anywhere works immediately
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setWindowDragActive(true);
    };

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setWindowDragActive(false);
      }
    };

    const handleDrop = () => {
      dragDepthRef.current = 0;
      setWindowDragActive(false);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleSelectProject = (proj: HostedProject) => {
    setActiveProjectId(proj.id);
    setActiveHtmlPath(proj.entryHtmlPath);
    setSelectedEditorFilePath(proj.entryHtmlPath);
    setConsoleLogs([]);
    setActiveTab('workspace');
  };

  const handleFilesIngested = async (
    ingestedFiles: VirtualFile[],
    mode: 'new-project' | 'merge-current'
  ) => {
    if (ingestedFiles.length === 0) return;

    if (mode === 'new-project') {
      const newProj = buildProjectFromFiles(ingestedFiles);
      await saveProject(newProj);
      setProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
      setActiveHtmlPath(newProj.entryHtmlPath);
      setSelectedEditorFilePath(newProj.entryHtmlPath);
      setConsoleLogs([]);
      setActiveTab('workspace');
      notify(
        `Hosted "${newProj.title}" with ${newProj.files.length} offline file(s).`
      );
    } else {
      // Merge into activeProject
      const existingFiles = [...activeProject.files];
      for (const incoming of ingestedFiles) {
        const idx = existingFiles.findIndex(
          (f) => f.path.toLowerCase() === incoming.path.toLowerCase()
        );
        if (idx >= 0) {
          existingFiles[idx] = { ...incoming, id: existingFiles[idx].id };
        } else {
          existingFiles.push(incoming);
        }
      }

      const incomingHtml = ingestedFiles.find((f) => f.kind === 'html');
      const updatedProject: HostedProject = {
        ...activeProject,
        files: existingFiles,
        entryHtmlPath: incomingHtml
          ? incomingHtml.path
          : activeProject.entryHtmlPath,
        updatedAt: Date.now(),
      };

      await saveProject(updatedProject);
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );
      if (incomingHtml) {
        setActiveHtmlPath(incomingHtml.path);
        setSelectedEditorFilePath(incomingHtml.path);
      } else {
        setSelectedEditorFilePath(ingestedFiles[0].path);
      }
      setActiveTab('workspace');
      notify(
        `Merged ${ingestedFiles.length} asset(s) into "${updatedProject.title}".`
      );
    }
  };

  const handleCreateFromRawHtml = async (title: string, htmlContent: string) => {
    const virtualHtml: VirtualFile = {
      id: `file-${Date.now()}`,
      path: 'index.html',
      name: 'index.html',
      mimeType: 'text/html',
      kind: 'html',
      content: htmlContent,
      isDataUrl: false,
      sizeBytes: new Blob([htmlContent]).size,
      updatedAt: Date.now(),
    };
    const newProj = buildProjectFromFiles([virtualHtml]);
    newProj.title = title.trim() || newProj.title;
    await saveProject(newProj);
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveHtmlPath(newProj.entryHtmlPath);
    setSelectedEditorFilePath(newProj.entryHtmlPath);
    setConsoleLogs([]);
    setActiveTab('workspace');
    notify(`Created and hosted "${newProj.title}".`);
  };

  const handleUpdateFileContent = async (fileId: string, newContent: string) => {
    const updatedFiles = activeProject.files.map((f) => {
      if (f.id !== fileId) return f;
      return {
        ...f,
        content: newContent,
        sizeBytes: new Blob([newContent]).size,
        updatedAt: Date.now(),
      };
    });

    const updatedProject: HostedProject = {
      ...activeProject,
      files: updatedFiles,
      updatedAt: Date.now(),
    };

    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
    await saveProject(updatedProject);
  };

  const handleCreateNewBlankFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = newFileName.trim().replace(/^\/+/, '');
    if (!cleanPath) return;

    const name = cleanPath.split('/').pop() || cleanPath;
    const { kind, mimeType } = detectFileKindAndMime(name);

    let starterContent = '';
    if (kind === 'html') {
      starterContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>${name}</title>\n</head>\n<body>\n  <h1>${name}</h1>\n</body>\n</html>`;
    } else if (kind === 'css') {
      starterContent = `/* Stylesheet: ${cleanPath} */\nbody {\n  \n}\n`;
    } else if (kind === 'js') {
      starterContent = `// Script: ${cleanPath}\nconsole.log('Loaded ${cleanPath}');\n`;
    } else if (kind === 'svg') {
      starterContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">\n  <circle cx="100" cy="100" r="80" fill="#f59e0b" />\n</svg>`;
    }

    const newFile: VirtualFile = {
      id: `file-${Date.now()}`,
      path: cleanPath,
      name,
      mimeType,
      kind,
      content: starterContent,
      isDataUrl: false,
      sizeBytes: new Blob([starterContent]).size,
      updatedAt: Date.now(),
    };

    await handleFilesIngested([newFile], 'merge-current');
    setSelectedEditorFilePath(cleanPath);
    if (splitMode === 'preview-only') {
      setSplitMode('split');
    }
    setShowNewFileModal(false);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (activeProject.files.length <= 1) return;
    const remaining = activeProject.files.filter((f) => f.id !== fileId);
    const nextHtml =
      remaining.find((f) => f.path === activeProject.entryHtmlPath) ||
      remaining.find((f) => f.kind === 'html') ||
      remaining[0];

    const updatedProject: HostedProject = {
      ...activeProject,
      entryHtmlPath: nextHtml.path,
      files: remaining,
      updatedAt: Date.now(),
    };

    await saveProject(updatedProject);
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
    setActiveHtmlPath(updatedProject.entryHtmlPath);
    setSelectedEditorFilePath(remaining[0].path);
    notify('Removed file from local project.');
  };

  const handleDeleteProject = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) return;
    await deleteProjectFromDb(projId);
    const remaining = projects.filter((p) => p.id !== projId);
    setProjects(remaining);
    if (activeProjectId === projId) {
      handleSelectProject(remaining[0]);
    }
    notify('Deleted hosted site from local storage.');
  };

  const handleResetStarters = async () => {
    const reloaded = await resetStarterProjectsInDb();
    setProjects(reloaded);
    handleSelectProject(reloaded[0]);
    notify('Restored default offline starter specimens.');
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.files.some((f) => f.path.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const viewportWidthClass = useMemo(() => {
    switch (viewportPreset) {
      case 'desktop':
        return 'max-w-[1440px] w-full';
      case 'laptop':
        return 'max-w-[1024px] w-full';
      case 'tablet':
        return 'max-w-[768px] w-full';
      case 'mobile':
        return 'max-w-[375px] w-full';
      default:
        return 'w-full';
    }
  }, [viewportPreset]);

  // If user is in Full-Window Standalone Host mode, render the iframe edge-to-edge
  if (isFullWindowHost) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <iframe
          key={`full-${iframeKey}-${activeProject.id}-${activeHtmlPath}`}
          srcDoc={compiled.compiledHtml}
          title={compiled.title}
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          className="w-full flex-1 border-0 bg-white"
        />
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-xs text-slate-200 shadow-xl backdrop-blur">
          <span className="font-mono text-amber-400">{activeHtmlPath}</span>
          <span aria-hidden="true">·</span>
          <span>Offline Host</span>
          <button
            onClick={() => setIsFullWindowHost(false)}
            className="ml-2 inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Exit Full Host</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#0b0f17] text-slate-100 select-none sm:select-auto overflow-hidden">
      {/* Hidden inputs for instant file opening */}
      <input
        ref={quickOpenHtmlInputRef}
        type="file"
        multiple
        accept=".html,.htm,.css,.js,.mjs,.svg,.png,.jpg,.jpeg,.webp,.gif,.json,.woff,.woff2,.ttf,.txt,.md,.zip"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            const files = await ingestFileList(e.target.files);
            await handleFilesIngested(files, 'new-project');
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        ref={addAssetsToCurrentInputRef}
        type="file"
        multiple
        accept=".html,.htm,.css,.js,.mjs,.svg,.png,.jpg,.jpeg,.webp,.gif,.json,.woff,.woff2,.ttf,.txt,.md,.zip"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            const files = await ingestFileList(e.target.files);
            await handleFilesIngested(files, 'merge-current');
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Global Window Drag-and-Drop Overlay */}
      {windowDragActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm p-8 flex flex-col items-center justify-center gap-6">
          <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepthRef.current = 0;
                setWindowDragActive(false);
                const files = await ingestDataTransfer(e.dataTransfer);
                await handleFilesIngested(files, 'new-project');
              }}
              className="border-2 border-dashed border-amber-400 bg-amber-500/10 rounded-lg p-10 text-center flex flex-col items-center justify-center gap-3 hover:bg-amber-500/20 transition-colors"
            >
              <Upload className="w-8 h-8 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">
                Drop to Preview as New Hosted Site
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Drop any <code className="font-mono">.html</code> file, companion CSS/JS/images, folder, or <code className="font-mono">.zip</code> to compile and preview immediately.
              </p>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepthRef.current = 0;
                setWindowDragActive(false);
                const files = await ingestDataTransfer(e.dataTransfer);
                await handleFilesIngested(files, 'merge-current');
              }}
              className="border-2 border-dashed border-emerald-400 bg-emerald-500/10 rounded-lg p-10 text-center flex flex-col items-center justify-center gap-3 hover:bg-emerald-500/20 transition-colors"
            >
              <FolderPlus className="w-8 h-8 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">
                Drop to Merge Assets into &ldquo;{activeProject.title}&rdquo;
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Add or update <code className="font-mono">.css</code>, <code className="font-mono">.js</code>, <code className="font-mono">.svg</code>, or image files inside the active site and re-link automatically.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              dragDepthRef.current = 0;
              setWindowDragActive(false);
            }}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
          >
            Cancel Drag Overlay
          </button>
        </div>
      )}

      {/* TOP BAR CONTRACT: Strictly 3 zones (Zone 1: Single text wordmark, Zone 2: 4 nav links, Zone 3: 2 actions) */}
      <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-slate-800 bg-[#0b0f17]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#workspace"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('workspace');
          }}
          className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          StaticDock
        </a>

        {/* Zone 2: 4 Clean Text Navigation Links */}
        <nav className="flex items-center gap-6 text-xs font-medium text-slate-400 overflow-x-auto">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'workspace'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setActiveTab('asset-graph')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'asset-graph'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            Asset Graph ({activeProject.files.length})
          </button>
          <button
            onClick={() => setActiveTab('github-deploy')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'github-deploy'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            GitHub Deploy
          </button>
          <button
            onClick={() => setActiveTab('dropzone')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'dropzone'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            Import Dropzone
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <button
            onClick={() => quickOpenHtmlInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Drop or Open HTML</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKBENCH BODY: Left Sidebar + Active Viewport */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar: Hosted Sites & Active Project Virtual Filesystem */}
        <aside className="w-64 lg:w-72 shrink-0 border-r border-slate-800 bg-[#0d121c] flex flex-col min-h-0">
          {/* Quick Drop Target Banner inside Sidebar */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              dragDepthRef.current = 0;
              setWindowDragActive(false);
              const files = await ingestDataTransfer(e.dataTransfer);
              await handleFilesIngested(files, 'new-project');
            }}
            onClick={() => quickOpenHtmlInputRef.current?.click()}
            className="m-3 p-3 rounded-md border border-dashed border-slate-700 bg-slate-900/50 hover:border-amber-500/60 hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Drop .HTML or .ZIP Here</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-snug">
              Drag files anywhere in the window to host &amp; preview 100% offline.
            </p>
          </div>

          {/* Search Filter */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter hosted sites or files..."
                className="w-full rounded border border-slate-800 bg-slate-950 pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Scrollable List of Hosted Projects + Active Project Files */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
            {/* Section 1: Locally Hosted HTML Sites */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] font-semibold text-slate-400">
                  Hosted Offline Sites ({filteredProjects.length})
                </span>
                <button
                  onClick={handleResetStarters}
                  className="text-[11px] text-slate-500 hover:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                  title="Restore default multi-file starter projects"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="space-y-1">
                {filteredProjects.map((proj) => {
                  const isSelected = proj.id === activeProject.id;
                  const totalBytes = proj.files.reduce(
                    (acc, f) => acc + f.sizeBytes,
                    0
                  );
                  return (
                    <div
                      key={proj.id}
                      onClick={() => handleSelectProject(proj)}
                      className={`group rounded-md px-2.5 py-2 transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-slate-800/80 border-slate-700 text-slate-100'
                          : 'border-transparent hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">
                          {proj.title}
                        </span>
                        {projects.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition-opacity cursor-pointer"
                            title="Delete hosted site"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Clean unboxed metadata with typographic separators */}
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums">
                        <span>{proj.files.length} files</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatBytes(totalBytes)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{proj.entryHtmlPath}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Active Site Virtual File Tree */}
            <div className="border-t border-slate-800/80 pt-4">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] font-semibold text-slate-400">
                  Site Files ({activeProject.files.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNewFileModal(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5 cursor-pointer"
                    title="Create a new HTML, CSS, JS, or SVG file in this project"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                  <button
                    onClick={() => addAssetsToCurrentInputRef.current?.click()}
                    className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-0.5 cursor-pointer"
                    title="Upload CSS, JS, SVG, or image assets into this project"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Add Asset</span>
                  </button>
                </div>
              </div>

              <div className="space-y-0.5">
                {activeProject.files.map((file) => {
                  const isCurrentEditor =
                    selectedEditorFile?.id === file.id &&
                    splitMode !== 'preview-only';
                  const isEntryHtml = file.path === activeHtmlPath;

                  return (
                    <button
                      key={file.id}
                      onClick={() => {
                        setSelectedEditorFilePath(file.path);
                        if (file.kind === 'html') {
                          setActiveHtmlPath(file.path);
                        } else if (splitMode === 'preview-only') {
                          setSplitMode('split');
                        }
                        if (activeTab !== 'workspace') {
                          setActiveTab('workspace');
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-left text-xs font-mono transition-colors cursor-pointer ${
                        isCurrentEditor || isEntryHtml
                          ? 'bg-slate-800/70 text-amber-300'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {file.kind === 'html' ? (
                          <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : file.kind === 'image' || file.kind === 'svg' ? (
                          <FileImage className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        )}
                        <span className="truncate">{file.path}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Footer: Offline Storage Status */}
          <div className="p-3 border-t border-slate-800 bg-[#090d14] flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isOnline ? 'Offline-Ready · IndexedDB' : 'Offline Mode Active'}
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {projects.reduce((acc, p) => acc + p.files.length, 0)} local assets
            </span>
          </div>
        </aside>

        {/* Main Content Viewport */}
        {activeTab === 'asset-graph' && (
          <AssetGraphView
            project={activeProject}
            compiled={compiled}
            onSelectFileToEdit={(filePath) => {
              setSelectedEditorFilePath(filePath);
              setSplitMode('split');
              setActiveTab('workspace');
            }}
            onDeleteFile={handleDeleteFile}
            onTriggerAddAssets={() => addAssetsToCurrentInputRef.current?.click()}
            onCreateNewBlankFile={() => setShowNewFileModal(true)}
          />
        )}

        {activeTab === 'github-deploy' && (
          <GitHubDeployView project={activeProject} compiled={compiled} />
        )}

        {activeTab === 'dropzone' && (
          <DropzoneView
            activeProject={activeProject}
            onFilesIngested={handleFilesIngested}
            onCreateFromRawHtml={handleCreateFromRawHtml}
          />
        )}

        {activeTab === 'workspace' && (
          <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0b0f17]">
            {/* Contextual Preview & Sandbox Sub-Toolbar */}
            <div className="h-11 shrink-0 px-4 border-b border-slate-800 bg-[#0f1522] flex items-center justify-between gap-3 overflow-x-auto">
              {/* Left: Breadcrumb & Asset Resolution Status */}
              <div className="flex items-center gap-2 text-xs min-w-0 shrink-0">
                <span className="font-medium text-slate-200 truncate max-w-[200px]">
                  {activeProject.title}
                </span>
                <span className="text-slate-600">/</span>
                <span className="font-mono text-amber-400">{activeHtmlPath}</span>
                <span className="hidden xl:inline text-slate-600">·</span>
                <span className="hidden xl:inline text-slate-400 font-mono tabular-nums">
                  {compiled.dependencies.filter(
                    (d) => d.status === 'resolved-local' || d.status === 'inline-data'
                  ).length}{' '}
                  inlined assets ({formatBytes(compiled.totalSizeBytes)})
                </span>
              </div>

              {/* Center: Split Mode & Viewport Width Controls */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Split View Segmented Buttons */}
                <div className="flex items-center gap-0.5 p-0.5 rounded bg-slate-900 border border-slate-800">
                  <button
                    onClick={() => setSplitMode('preview-only')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      splitMode === 'preview-only'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                  <button
                    onClick={() => setSplitMode('split')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      splitMode === 'split'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Split Code + Preview</span>
                  </button>
                  <button
                    onClick={() => setSplitMode('code-only')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      splitMode === 'code-only'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Source</span>
                  </button>
                </div>

                {/* Responsive Viewport Switcher */}
                {splitMode !== 'code-only' && (
                  <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded bg-slate-900 border border-slate-800">
                    <button
                      onClick={() => setViewportPreset('fluid')}
                      className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                        viewportPreset === 'fluid'
                          ? 'bg-slate-800 text-amber-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Fluid 100% width"
                    >
                      100%
                    </button>
                    <button
                      onClick={() => setViewportPreset('desktop')}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        viewportPreset === 'desktop'
                          ? 'bg-slate-800 text-amber-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Desktop 1440px"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewportPreset('tablet')}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        viewportPreset === 'tablet'
                          ? 'bg-slate-800 text-amber-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Tablet 768px"
                    >
                      <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewportPreset('mobile')}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        viewportPreset === 'mobile'
                          ? 'bg-slate-800 text-amber-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Mobile 375px"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Runtime Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIframeKey((k) => k + 1)}
                  className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
                  title="Reload HTML preview runtime"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reload</span>
                </button>

                <button
                  onClick={() => setConsoleOpen((o) => !o)}
                  className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                    consoleOpen
                      ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                  }`}
                  title="Toggle captured iframe console logs"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Console ({consoleLogs.length})</span>
                </button>

                <button
                  onClick={() =>
                    downloadSingleHtmlBundle(
                      compiled.standaloneHtml,
                      `${activeProject.slug}.standalone.html`
                    )
                  }
                  className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
                  title="Download self-contained single-file offline HTML"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden lg:inline">Bundle .HTML</span>
                </button>

                <button
                  onClick={() => setIsFullWindowHost(true)}
                  className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 hover:border-amber-500/50 hover:text-white transition-colors cursor-pointer"
                  title="Expand preview to full-window standalone host"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden lg:inline">Full Host</span>
                </button>
              </div>
            </div>

            {/* Split Editor & Live HTML Preview Container */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left Pane: Live Source Code / Asset Editor (shown in 'split' or 'code-only') */}
              {splitMode !== 'preview-only' && selectedEditorFile && (
                <div
                  className={`${
                    splitMode === 'code-only'
                      ? 'w-full'
                      : 'w-1/2 border-r border-slate-800'
                  } flex flex-col min-h-0 bg-[#080c13]`}
                >
                  {/* File Selector Tabs */}
                  <div className="h-9 shrink-0 px-3 border-b border-slate-800 bg-[#0c111b] flex items-center justify-between gap-2 overflow-x-auto">
                    <div className="flex items-center gap-1">
                      {activeProject.files.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setSelectedEditorFilePath(f.path);
                            if (f.kind === 'html') {
                              setActiveHtmlPath(f.path);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                            selectedEditorFile.id === f.id
                              ? 'bg-slate-800 text-amber-300 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {f.path}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0">
                      {selectedEditorFile.mimeType} ·{' '}
                      {formatBytes(selectedEditorFile.sizeBytes)}
                    </span>
                  </div>

                  {/* Editor Body */}
                  {selectedEditorFile.isDataUrl ? (
                    <div className="flex-1 p-8 flex flex-col items-center justify-center gap-4 overflow-auto">
                      {selectedEditorFile.kind === 'image' ? (
                        <img
                          src={fileToDataUrl(selectedEditorFile)}
                          alt={selectedEditorFile.name}
                          referrerPolicy="no-referrer"
                          className="max-h-80 max-w-full rounded border border-slate-800 object-contain bg-slate-950 p-4"
                        />
                      ) : null}
                      <p className="text-xs font-mono text-slate-400">
                        Binary Asset ({selectedEditorFile.path}) — Inlined automatically via Data URI
                      </p>
                    </div>
                  ) : (
                    <textarea
                      value={selectedEditorFile.content}
                      onChange={(e) =>
                        handleUpdateFileContent(
                          selectedEditorFile.id,
                          e.target.value
                        )
                      }
                      spellCheck={false}
                      className="flex-1 w-full resize-none bg-[#080c13] p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none"
                    />
                  )}
                </div>
              )}

              {/* Right Pane: Live Compiled HTML Preview Iframe */}
              {splitMode !== 'code-only' && (
                <div className="flex-1 flex flex-col items-center justify-start bg-[#070a0f] overflow-auto min-h-0">
                  <div
                    className={`${viewportWidthClass} h-full flex-1 flex flex-col bg-white shadow-2xl transition-all duration-150`}
                  >
                    <iframe
                      key={`preview-${iframeKey}-${activeProject.id}-${activeHtmlPath}`}
                      srcDoc={compiled.compiledHtml}
                      title={compiled.title}
                      sandbox="allow-scripts allow-modals allow-forms allow-popups"
                      className="w-full h-full flex-1 border-0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Captured Iframe Console Drawer */}
            {consoleOpen && (
              <div className="h-44 shrink-0 border-t border-slate-800 bg-[#090d15] flex flex-col">
                <div className="h-8 px-4 border-b border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Preview Runtime Console ({activeHtmlPath})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setConsoleLogs([])}
                      className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Clear Logs
                    </button>
                    <button
                      onClick={() => setConsoleOpen(false)}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
                  {consoleLogs.length === 0 ? (
                    <div className="text-slate-500">
                      No console output emitted yet. Interact with the HTML preview to capture logs.
                    </div>
                  ) : (
                    consoleLogs.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2.5 leading-relaxed ${
                          item.level === 'error'
                            ? 'text-rose-400'
                            : item.level === 'warn'
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="text-slate-500 tabular-nums shrink-0">
                          {item.timestamp}
                        </span>
                        <span className="uppercase text-[10px] text-slate-500 w-10 shrink-0">
                          {item.level}
                        </span>
                        <span className="break-all">{item.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </main>
        )}
      </div>

      {/* Modal: Create New Blank File in Active Project */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreateNewBlankFile}
            className="w-full max-w-md rounded-lg border border-slate-800 bg-[#0f1623] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100">
                Add New File to &ldquo;{activeProject.title}&rdquo;
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Relative File Path (e.g. <code>styles/theme.css</code>, <code>app.js</code>, <code>about.html</code>, <code>icon.svg</code>)
              </label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                autoFocus
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="rounded-md border border-slate-700 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                Create File
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Non-intrusive Status Toast & Offline Banner */}
      {statusNotice && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-slate-700 bg-slate-900/95 px-4 py-2 text-xs font-medium text-slate-100 shadow-xl">
          {statusNotice}
        </div>
      )}

      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md border border-amber-500/40 bg-slate-950/95 px-3.5 py-2 text-xs font-medium text-amber-300 shadow-lg">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Offline Mode — Serving from Local Service Worker &amp; IndexedDB</span>
        </div>
      )}
    </div>
  );
}
