import {
  AssetDependency,
  CompiledPreviewResult,
  HostedProject,
  VirtualFile,
} from '../types/workspace';

function normalizePath(pathStr: string): string {
  return pathStr
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .trim();
}

function resolveRelativePath(baseHtmlPath: string, targetRef: string): string {
  const cleanRef = targetRef.split('#')[0].split('?')[0].trim();
  if (!cleanRef) return '';
  if (cleanRef.startsWith('/')) {
    return normalizePath(cleanRef);
  }
  const baseParts = normalizePath(baseHtmlPath).split('/');
  baseParts.pop(); // remove base filename

  const refParts = cleanRef.replace(/\\/g, '/').split('/');
  for (const part of refParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  return baseParts.join('/');
}

export function findMatchingFile(
  files: VirtualFile[],
  baseHtmlPath: string,
  rawRef: string
): VirtualFile | undefined {
  const cleanRef = rawRef.split('#')[0].split('?')[0].trim();
  if (!cleanRef) return undefined;

  const resolvedPath = resolveRelativePath(baseHtmlPath, cleanRef);
  const directMatch = files.find(
    (f) => normalizePath(f.path).toLowerCase() === resolvedPath.toLowerCase()
  );
  if (directMatch) return directMatch;

  const normalizedRaw = normalizePath(cleanRef);
  const rawMatch = files.find(
    (f) => normalizePath(f.path).toLowerCase() === normalizedRaw.toLowerCase()
  );
  if (rawMatch) return rawMatch;

  // Fallback by filename if flat files were dropped together
  const refBasename = cleanRef.split('/').pop()?.toLowerCase();
  if (refBasename) {
    return files.find((f) => f.name.toLowerCase() === refBasename);
  }
  return undefined;
}

export function fileToDataUrl(file: VirtualFile): string {
  if (file.isDataUrl || file.content.startsWith('data:')) {
    return file.content;
  }
  if (file.kind === 'svg' || file.mimeType === 'image/svg+xml') {
    const encoded = encodeURIComponent(file.content)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }
  const base64 = btoa(unescape(encodeURIComponent(file.content)));
  return `data:${file.mimeType || 'application/octet-stream'};base64,${base64}`;
}

function inlineCssUrls(
  cssText: string,
  cssFilePath: string,
  files: VirtualFile[],
  dependencies: AssetDependency[]
): string {
  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (fullMatch, _quote, urlRef) => {
    const trimmed = urlRef.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('#')) {
      return fullMatch;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: trimmed,
        tagOrContext: `CSS url() in ${cssFilePath}`,
        kind: 'other',
        status: 'external-url',
      });
      return fullMatch;
    }
    const matched = findMatchingFile(files, cssFilePath, trimmed);
    if (matched) {
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: trimmed,
        tagOrContext: `CSS url() in ${cssFilePath}`,
        kind: matched.kind === 'font' ? 'font' : matched.kind === 'svg' ? 'svg' : 'image',
        status: 'resolved-local',
        resolvedFilePath: matched.path,
        sizeBytes: matched.sizeBytes,
      });
      return `url("${fileToDataUrl(matched)}")`;
    } else {
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: trimmed,
        tagOrContext: `CSS url() in ${cssFilePath}`,
        kind: 'other',
        status: 'unresolved',
      });
      return fullMatch;
    }
  });
}

const RUNTIME_BRIDGE_SCRIPT = `
<script data-staticdock-bridge="true">
(function() {
  function send(type, payload) {
    try {
      window.parent.postMessage({ source: 'STATICDOCK_PREVIEW', type: type, payload: payload }, '*');
    } catch (e) {}
  }

  function serializeArg(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch (e) { return String(arg); }
    }
    return String(arg);
  }

  ['log', 'info', 'warn', 'error'].forEach(function(level) {
    var orig = console[level];
    console[level] = function() {
      var args = Array.prototype.slice.call(arguments);
      send('CONSOLE', {
        level: level,
        text: args.map(serializeArg).join(' '),
        timestamp: new Date().toLocaleTimeString()
      });
      if (orig) orig.apply(console, arguments);
    };
  });

  window.addEventListener('error', function(event) {
    send('CONSOLE', {
      level: 'error',
      text: (event.message || 'Runtime Error') + (event.filename ? ' (' + event.filename + ':' + event.lineno + ')' : ''),
      timestamp: new Date().toLocaleTimeString()
    });
  });

  document.addEventListener('click', function(e) {
    var anchor = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || /^https?:\\/\\//i.test(href) || /^mailto:/i.test(href)) {
      return;
    }
    if (href.endsWith('.html') || href.endsWith('.htm') || !href.includes('.')) {
      e.preventDefault();
      send('NAVIGATE_LOCAL', { href: href });
    }
  });
})();
</script>
`;

