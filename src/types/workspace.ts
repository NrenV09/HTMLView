export type AssetKind =
  | 'html'
  | 'css'
  | 'js'
  | 'svg'
  | 'image'
  | 'json'
  | 'font'
  | 'other';

export interface VirtualFile {
  id: string;
  path: string; // e.g. "index.html" or "assets/style.css"
  name: string;
  mimeType: string;
  kind: AssetKind;
  content: string; // UTF-8 string or Data URL (data:image/png;base64,...)
  isDataUrl?: boolean;
  sizeBytes: number;
  updatedAt: number;
}

export interface GitHubPublishInfo {
  publishedAt: number;
  repoUrl: string;
  pagesUrl: string;
  repoName: string;
  owner: string;
  commitSha?: string;
  branch: string;
  isLive: boolean;
}

export interface HostedProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  entryHtmlPath: string;
  files: VirtualFile[];
  createdAt: number;
  updatedAt: number;
  isStarter?: boolean;
  githubPublishInfo?: GitHubPublishInfo;
}

export interface AssetDependency {
  id: string;
  originalRef: string;
  tagOrContext: string;
  kind: 'stylesheet' | 'script' | 'image' | 'svg' | 'font' | 'html-link' | 'other';
  status: 'resolved-local' | 'inline-data' | 'external-url' | 'unresolved';
  resolvedFilePath?: string;
  sizeBytes?: number;
}

export interface CompiledPreviewResult {
  compiledHtml: string;
  standaloneHtml: string;
  dependencies: AssetDependency[];
  totalSizeBytes: number;
  compileTimeMs: number;
  title: string;
  domStats: {
    scripts: number;
    stylesheets: number;
    images: number;
    inlineStyles: number;
  };
}

export interface IframeConsoleMessage {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
  timestamp: string;
}

export type ViewportPreset = 'fluid' | 'desktop' | 'laptop' | 'tablet' | 'mobile';
export type WorkbenchTab = 'workspace' | 'github-publisher' | 'asset-graph' | 'dropzone';
export type EditorSplitMode = 'preview-only' | 'split' | 'code-only';

export type GitHubStepStatus = 'idle' | 'in-progress' | 'completed' | 'error';

export interface GitHubPublishPipelineStatus {
  step: 'auth' | 'repo' | 'commit' | 'pages' | 'verify' | 'done';
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  error?: string;
  repoUrl?: string;
  pagesUrl?: string;
  commitSha?: string;
  owner?: string;
  repo?: string;
}
