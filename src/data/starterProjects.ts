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
    id: 'starter-swiss-zine',
    slug: 'swiss-editorial-zine',
    title: 'Neue Grafik — Issue 04 Specimen',
    description:
      'Multi-file Swiss editorial web publication with linked CSS grid stylesheet, interactive typographic scale controller script, and local SVG architectural diagram.',
    category: 'Editorial & Typography',
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
    <div class="masthead-meta">ISSUE 04 · AUTUMN 2026 · LOCAL ARCHIVE</div>
    <div class="masthead-controls">
      <button id="toggleGridBtn" class="control-btn">Toggle 12-Col Grid</button>
      <button id="invertThemeBtn" class="control-btn">Invert Paper Contrast</button>
    </div>
  </header>

  <main class="editorial-shell">
    <section class="hero-spread">
      <div class="hero-index">01 / MANIFESTO</div>
      <div class="hero-body">
        <h1 id="specimenHeadline" class="hero-title">
          The Mathematical Architecture of Offline Documents.
        </h1>
        <p class="hero-lead">
          Constructive typography demands zero external dependencies. Every stylesheet, vector figure, and interactive control in this issue is resolved from local storage without network roundtrips.
        </p>
        <div class="scale-toolbar">
          <label for="scaleRange" class="scale-label">Display Scale (<span id="scaleVal">100%</span>)</label>
          <input id="scaleRange" type="range" min="75" max="135" value="100" />
        </div>
      </div>
    </section>

    <section class="specimen-row">
      <div class="figure-box">
        <img src="./assets/grid-specimen.svg" alt="Modular Swiss Proportions Diagram" class="specimen-svg" />
        <div class="figure-caption">
          Fig 1.1 — Golden Ratio &amp; Josef Müller-Brockmann 8-Field Harmonic Division (Resolved from <code>./assets/grid-specimen.svg</code>)
        </div>
      </div>

      <div class="columns-prose">
        <article class="prose-block">
          <h2>01. Proportion Over Ornament</h2>
          <p>
            When a document carries its own structural grammar in clean HTML and CSS, it remains legible for decades. Local-first static hosting restores the permanence of printed monographs to the browser viewport.
          </p>
        </article>
        <article class="prose-block">
          <h2>02. Deterministic Asset Resolution</h2>
          <p>
            Relative links such as <code>./editorial.css</code> and <code>./zine.js</code> are compiled directly into the preview frame, preserving modular authoring while guaranteeing 100% offline fidelity.
          </p>
        </article>
        <div class="telemetry-strip">
          <div>WORDS: <strong id="wordCount">0</strong></div>
          <div>GLYPHS: <strong id="charCount">0</strong></div>
          <div>GRID RATIO: <strong>1 : 1.618</strong></div>
        </div>
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
  --scale-factor: 1;
}

body.inverted {
  --bg: #111318;
  --fg: #f3f1ec;
  --muted: #9ca3af;
  --accent: #f59e0b;
  --rule: #262932;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
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

.grid-overlay.visible {
  opacity: 1;
}

.masthead {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--fg);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.masthead-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  background: transparent;
  color: var(--fg);
  border: 1px solid var(--fg);
  padding: 0.35rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.control-btn:hover {
  background: var(--fg);
  color: var(--bg);
}

.hero-spread {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 2rem;
  padding: 3rem 0;
  border-bottom: 1px solid var(--rule);
}

.hero-index {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.06em;
}

.hero-title {
  font-size: calc(2.75rem * var(--scale-factor));
  line-height: 1.04;
  letter-spacing: -0.03em;
  font-weight: 800;
  max-width: 18ch;
  margin-bottom: 1.25rem;
}

.hero-lead {
  font-size: 1.05rem;
  color: var(--muted);
  max-width: 60ch;
  margin-bottom: 1.5rem;
}

.scale-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--rule);
  font-size: 0.75rem;
  font-weight: 600;
}

.specimen-row {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 2.5rem;
  padding: 2.5rem 0;
  align-items: start;
}

.figure-box {
  border: 1px solid var(--rule);
  padding: 1.25rem;
}

.specimen-svg {
  width: 100%;
  height: auto;
  display: block;
}

