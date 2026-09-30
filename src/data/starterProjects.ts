import { HostedProject, VirtualFile } from '../types/workspace';

function createTextFile(
  id: string,
  path: string,
  kind: VirtualFile['kind'],
  mimeType: string,
  content: string
): VirtualFile {
  const name = path.split('/').pop() || path;
  const sizeBytes = new Blob([content]).size;
  return {
    id,
    path,
    name,
    kind,
    mimeType,
    content,
    isDataUrl: false,
    sizeBytes,
    updatedAt: Date.now(),
  };
}

export const STARTER_PROJECTS: HostedProject[] = [
  {
    id: 'starter-orbital-lab',
    slug: 'orbital-physics-lab',
    title: 'Kepler-2D — Gravitational Orbit Simulator',
    description:
      'Pure HTML5 Canvas gravitational N-body simulator with orbital injection, trajectory trails, and companion CSS and physics script.',
    category: 'Simulation',
    entryHtmlPath: 'index.html',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 1800000,
    isStarter: true,
    files: [
      createTextFile(
        'orbital-html',
        'index.html',
        'html',
        'text/html',
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kepler-2D — Orbital Gravity Sandbox</title>
  <link rel="stylesheet" href="./lab.css" />
</head>
<body>
  <div class="hud-bar">
    <div class="hud-title">KEPLER-2D GRAVITY INTEGRATOR</div>
    <div class="hud-stats">
      BODIES: <span id="bodyCount">4</span> · INTEGRATION: <span>RK-VERLET</span> · CLICK CANVAS TO INJECT SATELLITE
    </div>
    <div class="hud-actions">
      <button id="presetBinaryBtn">Binary Star</button>
      <button id="clearSatellitesBtn">Reset Solar</button>
    </div>
  </div>
  <canvas id="cosmosCanvas"></canvas>
  <script src="./simulation.js"></script>
</body>
</html>`
      ),
      createTextFile(
        'orbital-css',
        'lab.css',
        'css',
        'text/css',
        `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #05070c;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hud-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: #0b0f19;
  border-bottom: 1px solid #1e293b;
  font-size: 0.75rem;
}

.hud-title {
  font-weight: 700;
  color: #f59e0b;
  letter-spacing: 0.06em;
}

.hud-stats {
  font-family: monospace;
  color: #94a3b8;
}

.hud-actions {
  display: flex;
  gap: 0.5rem;
}

button {
  background: #161f30;
  color: #f1f5f9;
  border: 1px solid #334155;
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

button:hover {
  border-color: #f59e0b;
  background: #202d45;
}

#cosmosCanvas {
  flex: 1;
  width: 100%;
  cursor: crosshair;
}`
      ),
      createTextFile(
        'orbital-js',
        'simulation.js',
        'js',
        'text/javascript',
        `(() => {
  const canvas = document.getElementById('cosmosCanvas');
  const ctx = canvas.getContext('2d');
  const bodyCountEl = document.getElementById('bodyCount');
  const presetBinaryBtn = document.getElementById('presetBinaryBtn');
  const clearSatellitesBtn = document.getElementById('clearSatellitesBtn');

  let bodies = [];
  const G = 0.45;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 48;
  }
  window.addEventListener('resize', resize);
  resize();

  function initSolarPreset() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    bodies = [
      { x: cx, y: cy, vx: 0, vy: 0, mass: 2600, radius: 14, color: '#f59e0b', fixed: true, trail: [] },
      { x: cx, y: cy - 110, vx: 3.2, vy: 0, mass: 12, radius: 4.5, color: '#38bdf8', fixed: false, trail: [] },
      { x: cx, y: cy + 175, vx: -2.55, vy: 0, mass: 24, radius: 6, color: '#10b981', fixed: false, trail: [] },
      { x: cx - 240, y: cy, vx: 0, vy: -2.15, mass: 18, radius: 5, color: '#f43f5e', fixed: false, trail: [] }
    ];
    bodyCountEl.textContent = String(bodies.length);
    console.log('[Kepler-2D] Initialized single-star solar system.');
  }

  function initBinaryPreset() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    bodies = [
      { x: cx - 70, y: cy, vx: 0, vy: -1.6, mass: 1400, radius: 11, color: '#f59e0b', fixed: false, trail: [] },
      { x: cx + 70, y: cy, vx: 0, vy: 1.6, mass: 1400, radius: 11, color: '#fb7185', fixed: false, trail: [] },
      { x: cx, y: cy - 210, vx: 2.4, vy: 0, mass: 10, radius: 4, color: '#38bdf8', fixed: false, trail: [] }
    ];
    bodyCountEl.textContent = String(bodies.length);
    console.log('[Kepler-2D] Binary Star preset activated.');
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.max(40, Math.hypot(dx, dy));
    const speed = Math.sqrt((G * 2400) / dist);
    const vx = (-dy / dist) * speed;
    const vy = (dx / dist) * speed;

    const palette = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24'];
    bodies.push({
      x,
      y,
      vx,
      vy,
      mass: 12 + Math.random() * 10,
      radius: 4.5,
      color: palette[bodies.length % palette.length],
      fixed: false,
      trail: []
    });
    bodyCountEl.textContent = String(bodies.length);
    console.log('[Kepler-2D] Injected satellite #' + bodies.length);
  });

  presetBinaryBtn.addEventListener('click', initBinaryPreset);
  clearSatellitesBtn.addEventListener('click', initSolarPreset);

  function step() {
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < bodies.length; i++) {
      const b1 = bodies[i];
      if (b1.fixed) continue;
      for (let j = 0; j < bodies.length; j++) {
        if (i === j) continue;
        const b2 = bodies[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = Math.max(220, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);
        const force = (G * b2.mass) / distSq;
        b1.vx += (dx / dist) * force;
        b1.vy += (dy / dist) * force;
      }
    }

    for (const b of bodies) {
      if (!b.fixed) {
        b.x += b.vx;
        b.y += b.vy;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 90) b.trail.shift();
      }

      if (b.trail.length > 2) {
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        b.trail.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  initSolarPreset();
  step();
})();`
      ),
    ],
  },
  {
    id: 'starter-swiss-zine',
    slug: 'swiss-editorial-zine',
    title: 'Neue Grafik — Swiss Editorial Specimen',
    description:
      'Swiss editorial web publication with linked CSS stylesheet, interactive typographic scale controller, and companion SVG vector diagram.',
    category: 'Editorial',
    entryHtmlPath: 'index.html',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000 * 4,
    isStarter: true,
    files: [
      createTextFile(
        'zine-html',
        'index.html',
        'html',
        'text/html',
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Neue Grafik — Issue 04: Modular Grid Systems</title>
  <link rel="stylesheet" href="./editorial.css" />
</head>
<body>
  <div class="grid-overlay" id="gridOverlay"></div>
  <header class="masthead">
    <div class="masthead-brand">NEUE GRAFIK · ZÜRICH</div>
    <div class="masthead-meta">ISSUE 04 · LOCAL ARCHIVE</div>
    <div class="masthead-controls">
      <button id="toggleGridBtn" class="control-btn">Toggle 12-Col Grid</button>
      <button id="invertThemeBtn" class="control-btn">Invert Theme</button>
    </div>
  </header>

  <main class="editorial-shell">
    <section class="hero-spread">
      <div class="hero-index">01 / MANIFESTO</div>
      <div class="hero-body">
        <h1 class="hero-title">
          The Mathematical Architecture of Offline Documents.
        </h1>
        <p class="hero-lead">
          Constructive typography demands zero external dependencies. Every stylesheet, vector figure, and interactive control in this issue is resolved from local storage.
        </p>
      </div>
    </section>

    <section class="specimen-row">
      <div class="figure-box">
        <img src="./assets/grid-specimen.svg" alt="Modular Swiss Proportions Diagram" class="specimen-svg" />
        <div class="figure-caption">
          Fig 1.1 — Golden Ratio &amp; 8-Field Harmonic Division (Resolved from <code>./assets/grid-specimen.svg</code>)
        </div>
      </div>

      <div class="columns-prose">
        <article class="prose-block">
          <h2>01. Proportion Over Ornament</h2>
          <p>
            When a document carries its own structural grammar in clean HTML and CSS, it remains legible everywhere. Local-first static hosting restores permanence to the browser viewport.
          </p>
        </article>
        <article class="prose-block">
          <h2>02. Automatic GitHub Pages Publishing</h2>
          <p>
            With StaticDock, any offline multi-asset project can be published to GitHub Pages in seconds with automatic Git Tree blobs and .nojekyll configuration.
          </p>
        </article>
      </div>
    </section>
  </main>

  <script src="./zine.js"></script>
</body>
</html>`
      ),
      createTextFile(
        'zine-css',
        'editorial.css',
        'css',
        'text/css',
        `:root {
  --bg: #f4f1ea;
  --fg: #121316;
  --muted: #5a5d64;
  --accent: #d9381e;
  --rule: #d5cfc2;
}

body.inverted {
  --bg: #111318;
  --fg: #f3f1ec;
  --muted: #9ca3af;
  --accent: #f59e0b;
  --rule: #262932;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  line-height: 1.5;
  padding: 2rem 2.5rem;
  transition: background-color 0.2s ease, color 0.2s ease;
  position: relative;
  min-height: 100vh;
}

.grid-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    to right,
    rgba(217, 56, 30, 0.09) 0px,
    rgba(217, 56, 30, 0.09) 1px,
    transparent 1px,
    transparent calc(100% / 12)
  );
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.grid-overlay.visible { opacity: 1; }

.masthead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--fg);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.masthead-controls { display: flex; gap: 0.5rem; }

.control-btn {
  background: transparent;
  color: var(--fg);
  border: 1px solid var(--fg);
  padding: 0.35rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.control-btn:hover { background: var(--fg); color: var(--bg); }

.hero-spread {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 2rem;
  padding: 2.5rem 0;
  border-bottom: 1px solid var(--rule);
}

.hero-index { font-size: 0.75rem; font-weight: 700; color: var(--accent); }

.hero-title {
  font-size: 2.5rem;
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-weight: 800;
  margin-bottom: 1rem;
}

.hero-lead { font-size: 1.05rem; color: var(--muted); max-width: 60ch; }

.specimen-row {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 2.5rem;
  padding: 2.5rem 0;
}

.figure-box { border: 1px solid var(--rule); padding: 1.25rem; }
.specimen-svg { width: 100%; height: auto; display: block; }
.figure-caption { margin-top: 0.85rem; font-size: 0.75rem; color: var(--muted); }

.columns-prose { display: flex; flex-direction: column; gap: 1.5rem; }
.prose-block h2 { font-size: 1rem; font-weight: 700; margin-bottom: 0.45rem; }
.prose-block p { font-size: 0.92rem; color: var(--muted); line-height: 1.6; }

@media (max-width: 760px) {
  .hero-spread, .specimen-row { grid-template-columns: 1fr; }
}`
      ),
      createTextFile(
        'zine-js',
        'zine.js',
        'js',
        'text/javascript',
        `document.addEventListener('DOMContentLoaded', () => {
  const toggleGridBtn = document.getElementById('toggleGridBtn');
  const invertThemeBtn = document.getElementById('invertThemeBtn');
  const gridOverlay = document.getElementById('gridOverlay');

  toggleGridBtn.addEventListener('click', () => {
    gridOverlay.classList.toggle('visible');
    console.log('[Neue Grafik] Grid overlay toggled');
  });

  invertThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('inverted');
    console.log('[Neue Grafik] Paper contrast inverted');
  });
});`
      ),
      createTextFile(
        'zine-svg',
        'assets/grid-specimen.svg',
        'svg',
        'image/svg+xml',
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380" fill="none">
  <rect width="640" height="380" fill="#16181D"/>
  <g stroke="#2E323B" stroke-width="1">
    <line x1="0" y1="95" x2="640" y2="95"/>
    <line x1="0" y1="190" x2="640" y2="190"/>
    <line x1="0" y1="285" x2="640" y2="285"/>
    <line x1="160" y1="0" x2="160" y2="380"/>
    <line x1="320" y1="0" x2="320" y2="380"/>
    <line x1="480" y1="0" x2="480" y2="380"/>
  </g>
  <rect x="40" y="40" width="300" height="300" stroke="#F4F1EA" stroke-width="2"/>
  <circle cx="190" cy="190" r="150" stroke="#D9381E" stroke-width="2.5"/>
  <path d="M40 340 L340 40 L600 340 Z" stroke="#F59E0B" stroke-width="1.75" fill="rgba(245, 158, 11, 0.07)"/>
  <rect x="380" y="60" width="210" height="120" fill="#D9381E"/>
  <text x="400" y="110" fill="#F4F1EA" font-family="monospace" font-size="16" font-weight="bold">MODULAR FIELD A</text>
  <text x="400" y="138" fill="#F4F1EA" font-family="monospace" font-size="12">RATIO 1 : 1.618</text>
  <text x="400" y="245" fill="#9CA3AF" font-family="monospace" font-size="12">OFFLINE ASSET: LOCAL SVG</text>
</svg>`
      ),
    ],
  },
];
