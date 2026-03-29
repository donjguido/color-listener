// ─── Initialize ────────────────────────────────────────
const audio = new ColorAudio();
const canvas = new CanvasManager(
  document.getElementById('imageCanvas'),
  document.getElementById('overlayCanvas'),
  document.getElementById('canvasWrapper')
);

// ─── DOM refs ──────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const fileInput = $('fileInput');
const uploadPrompt = $('uploadPrompt');
const clearBtn = $('clearImage');
const colorSwatch = $('colorSwatch');
const rgbValue = $('rgbValue');
const hslValue = $('hslValue');
const hexValue = $('hexValue');
const freqValue = $('freqValue');
const noteValue = $('noteValue');
const volValue = $('volValue');
const minFreqSlider = $('minFreq');
const maxFreqSlider = $('maxFreq');
const volumeSlider = $('volume');
const minFreqDisplay = $('minFreqDisplay');
const maxFreqDisplay = $('maxFreqDisplay');
const volumeDisplay = $('volumeDisplay');
const scanSpeedSlider = $('scanSpeed');
const scanSpeedDisplay = $('scanSpeedDisplay');
const mappingHint = $('mappingHint');
const visualizerCanvas = $('visualizer');
const visCtx = visualizerCanvas.getContext('2d');

// ─── Image upload ──────────────────────────────────────
uploadPrompt.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

// Drag and drop
const wrapper = $('canvasWrapper');
wrapper.addEventListener('dragover', (e) => {
  e.preventDefault();
  wrapper.classList.add('drag-over');
});
wrapper.addEventListener('dragleave', () => {
  wrapper.classList.remove('drag-over');
});
wrapper.addEventListener('drop', (e) => {
  e.preventDefault();
  wrapper.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    loadFile(file);
  }
});

async function loadFile(file) {
  await canvas.loadImage(file);
  clearBtn.disabled = false;
}

clearBtn.addEventListener('click', () => {
  canvas.clear();
  audio.stop();
  clearBtn.disabled = true;
  resetDisplays();
});

// ─── Mode switching ────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    canvas.mode = mode;
    canvas.stopScan();
    audio.stop();
    canvas.overlayCtx.clearRect(0, 0, canvas.overlayCanvas.width, canvas.overlayCanvas.height);

    // Update cursor class
    wrapper.classList.remove('mode-click', 'mode-region', 'mode-scan');
    wrapper.classList.add(`mode-${mode}`);
  });
});

// ─── Instrument switching ──────────────────────────────
document.querySelectorAll('.inst-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.inst-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.dataset.inst === 'basic') {
      audio.instrument = 'basic';
      audio.waveform = btn.dataset.wave;
    } else {
      audio.instrument = btn.dataset.inst;
    }

    // Restart sound if currently playing so the change is heard immediately
    if (audio.isPlaying) {
      audio.stop();
    }
  });
});

// ─── Mapping mode ──────────────────────────────────────
const mappingHints = {
  hue: 'Hue controls pitch. Saturation controls richness. Brightness controls volume.',
  brightness: 'Brightness controls pitch. Saturation controls volume.',
  full: 'Hue controls pitch. Brightness controls volume. Full HSL mapping.'
};

document.querySelectorAll('.map-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    audio.mappingMode = btn.dataset.map;
    mappingHint.textContent = mappingHints[btn.dataset.map];
  });
});

// ─── Frequency range controls ──────────────────────────
minFreqSlider.addEventListener('input', () => {
  const val = parseInt(minFreqSlider.value);
  audio.minFreq = val;
  minFreqDisplay.textContent = `${val} Hz`;
  if (val >= audio.maxFreq) {
    maxFreqSlider.value = val + 100;
    audio.maxFreq = val + 100;
    maxFreqDisplay.textContent = `${val + 100} Hz`;
  }
});

maxFreqSlider.addEventListener('input', () => {
  const val = parseInt(maxFreqSlider.value);
  audio.maxFreq = val;
  maxFreqDisplay.textContent = `${val} Hz`;
  if (val <= audio.minFreq) {
    minFreqSlider.value = val - 100;
    audio.minFreq = val - 100;
    minFreqDisplay.textContent = `${val - 100} Hz`;
  }
});

