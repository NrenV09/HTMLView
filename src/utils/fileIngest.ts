import JSZip from 'jszip';
import { AssetKind, HostedProject, VirtualFile } from '../types/workspace';

export function detectFileKindAndMime(filename: string): {
  kind: AssetKind;
  mimeType: string;
  isBinary: boolean;
} {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return { kind: 'html', mimeType: 'text/html', isBinary: false };
    case 'css':
      return { kind: 'css', mimeType: 'text/css', isBinary: false };
    case 'js':
    case 'mjs':
    case 'cjs':
      return { kind: 'js', mimeType: 'text/javascript', isBinary: false };
    case 'svg':
      return { kind: 'svg', mimeType: 'image/svg+xml', isBinary: false };
    case 'json':
    case 'map':
      return { kind: 'json', mimeType: 'application/json', isBinary: false };
    case 'txt':
    case 'md':
    case 'xml':
    case 'csv':
      return { kind: 'other', mimeType: 'text/plain', isBinary: false };
    case 'png':
      return { kind: 'image', mimeType: 'image/png', isBinary: true };
    case 'jpg':
    case 'jpeg':
      return { kind: 'image', mimeType: 'image/jpeg', isBinary: true };
    case 'webp':
      return { kind: 'image', mimeType: 'image/webp', isBinary: true };
    case 'gif':
      return { kind: 'image', mimeType: 'image/gif', isBinary: true };
    case 'ico':
      return { kind: 'image', mimeType: 'image/x-icon', isBinary: true };
    case 'woff':
      return { kind: 'font', mimeType: 'font/woff', isBinary: true };
    case 'woff2':
      return { kind: 'font', mimeType: 'font/woff2', isBinary: true };
    case 'ttf':
      return { kind: 'font', mimeType: 'font/ttf', isBinary: true };
    default:
      return { kind: 'other', mimeType: 'text/plain', isBinary: false };
  }
}

function readFileAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function unpackZipFile(zipFile: File): Promise<VirtualFile[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const extracted: VirtualFile[] = [];
  const entries = Object.entries(zip.files);

  for (const [rawPath, zipEntry] of entries) {
    if (zipEntry.dir) continue;
    if (rawPath.includes('__MACOSX') || rawPath.endsWith('.DS_Store')) continue;

    const cleanPath = rawPath.replace(/^\/+/, '');
    const name = cleanPath.split('/').pop() || cleanPath;
    const { kind, mimeType, isBinary } = detectFileKindAndMime(name);

    if (isBinary) {
      const base64 = await zipEntry.async('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const uint8 = await zipEntry.async('uint8array');
      extracted.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        path: cleanPath,
        name,
        mimeType,
        kind,
        content: dataUrl,
        isDataUrl: true,
        sizeBytes: uint8.byteLength,
        updatedAt: Date.now(),
      });
    } else {
      const text = await zipEntry.async('string');
      extracted.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        path: cleanPath,
        name,
        mimeType,
        kind,
        content: text,
        isDataUrl: false,
        sizeBytes: new Blob([text]).size,
        updatedAt: Date.now(),
      });
    }
  }

  // Normalize top-level directory if all files share one root folder
  if (extracted.length > 1) {
    const firstSegs = extracted.map((f) => f.path.split('/')[0]);
    const allSameRoot =
      firstSegs.every((s) => s === firstSegs[0]) &&
      extracted.every((f) => f.path.includes('/'));
    if (allSameRoot) {
      const prefixLen = firstSegs[0].length + 1;
      for (const f of extracted) {
        f.path = f.path.slice(prefixLen);
      }
    }
  }

  return extracted;
}

interface FileWithRelativePath {
  file: File;
  relativePath: string;
}