export function compileProjectHtml(
  project: HostedProject,
  targetHtmlPath?: string
): CompiledPreviewResult {
  const startTime = performance.now();
  const htmlPath = targetHtmlPath || project.entryHtmlPath;

  const entryFile =
    project.files.find(
      (f) => normalizePath(f.path).toLowerCase() === normalizePath(htmlPath).toLowerCase()
    ) ||
    project.files.find((f) => f.kind === 'html') ||
    project.files[0];

  if (!entryFile) {
    return {
      compiledHtml: '<!doctype html><html><body><p>No HTML file found in project.</p></body></html>',
      standaloneHtml: '<!doctype html><html><body><p>No HTML file found in project.</p></body></html>',
      dependencies: [],
      totalSizeBytes: 0,
      compileTimeMs: 0,
      title: project.title,
      domStats: { scripts: 0, stylesheets: 0, images: 0, inlineStyles: 0 },
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(entryFile.content, 'text/html');
  const dependencies: AssetDependency[] = [];

  let totalResolvedBytes = entryFile.sizeBytes;
  let stylesheetsCount = 0;
  let scriptsCount = 0;
  let imagesCount = 0;
  let inlineStylesCount = 0;

  // 1. Process inline <style> tags
  const styleElements = Array.from(doc.querySelectorAll('style'));
  for (const styleEl of styleElements) {
    inlineStylesCount++;
    if (styleEl.textContent) {
      styleEl.textContent = inlineCssUrls(
        styleEl.textContent,
        entryFile.path,
        project.files,
        dependencies
      );
    }
  }

  // 2. Process <link rel="stylesheet" href="...">
  const linkElements = Array.from(doc.querySelectorAll('link[href]'));
  for (const linkEl of linkElements) {
    const rel = (linkEl.getAttribute('rel') || '').toLowerCase();
    const href = linkEl.getAttribute('href') || '';
    if (!href) continue;

    if (rel === 'stylesheet' || href.toLowerCase().endsWith('.css')) {
      stylesheetsCount++;
      if (/^https?:\/\//i.test(href)) {
        dependencies.push({
          id: `dep-${dependencies.length + 1}`,
          originalRef: href,
          tagOrContext: '<link rel="stylesheet">',
          kind: 'stylesheet',
          status: 'external-url',
        });
        continue;
      }

      const matchedCss = findMatchingFile(project.files, entryFile.path, href);
      if (matchedCss) {
        totalResolvedBytes += matchedCss.sizeBytes;
        dependencies.push({
          id: `dep-${dependencies.length + 1}`,
          originalRef: href,
          tagOrContext: '<link rel="stylesheet">',
          kind: 'stylesheet',
          status: 'resolved-local',
          resolvedFilePath: matchedCss.path,
          sizeBytes: matchedCss.sizeBytes,
        });

        const processedCss = inlineCssUrls(
          matchedCss.content,
          matchedCss.path,
          project.files,
          dependencies
        );
        const inlineStyle = doc.createElement('style');
        inlineStyle.setAttribute('data-inlined-from', matchedCss.path);
        inlineStyle.textContent = `/* Inlined from ${matchedCss.path} */\n${processedCss}`;
        linkEl.replaceWith(inlineStyle);
      } else {
        dependencies.push({
          id: `dep-${dependencies.length + 1}`,
          originalRef: href,
          tagOrContext: '<link rel="stylesheet">',
          kind: 'stylesheet',
          status: 'unresolved',
        });
      }
    }
  }

  // 3. Process <script src="...">
  const scriptElements = Array.from(doc.querySelectorAll('script'));
  for (const scriptEl of scriptElements) {
    scriptsCount++;
    const src = scriptEl.getAttribute('src');
    if (!src) continue;

    if (/^https?:\/\//i.test(src)) {
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: src,
        tagOrContext: '<script src>',
        kind: 'script',
        status: 'external-url',
      });
      continue;
    }

    const matchedJs = findMatchingFile(project.files, entryFile.path, src);
    if (matchedJs) {
      totalResolvedBytes += matchedJs.sizeBytes;
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: src,
        tagOrContext: '<script src>',
        kind: 'script',
        status: 'resolved-local',
        resolvedFilePath: matchedJs.path,
        sizeBytes: matchedJs.sizeBytes,
      });

      const inlineScript = doc.createElement('script');
      inlineScript.setAttribute('data-inlined-from', matchedJs.path);
      const scriptType = scriptEl.getAttribute('type');
      if (scriptType) inlineScript.setAttribute('type', scriptType);
      inlineScript.textContent = `// Inlined from ${matchedJs.path}\n${matchedJs.content}`;
      scriptEl.replaceWith(inlineScript);
    } else {
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: src,
        tagOrContext: '<script src>',
        kind: 'script',
        status: 'unresolved',
      });
    }
  }

  // 4. Process <img src="...">, <source src="...">, <video poster="...">
  const mediaElements = Array.from(
    doc.querySelectorAll('img[src], source[src], video[src], audio[src], image[href]')
  );
  for (const mediaEl of mediaElements) {
    imagesCount++;
    const attrName = mediaEl.hasAttribute('src') ? 'src' : 'href';
    const rawUrl = mediaEl.getAttribute(attrName) || '';
    if (!rawUrl) continue;

    if (rawUrl.startsWith('data:')) {
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: 'data:... (embedded)',
        tagOrContext: `<${mediaEl.tagName.toLowerCase()} ${attrName}>`,
        kind: 'image',
        status: 'inline-data',
        sizeBytes: rawUrl.length,
      });
      continue;
    }

    if (/^https?:\/\//i.test(rawUrl)) {
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: rawUrl,
        tagOrContext: `<${mediaEl.tagName.toLowerCase()} ${attrName}>`,
        kind: 'image',
        status: 'external-url',
      });
      continue;
    }

    const matchedMedia = findMatchingFile(project.files, entryFile.path, rawUrl);
    if (matchedMedia) {
      totalResolvedBytes += matchedMedia.sizeBytes;
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: rawUrl,
        tagOrContext: `<${mediaEl.tagName.toLowerCase()} ${attrName}>`,
        kind: matchedMedia.kind === 'svg' ? 'svg' : 'image',
        status: 'resolved-local',
        resolvedFilePath: matchedMedia.path,
        sizeBytes: matchedMedia.sizeBytes,
      });

      mediaEl.setAttribute(attrName, fileToDataUrl(matchedMedia));
      mediaEl.setAttribute('data-inlined-from', matchedMedia.path);
    } else {
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: rawUrl,
        tagOrContext: `<${mediaEl.tagName.toLowerCase()} ${attrName}>`,
        kind: 'image',
        status: 'unresolved',
      });
    }
  }

  // 5. Detect local HTML links (<a href="page.html">)
  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    if (href.endsWith('.html') || href.endsWith('.htm')) {
      const matchedHtml = findMatchingFile(project.files, entryFile.path, href);
      dependencies.push({
        id: `dep-${dependencies.length + 1}`,
        originalRef: href,
        tagOrContext: '<a href>',
        kind: 'html-link',
        status: matchedHtml ? 'resolved-local' : 'unresolved',
        resolvedFilePath: matchedHtml?.path,
        sizeBytes: matchedHtml?.sizeBytes,
      });
    }
  }

  const parsedTitle = doc.querySelector('title')?.textContent?.trim() || project.title;
  const standaloneHtml = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;

  // Inject preview bridge for live workbench iframe
  if (doc.head) {
    doc.head.insertAdjacentHTML('afterbegin', RUNTIME_BRIDGE_SCRIPT);
  } else {
    doc.documentElement.insertAdjacentHTML('afterbegin', RUNTIME_BRIDGE_SCRIPT);
  }
  const compiledHtml = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  const compileTimeMs = Math.max(1, Math.round((performance.now() - startTime) * 10) / 10);

  return {
    compiledHtml,
    standaloneHtml,
    dependencies,
    totalSizeBytes: totalResolvedBytes,
    compileTimeMs,
    title: parsedTitle,
    domStats: {
      scripts: scriptsCount,
      stylesheets: stylesheetsCount,
      images: imagesCount,
      inlineStyles: inlineStylesCount,
    },
  };
}
