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
  content: string; // UTF-8 string for text files, or Data URL (data:image/png;base64,...) for binary files
  isDataUrl?: boolean;
  sizeBytes: number;
  updatedAt: number;
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
export type WorkbenchTab = 'workspace' | 'asset-graph' | 'github-deploy' | 'dropzone';
export type EditorSplitMode = 'preview-only' | 'split' | 'code-only';