async function readDirectoryEntryRecursive(
  entry: FileSystemEntry,
  parentPath = ''
): Promise<FileWithRelativePath[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) =>
      fileEntry.file(resolve, reject)
    );
    const relativePath = parentPath ? `${parentPath}/${file.name}` : file.name;
    return [{ file, relativePath }];
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const allEntries: FileSystemEntry[] = [];

    const readBatch = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve, reject) => reader.readEntries(resolve, reject));

    let batch = await readBatch();
    while (batch.length > 0) {
      allEntries.push(...batch);
      batch = await readBatch();
    }

    const nestedResults: FileWithRelativePath[] = [];
    const nextParent = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    for (const child of allEntries) {
      const sub = await readDirectoryEntryRecursive(child, nextParent);
      nestedResults.push(...sub);
    }
    return nestedResults;
  }

  return [];
}

export async function ingestDataTransfer(
  dataTransfer: DataTransfer
): Promise<VirtualFile[]> {
  const collected: FileWithRelativePath[] = [];

  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      const webkitEntry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (webkitEntry) {
        entries.push(webkitEntry);
      }
    }

    if (entries.length > 0) {
      for (const entry of entries) {
        const res = await readDirectoryEntryRecursive(entry, '');
        collected.push(...res);
      }
    }
  }

  if (collected.length === 0 && dataTransfer.files) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const f = dataTransfer.files[i];
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      collected.push({ file: f, relativePath: rel });
    }
  }

  return processRawFiles(collected);
}

export async function ingestFileList(fileList: FileList): Promise<VirtualFile[]> {
  const collected: FileWithRelativePath[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    collected.push({ file: f, relativePath: rel });
  }
  return processRawFiles(collected);
}

async function processRawFiles(
  items: FileWithRelativePath[]
): Promise<VirtualFile[]> {
  const virtualFiles: VirtualFile[] = [];

  for (const { file, relativePath } of items) {
    if (file.name.endsWith('.DS_Store')) continue;

    if (file.name.toLowerCase().endsWith('.zip')) {
      const unzipped = await unpackZipFile(file);
      virtualFiles.push(...unzipped);
      continue;
    }

    const cleanPath = relativePath.replace(/^\/+/, '');
    const name = cleanPath.split('/').pop() || file.name;
    const { kind, mimeType, isBinary } = detectFileKindAndMime(name);

    if (isBinary) {
      const dataUrl = await readFileAsDataUrl(file);
      virtualFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        path: cleanPath,
        name,
        mimeType,
        kind,
        content: dataUrl,
        isDataUrl: true,
        sizeBytes: file.size,
        updatedAt: Date.now(),
      });
    } else {
      const text = await readFileAsText(file);
      virtualFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        path: cleanPath,
        name,
        mimeType,
        kind,
        content: text,
        isDataUrl: false,
        sizeBytes: file.size || new Blob([text]).size,
        updatedAt: Date.now(),
      });
    }
  }

  // Strip shared single top-level directory prefix if whole folder was dropped
  if (virtualFiles.length > 1) {
    const firstSegs = virtualFiles.map((f) => f.path.split('/')[0]);
    const allSameRoot =
      firstSegs.every((s) => s === firstSegs[0]) &&
      virtualFiles.every((f) => f.path.includes('/'));
    if (allSameRoot) {
      const prefixLen = firstSegs[0].length + 1;
      for (const f of virtualFiles) {
        f.path = f.path.slice(prefixLen);
      }
    }
  }

  return virtualFiles;
}