.figure-caption {
  margin-top: 0.85rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.columns-prose {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.prose-block h2 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.45rem;
}

.prose-block p {
  font-size: 0.92rem;
  color: var(--muted);
  line-height: 1.65;
}

.telemetry-strip {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 2px solid var(--fg);
  display: flex;
  justify-content: space-between;
  font-family: monospace;
  font-size: 0.78rem;
}

@media (max-width: 760px) {
  .hero-spread, .specimen-row {
    grid-template-columns: 1fr;
  }
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
  const scaleRange = document.getElementById('scaleRange');
  const scaleVal = document.getElementById('scaleVal');
  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');

  // Compute live document typography metrics
  const text = document.body.innerText || '';
  const words = text.trim().split(/\\s+/).filter(Boolean).length;
  wordCountEl.textContent = String(words);
  charCountEl.textContent = String(text.length);

  console.log('[Neue Grafik] Issue 04 initialized — ' + words + ' words indexed.');

  toggleGridBtn.addEventListener('click', () => {
    gridOverlay.classList.toggle('visible');
    const active = gridOverlay.classList.contains('visible');
    console.log('[Neue Grafik] 12-column Swiss grid overlay:', active ? 'ON' : 'OFF');
  });

  invertThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('inverted');
    console.log('[Neue Grafik] Paper contrast inverted.');
  });

  scaleRange.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    scaleVal.textContent = val + '%';
    document.documentElement.style.setProperty('--scale-factor', String(val / 100));
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
  <text x="400" y="138" fill="#F4F1EA" font-family="monospace" font-size="12">RATIO 1 : 1.618033</text>
  <text x="400" y="245" fill="#9CA3AF" font-family="monospace" font-size="12">VECTOR ASSET: LOCAL SVG</text>
  <text x="400" y="268" fill="#F4F1EA" font-family="monospace" font-size="13">ZERO NETWORK FETCH</text>
