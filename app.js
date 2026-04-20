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
const DEFAULT_FREQ_RANGE = { min: 110, max: 1760 };

function applyFrequencyRange(min, max) {
  minFreqSlider.min = 20;
  minFreqSlider.max = max - 1;
  minFreqSlider.value = min;
  maxFreqSlider.min = min + 1;
  maxFreqSlider.max = Math.max(max, 8000);
  maxFreqSlider.value = max;

  audio.minFreq = min;
  audio.maxFreq = max;

  minFreqDisplay.textContent = `${min} Hz`;
  maxFreqDisplay.textContent = `${max} Hz`;
}

document.querySelectorAll('.inst-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.inst-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.dataset.inst === 'basic') {
      audio.instrument = 'basic';
      audio.waveform = btn.dataset.wave;
      applyFrequencyRange(DEFAULT_FREQ_RANGE.min, DEFAULT_FREQ_RANGE.max);
    } else {
      audio.instrument = btn.dataset.inst;
      const inst = audio.instruments[btn.dataset.inst];
      if (inst?.frequencyRange) {
        applyFrequencyRange(inst.frequencyRange.min, inst.frequencyRange.max);
      }
    }

    // Restart sound if currently playing so the change is heard immediately
    if (audio.isPlaying) {
      audio.stop();
    }
  });
});

// ─── Color → Instrument mapping ────────────────────────
const FAMILY_DEFS = [
  { id: 'red', label: 'Red', swatch: '#e74c3c' },
  { id: 'orange', label: 'Orange', swatch: '#e67e22' },
  { id: 'yellow', label: 'Yellow', swatch: '#f1c40f' },
  { id: 'green', label: 'Green', swatch: '#2ecc71' },
  { id: 'cyan', label: 'Cyan', swatch: '#1abc9c' },
  { id: 'blue', label: 'Blue', swatch: '#3498db' },
  { id: 'purple', label: 'Purple', swatch: '#9b59b6' },
  { id: 'magenta', label: 'Magenta', swatch: '#e91e8c' },
  { id: 'neutral', label: 'Neutral', swatch: 'linear-gradient(90deg,#111,#888,#eee)' },
];

const INSTRUMENT_OPTIONS = [
  { group: 'Basic Waveforms', items: [
    ['sine', 'Sine'], ['triangle', 'Triangle'], ['sawtooth', 'Sawtooth'], ['square', 'Square'],
  ]},
  { group: 'Strings', items: [
    ['violin', 'Violin'], ['viola', 'Viola'], ['cello', 'Cello'], ['harp', 'Harp'],
  ]},
  { group: 'Woodwinds', items: [
    ['flute', 'Flute'], ['oboe', 'Oboe'], ['clarinet', 'Clarinet'], ['bassoon', 'Bassoon'],
  ]},
  { group: 'Brass', items: [
    ['trumpet', 'Trumpet'], ['frenchHorn', 'French Horn'], ['trombone', 'Trombone'], ['tuba', 'Tuba'],
  ]},
  { group: 'Percussion', items: [
    ['timpani', 'Timpani'], ['glockenspiel', 'Glockenspiel'], ['xylophone', 'Xylophone'],
  ]},
];

const colorMappingEnable = $('colorMappingEnable');
const colorMappingRows = $('colorMappingRows');
const regenerateInstrumentsBtn = $('regenerateInstruments');

const ALL_INSTRUMENTS = INSTRUMENT_OPTIONS.flatMap(g => g.items.map(([v]) => v));
const manuallySetFamilies = new Set();

function randomInstrument() {
  return ALL_INSTRUMENTS[Math.floor(Math.random() * ALL_INSTRUMENTS.length)];
}

function randomizeUnsetFamilies() {
  for (const fam of FAMILY_DEFS) {
    if (!manuallySetFamilies.has(fam.id)) {
      audio.familyInstruments[fam.id] = randomInstrument();
    }
  }
}

function buildInstrumentSelect(familyId, value) {
  const sel = document.createElement('select');
  sel.className = 'color-family-select';
  sel.dataset.family = familyId;
  for (const group of INSTRUMENT_OPTIONS) {
    const og = document.createElement('optgroup');
    og.label = group.group;
    for (const [val, label] of group.items) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (val === value) opt.selected = true;
      og.appendChild(opt);
    }
    sel.appendChild(og);
  }
  sel.addEventListener('change', () => {
    audio.familyInstruments[familyId] = sel.value;
    manuallySetFamilies.add(familyId);
    if (audio.isPlaying) audio.stop();
  });
  return sel;
}

function renderColorMappingRows() {
  colorMappingRows.innerHTML = '';
  for (const fam of FAMILY_DEFS) {
    const row = document.createElement('div');
    row.className = 'color-family-row';
    const swatch = document.createElement('span');
    swatch.className = 'color-family-swatch';
    swatch.style.background = fam.swatch;
    const name = document.createElement('span');
    name.className = 'color-family-name';
    name.textContent = fam.label;
    const sel = buildInstrumentSelect(fam.id, audio.familyInstruments[fam.id]);
    row.appendChild(swatch);
    row.appendChild(name);
    row.appendChild(sel);
    colorMappingRows.appendChild(row);
  }
}

colorMappingEnable.addEventListener('change', () => {
  audio.colorMappingEnabled = colorMappingEnable.checked;
  colorMappingRows.classList.toggle('disabled', !colorMappingEnable.checked);
  if (colorMappingEnable.checked) {
    randomizeUnsetFamilies();
    renderColorMappingRows();
  }
  if (audio.isPlaying) audio.stop();
});

regenerateInstrumentsBtn.addEventListener('click', () => {
  randomizeUnsetFamilies();
  renderColorMappingRows();
  if (audio.isPlaying) audio.stop();
});

renderColorMappingRows();
colorMappingRows.classList.add('disabled');

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

// ─── Snap to Scale toggle ─────────────────────────────
const snapToggle = $('snapToggle');
snapToggle.addEventListener('click', () => {
  audio.snapToScale = !audio.snapToScale;
  snapToggle.classList.toggle('active', audio.snapToScale);
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
  const results = audio.playColors(colors);
  if (results && results.length > 0) {
    // Display the dominant (first) voice's info, show chord note count
    updateChordDisplays(results);
  }
};

canvas.onScanColumn = (colors) => {
  const results = audio.playColors(colors);
  if (results && results.length > 0) {
    updateChordDisplays(results);
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

function updateChordDisplays(results) {
  // Show the first voice's color info
  const primary = results[0];
  const hsl = primary.hsl;

  colorSwatch.classList.add('active', 'playing');

  hslValue.textContent = `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;
  rgbValue.textContent = `${results.length} voices`;
  hexValue.textContent = '—';

  // Show all chord notes
  const notes = results.map(r => audio.frequencyToNote(r.frequency).replace(/[+-]\d+c$/, ''));
  freqValue.textContent = results.length === 1
    ? `${primary.frequency.toFixed(1)} Hz`
    : `${results.length} tones`;
  noteValue.textContent = notes.join(' · ');
  volValue.textContent = `${Math.round(primary.gain * 100)}%`;
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