export function buildProjectFromFiles(files: VirtualFile[]): HostedProject {
  const htmlFiles = files.filter((f) => f.kind === 'html');
  const indexHtml =
    htmlFiles.find((f) => f.path.toLowerCase() === 'index.html') ||
    htmlFiles.find((f) => f.name.toLowerCase() === 'index.html') ||
    htmlFiles[0];

  let projectFiles = [...files];
  let entryHtmlPath = indexHtml ? indexHtml.path : 'index.html';

  if (!indexHtml) {
    const cssLinks = files
      .filter((f) => f.kind === 'css')
      .map((f) => `  <link rel="stylesheet" href="./${f.path}" />`)
      .join('\n');
    const jsLinks = files
      .filter((f) => f.kind === 'js')
      .map((f) => `  <script src="./${f.path}"></script>`)
      .join('\n');
    const imagePreviews = files
      .filter((f) => f.kind === 'image' || f.kind === 'svg')
      .map(
        (f) =>
          `    <figure style="margin: 1rem 0; padding: 1rem; border: 1px solid #334155; border-radius: 6px;">
      <img src="./${f.path}" alt="${f.name}" style="max-width: 100%; height: auto;" />
      <figcaption style="margin-top: 0.5rem; font-family: monospace; font-size: 12px; color: #94a3b8;">${f.path}</figcaption>
    </figure>`
      )
      .join('\n');

    const synthesizedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Asset Preview Bundle</title>
${cssLinks}
</head>
<body style="background:#0f172a; color:#f8fafc; font-family:sans-serif; padding:2rem;">
  <h1>Local Asset Preview</h1>
  <p>Automatically generated host wrapper for ${files.length} dropped file(s).</p>
${imagePreviews}
${jsLinks}
</body>
</html>`;

    projectFiles = [
      {
        id: `file-synth-${Date.now()}`,
        path: 'index.html',
        name: 'index.html',
        mimeType: 'text/html',
        kind: 'html',
        content: synthesizedHtml,
        isDataUrl: false,
        sizeBytes: new Blob([synthesizedHtml]).size,
        updatedAt: Date.now(),
      },
      ...files,
    ];
    entryHtmlPath = 'index.html';
  }

  // Extract <title> from entry HTML if available
  let extractedTitle = '';
  const primaryHtml = projectFiles.find((f) => f.path === entryHtmlPath);
  if (primaryHtml) {
    const match = primaryHtml.content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match && match[1]) {
      extractedTitle = match[1].trim();
    }
  }

  const baseName = (indexHtml?.name || files[0]?.name || 'local-site').replace(
    /\.[^.]+$/,
    ''
  );
  const title =
    extractedTitle ||
    baseName
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const slug =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'offline-site';

  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    slug,
    title,
    description: `Locally hosted offline bundle with ${projectFiles.length} file(s). Entry point: ${entryHtmlPath}.`,
    category: 'User Dropped Host',
    entryHtmlPath,
    files: projectFiles,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isStarter: false,
  };
}

export function downloadSingleHtmlBundle(
  standaloneHtml: string,
  filename: string
): void {
  const safeName = filename.endsWith('.html') ? filename : `${filename}.html`;
  const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadGitHubPagesZip(
  project: HostedProject,
  standaloneHtml: string
): Promise<void> {
  const zip = new JSZip();

  // Add .nojekyll so GitHub Pages serves all files without Jekyll filtering
  zip.file('.nojekyll', '');

  // Add all original project files
  for (const file of project.files) {
    if (file.isDataUrl && file.content.includes(';base64,')) {
      const base64Data = file.content.split(';base64,')[1];
      zip.file(file.path, base64Data, { base64: true });
    } else {
      zip.file(file.path, file.content);
    }
  }

  // Include standalone HTML bundle
  zip.file(`${project.slug}.standalone.html`, standaloneHtml);

  // Add GitHub Actions static pages workflow
  const workflowYaml = `name: Deploy Static HTML to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
  zip.file('.github/workflows/static-pages.yml', workflowYaml);

  const readme = `# ${project.title}

Exported from **StaticDock — Offline HTML Host & Auto GitHub Pages Publisher**.

## Included Files
${project.files.map((f) => `- \`${f.path}\` (${f.mimeType}, ${f.sizeBytes} bytes)`).join('\n')}
- \`${project.slug}.standalone.html\` (Single-file offline bundle with all CSS, JS, and assets inlined)
- \`.nojekyll\` (Ensures GitHub Pages serves all asset paths unmodified)
- \`.github/workflows/static-pages.yml\` (Zero-config GitHub Pages deployment workflow)
`;
  zip.file('README.md', readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.slug}-gh-pages.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