</svg>`
      ),
    ],
  },
  {
    id: 'starter-synth-lab',
    slug: 'webaudio-synth-deck',
    title: 'Klangwerk — WebAudio Poly-Synth & Oscilloscope',
    description:
      'Offline HTML5 Canvas waveform visualizer and playable Web Audio API synthesizer with linked rack stylesheet and DSP script.',
    category: 'Audio & Canvas DSP',
    entryHtmlPath: 'index.html',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
    isStarter: true,
    files: [
      createTextFile(
        'synth-html',
        'index.html',
        'html',
        'text/html',
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Klangwerk — Offline WebAudio Synthesizer</title>
  <link rel="stylesheet" href="./styles/rack.css" />
</head>
<body>
  <div class="rack-unit">
    <header class="rack-header">
      <div>
        <span class="rack-model">KLANGWERK KW-08</span>
        <span class="rack-sub">OFFLINE DSP OSCILLATOR &amp; REAL-TIME SCOPE</span>
      </div>
      <div class="freq-readout" id="freqReadout">440.0 Hz · A4</div>
    </header>

    <div class="scope-frame">
      <canvas id="scopeCanvas" width="760" height="200"></canvas>
    </div>

    <div class="controls-row">
      <div class="param-group">
        <label>WAVEFORM</label>
        <select id="waveSelect">
          <option value="sawtooth">Sawtooth</option>
          <option value="square">Square Pulse</option>
          <option value="triangle">Triangle</option>
          <option value="sine">Pure Sine</option>
        </select>
      </div>

      <div class="param-group">
        <label>LOWPASS CUTOFF (<span id="cutoffVal">1800 Hz</span>)</label>
        <input id="cutoffInput" type="range" min="120" max="6000" value="1800" />
      </div>

      <div class="param-group">
        <label>DETUNE SPREAD (<span id="detuneVal">14 ct</span>)</label>
        <input id="detuneInput" type="range" min="0" max="50" value="14" />
      </div>

      <div class="param-group">
        <label>DRONE HOLD</label>
        <button id="droneBtn" class="drone-btn">Start Drone</button>
      </div>
    </div>

    <div class="keyboard" id="keyboard">
      <button data-note="C4" data-freq="261.63" class="key">C4<span>261Hz</span></button>
      <button data-note="D4" data-freq="293.66" class="key">D4<span>294Hz</span></button>
      <button data-note="E4" data-freq="329.63" class="key">E4<span>330Hz</span></button>
      <button data-note="F4" data-freq="349.23" class="key">F4<span>349Hz</span></button>
      <button data-note="G4" data-freq="392.00" class="key">G4<span>392Hz</span></button>
      <button data-note="A4" data-freq="440.00" class="key active-key">A4<span>440Hz</span></button>
      <button data-note="B4" data-freq="493.88" class="key">B4<span>494Hz</span></button>
      <button data-note="C5" data-freq="523.25" class="key">C5<span>523Hz</span></button>
    </div>
  </div>
  <script src="./scripts/synth.js"></script>
</body>
</html>`
      ),
      createTextFile(
        'synth-css',
        'styles/rack.css',
        'css',
        'text/css',
        `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #090d14;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.rack-unit {
  width: 100%;
  max-width: 820px;
  background: #111722;
  border: 1px solid #263147;
  border-radius: 8px;
  padding: 1.5rem;
}

.rack-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #1e293b;
  margin-bottom: 1.25rem;
}

.rack-model {
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #f59e0b;
  margin-right: 0.75rem;
}

.rack-sub {
  font-size: 0.75rem;
  color: #64748b;
}

.freq-readout {
  font-family: monospace;
  font-size: 0.95rem;
  color: #10b981;
  background: #06090f;
  padding: 0.4rem 0.8rem;
  border: 1px solid #1e293b;
  border-radius: 4px;
}

.scope-frame {
  background: #05080e;
  border: 1px solid #1e293b;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1.25rem;
}

#scopeCanvas {
  width: 100%;
  height: 200px;
  display: block;
}

.controls-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  background: #0c111b;
  padding: 1rem;
  border: 1px solid #1e293b;
  border-radius: 6px;
}

.param-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.param-group label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

select, .drone-btn {
  background: #161f30;
  color: #f8fafc;
  border: 1px solid #334155;
  padding: 0.45rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.drone-btn.active {
  background: #f59e0b;
  color: #090d14;
  border-color: #f59e0b;
  font-weight: 700;
}

.keyboard {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.5rem;
}

.key {
  height: 92px;
  background: #182234;
  border: 1px solid #2d3d59;
  border-radius: 6px;
  color: #f8fafc;
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.35rem;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.12s ease;
}

.key span {
  font-family: monospace;
  font-size: 0.68rem;
  color: #64748b;
}

.key:hover, .key.active-key {
  background: #23314a;
  border-color: #f59e0b;
}

.key:active {
  transform: translateY(2px);
}`
      ),
      createTextFile(
        'synth-js',
        'scripts/synth.js',
        'js',
        'text/javascript',
        `(() => {
  const canvas = document.getElementById('scopeCanvas');
  const ctx = canvas.getContext('2d');
  const freqReadout = document.getElementById('freqReadout');
  const waveSelect = document.getElementById('waveSelect');
  const cutoffInput = document.getElementById('cutoffInput');
  const cutoffVal = document.getElementById('cutoffVal');
  const detuneInput = document.getElementById('detuneInput');
  const detuneVal = document.getElementById('detuneVal');
  const droneBtn = document.getElementById('droneBtn');
  const keys = document.querySelectorAll('.key');

  let currentFreq = 440;
  let currentNote = 'A4';
  let phase = 0;
  let audioCtx = null;
  let osc1 = null;
  let osc2 = null;
  let filterNode = null;
  let gainNode = null;
  let isDroning = false;

  function ensureAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function triggerNote(freq, noteName) {
    currentFreq = freq;
    currentNote = noteName;
    freqReadout.textContent = freq.toFixed(1) + ' Hz · ' + noteName;

    ensureAudio();
    if (isDroning && osc1 && osc2) {
      osc1.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.02);
      osc2.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.02);
      return;
    }

    const now = audioCtx.currentTime;
    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    const flt = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();

    o1.type = waveSelect.value;
    o2.type = waveSelect.value;
    o1.frequency.value = freq;
    o2.frequency.value = freq;
    o2.detune.value = Number(detuneInput.value);

    flt.type = 'lowpass';
    flt.frequency.value = Number(cutoffInput.value);

    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    o1.connect(flt);
    o2.connect(flt);
    flt.connect(g);
    g.connect(audioCtx.destination);

    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.48);
    o2.stop(now + 0.48);
    console.log('[Klangwerk DSP] Triggered ' + noteName + ' (' + freq + ' Hz)');
  }

  keys.forEach((btn) => {
    btn.addEventListener('click', () => {
      keys.forEach((k) => k.classList.remove('active-key'));
      btn.classList.add('active-key');
      triggerNote(Number(btn.dataset.freq), btn.dataset.note);
    });
  });

  droneBtn.addEventListener('click', () => {
    ensureAudio();
    if (!isDroning) {
      osc1 = audioCtx.createOscillator();
      osc2 = audioCtx.createOscillator();
      filterNode = audioCtx.createBiquadFilter();
      gainNode = audioCtx.createGain();

      osc1.type = waveSelect.value;
      osc2.type = waveSelect.value;
      osc1.frequency.value = currentFreq;
      osc2.frequency.value = currentFreq;
      osc2.detune.value = Number(detuneInput.value);

      filterNode.type = 'lowpass';
      filterNode.frequency.value = Number(cutoffInput.value);
      gainNode.gain.value = 0.12;

      osc1.connect(filterNode);
      osc2.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      isDroning = true;
      droneBtn.textContent = 'Stop Drone';
      droneBtn.classList.add('active');
      console.log('[Klangwerk DSP] Drone oscillator engaged.');
    } else {
      osc1.stop();
      osc2.stop();
      isDroning = false;
      droneBtn.textContent = 'Start Drone';
      droneBtn.classList.remove('active');
      console.log('[Klangwerk DSP] Drone oscillator stopped.');
    }
  });

  cutoffInput.addEventListener('input', (e) => {
    cutoffVal.textContent = e.target.value + ' Hz';
    if (filterNode && audioCtx) {
      filterNode.frequency.setTargetAtTime(Number(e.target.value), audioCtx.currentTime, 0.02);
    }
  });

  detuneInput.addEventListener('input', (e) => {
    detuneVal.textContent = e.target.value + ' ct';
    if (osc2 && audioCtx) {
      osc2.detune.setTargetAtTime(Number(e.target.value), audioCtx.currentTime, 0.02);
    }
  });

  waveSelect.addEventListener('change', () => {
    if (osc1 && osc2) {
      osc1.type = waveSelect.value;
      osc2.type = waveSelect.value;
    }
  });

  function sampleWave(t, type) {
    const s = Math.sin(t);
    if (type === 'sine') return s;
    if (type === 'square') return s >= 0 ? 0.8 : -0.8;
    if (type === 'triangle') return (2 / Math.PI) * Math.asin(s);
    // sawtooth
    return 2 * ((t / (2 * Math.PI)) - Math.floor(0.5 + t / (2 * Math.PI)));
  }

  function renderScope() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#05080e';
    ctx.fillRect(0, 0, w, h);

    // Subtle graticule lines
    ctx.strokeStyle = '#111a2b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const waveType = waveSelect.value;
    const detune = Number(detuneInput.value) * 0.002;
    const cutoffNorm = Math.min(1, Number(cutoffInput.value) / 4000);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    const cycles = (currentFreq / 110) * Math.PI * 2;
    for (let x = 0; x < w; x++) {
      const normX = x / w;
      const t1 = normX * cycles + phase;
      const t2 = normX * cycles * (1 + detune * 0.05) - phase * 0.7;
      const raw = (sampleWave(t1, waveType) + sampleWave(t2, waveType)) * 0.5;
      const smoothed = raw * (0.4 + 0.6 * cutoffNorm) + Math.sin(t1) * (1 - cutoffNorm) * 0.4;
      const y = h / 2 - smoothed * (h * 0.36);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    phase += 0.06;
    requestAnimationFrame(renderScope);
  }

  renderScope();
})();`
      ),
    ],
  },
  {
    id: 'starter-orbital-lab',
    slug: 'orbital-physics-lab',
    title: 'Kepler-2D — Interactive Orbital Mechanics Sandbox',
    description:
      'Pure HTML5 Canvas gravitational N-body simulator with click-and-drag orbital injection, trajectory trails, and linked physics script.',
    category: 'Scientific Simulation',
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
      BODIES: <span id="bodyCount">4</span> · STEP: <span>RK-VERLET</span> · CLICK CANVAS TO INJECT SATELLITE
    </div>
    <div class="hud-actions">
      <button id="presetBinaryBtn">Binary Star System</button>
      <button id="clearSatellitesBtn">Reset System</button>
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
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
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
}

button:hover {
  border-color: #f59e0b;
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
    console.log('[Kepler-2D] Initialized single-star system with 3 satellites.');
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
    console.log('[Kepler-2D] Switched to Binary Star preset.');
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
      mass: 10 + Math.random() * 15,
      radius: 4.5,
      color: palette[bodies.length % palette.length],
      fixed: false,
      trail: []
    });
    bodyCountEl.textContent = String(bodies.length);
    console.log('[Kepler-2D] Injected satellite #' + bodies.length + ' at r=' + Math.round(dist) + 'px');
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
];