volumeSlider.addEventListener('input', () => {
  const val = parseInt(volumeSlider.value);
  audio.volume = val / 100;
  volumeDisplay.textContent = `${val}%`;
});

const speedLabels = ['', 'Very Slow', 'Slow', 'Slow-Med', 'Medium-Slow', 'Medium', 'Medium-Fast', 'Fast-Med', 'Fast', 'Very Fast', 'Max'];
scanSpeedSlider.addEventListener('input', () => {
  const val = parseInt(scanSpeedSlider.value);
  canvas.scanSpeed = val;
  scanSpeedDisplay.textContent = speedLabels[val];
});

// ─── Canvas callbacks ──────────────────────────────────
canvas.onColorPick = (r, g, b, x, y) => {
  audio.playColor(r, g, b);
  updateDisplays(r, g, b);
};

canvas.onRegionPick = (colors) => {
  const result = audio.playColors(colors);
  if (result) {
    // Compute average color for display
    let tr = 0, tg = 0, tb = 0;
    for (const [r, g, b] of colors) { tr += r; tg += g; tb += b; }
    const ar = Math.round(tr / colors.length);
    const ag = Math.round(tg / colors.length);
    const ab = Math.round(tb / colors.length);
    updateDisplays(ar, ag, ab);
  }
};

canvas.onScanColumn = (colors) => {
  const result = audio.playColors(colors);
  if (result) {
    let tr = 0, tg = 0, tb = 0;
    for (const [r, g, b] of colors) { tr += r; tg += g; tb += b; }
    const ar = Math.round(tr / colors.length);
    const ag = Math.round(tg / colors.length);
    const ab = Math.round(tb / colors.length);
    updateDisplays(ar, ag, ab);
  }
};

canvas.onInteractionEnd = () => {
  audio.stop();
  colorSwatch.classList.remove('playing');
};

// ─── Display updates ───────────────────────────────────
function updateDisplays(r, g, b) {
  const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  const hsl = audio.rgbToHsl(r, g, b);
  const sound = audio.colorToSound(r, g, b);
  const note = audio.frequencyToNote(sound.frequency);

  colorSwatch.style.background = hex;
  colorSwatch.classList.add('active', 'playing');

  rgbValue.textContent = `${r}, ${g}, ${b}`;
  hslValue.textContent = `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;
  hexValue.textContent = hex;

  freqValue.textContent = `${sound.frequency.toFixed(1)} Hz`;
  noteValue.textContent = note;
  volValue.textContent = `${Math.round(sound.gain * 100)}%`;
}

function resetDisplays() {
  colorSwatch.style.background = '';
  colorSwatch.classList.remove('active', 'playing');
  rgbValue.textContent = '—';
  hslValue.textContent = '—';
  hexValue.textContent = '—';
  freqValue.textContent = '— Hz';
  noteValue.textContent = '—';
  volValue.textContent = '—';
}

// ─── Waveform visualizer ───────────────────────────────
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);

  const data = audio.getWaveformData();
  const w = visualizerCanvas.width;
  const h = visualizerCanvas.height;

  visCtx.fillStyle = '#1e1e2e';
  visCtx.fillRect(0, 0, w, h);

  if (!data) return;

  visCtx.lineWidth = 2;
  visCtx.strokeStyle = '#7c6ff7';
  visCtx.beginPath();

  const sliceWidth = w / data.length;
  let x = 0;

  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 128.0;
    const y = (v * h) / 2;

    if (i === 0) {
      visCtx.moveTo(x, y);
    } else {
      visCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  visCtx.lineTo(w, h / 2);
  visCtx.stroke();
}

drawVisualizer();

// ─── Resize handling ───────────────────────────────────
window.addEventListener('resize', () => {
  canvas.resize();
});

// ─── Keyboard: Escape to stop ──────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    audio.stop();
    canvas.stopScan();
    colorSwatch.classList.remove('playing');
  }
});
