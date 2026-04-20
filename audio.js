class ColorAudio {
  constructor() {
    this.ctx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.analyser = null;
    this.isPlaying = false;

    this.minFreq = 110;
    this.maxFreq = 1760;
    this.volume = 0.5;
    this.waveform = 'sine';
    this.mappingMode = 'hue';
    this.instrument = 'basic'; // 'basic' uses waveform, otherwise uses instrument definition

    // Color-family → instrument mapping
    this.colorMappingEnabled = false;
    this.familyInstruments = {
      red: 'sine', orange: 'sine', yellow: 'sine', green: 'sine',
      cyan: 'sine', blue: 'sine', purple: 'sine', magenta: 'sine',
      neutral: 'sine'
    };

    // Active oscillator nodes for multi-oscillator instruments
    this.activeNodes = [];

    // Chord (polyphonic) state
    this.chordVoices = []; // array of { oscillators, gainNode, filter, lfo, lfoGain }
    this.chordMaster = null;
    this.maxVoices = 6;
    this.snapToScale = false;
    this.isChordPlaying = false;

    // For smooth transitions
    this.targetFreq = 0;
    this.targetGain = 0;
    this.rampTime = 0.05;

    // Orchestral instrument definitions
    // Each defines harmonics (partial ratios + amplitudes), envelope, and optional filter
    this.instruments = {
      // ── Strings ──
      violin: {
        category: 'strings',
        frequencyRange: { min: 196, max: 3136 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sawtooth' },
          { ratio: 2, amp: 0.5, wave: 'sine' },
          { ratio: 3, amp: 0.35, wave: 'sine' },
          { ratio: 4, amp: 0.2, wave: 'sine' },
          { ratio: 5, amp: 0.1, wave: 'sine' },
        ],
        envelope: { attack: 0.08, decay: 0.1, sustain: 0.7, release: 0.12 },
        filter: { type: 'lowpass', frequency: 4000, Q: 1.5 },
        vibrato: { rate: 5.5, depth: 4 },
      },
      viola: {
        category: 'strings',
        frequencyRange: { min: 131, max: 1047 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sawtooth' },
          { ratio: 2, amp: 0.6, wave: 'sine' },
          { ratio: 3, amp: 0.4, wave: 'sine' },
          { ratio: 4, amp: 0.25, wave: 'sine' },
        ],
        envelope: { attack: 0.1, decay: 0.12, sustain: 0.65, release: 0.15 },
        filter: { type: 'lowpass', frequency: 3200, Q: 1.2 },
        vibrato: { rate: 5, depth: 3.5 },
      },
      cello: {
        category: 'strings',
        frequencyRange: { min: 65, max: 988 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sawtooth' },
          { ratio: 2, amp: 0.55, wave: 'sine' },
          { ratio: 3, amp: 0.3, wave: 'sine' },
          { ratio: 4, amp: 0.15, wave: 'sine' },
        ],
        envelope: { attack: 0.12, decay: 0.15, sustain: 0.6, release: 0.2 },
        filter: { type: 'lowpass', frequency: 2500, Q: 1.0 },
        vibrato: { rate: 4.5, depth: 3 },
      },
      harp: {
        category: 'strings',
        frequencyRange: { min: 33, max: 3322 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sine' },
          { ratio: 2, amp: 0.4, wave: 'sine' },
          { ratio: 3, amp: 0.15, wave: 'sine' },
        ],
        envelope: { attack: 0.005, decay: 0.8, sustain: 0.0, release: 0.5 },
        filter: { type: 'lowpass', frequency: 5000, Q: 0.5 },
      },
      // ── Woodwinds ──
      flute: {
        category: 'woodwinds',
        frequencyRange: { min: 262, max: 2093 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sine' },
          { ratio: 2, amp: 0.12, wave: 'sine' },
          { ratio: 3, amp: 0.06, wave: 'sine' },
        ],
        envelope: { attack: 0.06, decay: 0.08, sustain: 0.8, release: 0.1 },
        filter: { type: 'lowpass', frequency: 6000, Q: 0.7 },
        vibrato: { rate: 5, depth: 2 },
      },
      oboe: {
        category: 'woodwinds',
        frequencyRange: { min: 233, max: 1568 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sawtooth' },
          { ratio: 2, amp: 0.7, wave: 'sine' },
          { ratio: 3, amp: 0.5, wave: 'sine' },
          { ratio: 4, amp: 0.35, wave: 'sine' },
          { ratio: 5, amp: 0.2, wave: 'sine' },
          { ratio: 6, amp: 0.1, wave: 'sine' },
        ],
        envelope: { attack: 0.04, decay: 0.1, sustain: 0.75, release: 0.08 },
        filter: { type: 'bandpass', frequency: 1800, Q: 2.0 },
        vibrato: { rate: 4.5, depth: 2.5 },
      },
      clarinet: {
        category: 'woodwinds',
        frequencyRange: { min: 147, max: 2093 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sine' },
          { ratio: 3, amp: 0.6, wave: 'sine' },  // odd harmonics dominate
          { ratio: 5, amp: 0.35, wave: 'sine' },
          { ratio: 7, amp: 0.15, wave: 'sine' },
        ],
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.75, release: 0.1 },
        filter: { type: 'lowpass', frequency: 3500, Q: 1.2 },
        vibrato: { rate: 4, depth: 1.5 },
      },
      bassoon: {
        category: 'woodwinds',
        frequencyRange: { min: 58, max: 622 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sawtooth' },
          { ratio: 2, amp: 0.65, wave: 'sine' },
          { ratio: 3, amp: 0.45, wave: 'sine' },
          { ratio: 4, amp: 0.3, wave: 'sine' },
          { ratio: 5, amp: 0.2, wave: 'sine' },
        ],
        envelope: { attack: 0.06, decay: 0.12, sustain: 0.7, release: 0.12 },
        filter: { type: 'lowpass', frequency: 2000, Q: 1.5 },
        vibrato: { rate: 4, depth: 2 },
      },
      // ── Brass ──
      trumpet: {
        category: 'brass',
        frequencyRange: { min: 165, max: 1047 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sawtooth' },
          { ratio: 2, amp: 0.8, wave: 'sine' },
          { ratio: 3, amp: 0.6, wave: 'sine' },
          { ratio: 4, amp: 0.4, wave: 'sine' },
          { ratio: 5, amp: 0.25, wave: 'sine' },
          { ratio: 6, amp: 0.15, wave: 'sine' },
        ],
        envelope: { attack: 0.03, decay: 0.08, sustain: 0.8, release: 0.06 },
        filter: { type: 'lowpass', frequency: 5000, Q: 2.0 },
        vibrato: { rate: 5, depth: 3 },
      },
      frenchHorn: {
        category: 'brass',
        frequencyRange: { min: 62, max: 698 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sine' },
          { ratio: 2, amp: 0.7, wave: 'sine' },
          { ratio: 3, amp: 0.5, wave: 'sine' },
          { ratio: 4, amp: 0.35, wave: 'sine' },
          { ratio: 5, amp: 0.2, wave: 'sine' },
        ],
        envelope: { attack: 0.06, decay: 0.1, sustain: 0.7, release: 0.15 },
        filter: { type: 'lowpass', frequency: 2800, Q: 1.5 },
        vibrato: { rate: 4, depth: 2.5 },
      },
      trombone: {
        category: 'brass',
        frequencyRange: { min: 58, max: 587 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sawtooth' },
          { ratio: 2, amp: 0.7, wave: 'sine' },
          { ratio: 3, amp: 0.5, wave: 'sine' },
          { ratio: 4, amp: 0.3, wave: 'sine' },
        ],
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.75, release: 0.1 },
        filter: { type: 'lowpass', frequency: 2200, Q: 1.8 },
        vibrato: { rate: 4.5, depth: 3 },
      },
      tuba: {
        category: 'brass',
        frequencyRange: { min: 29, max: 349 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sawtooth' },
          { ratio: 2, amp: 0.6, wave: 'sine' },
          { ratio: 3, amp: 0.35, wave: 'sine' },
          { ratio: 4, amp: 0.2, wave: 'sine' },
        ],
        envelope: { attack: 0.08, decay: 0.12, sustain: 0.65, release: 0.15 },
        filter: { type: 'lowpass', frequency: 1500, Q: 1.2 },
      },
      // ── Percussion ──
      timpani: {
        category: 'percussion',
        frequencyRange: { min: 65, max: 349 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sine' },
          { ratio: 1.5, amp: 0.5, wave: 'sine' },
          { ratio: 2, amp: 0.3, wave: 'sine' },
          { ratio: 2.5, amp: 0.15, wave: 'sine' },
        ],
        envelope: { attack: 0.005, decay: 0.6, sustain: 0.0, release: 0.4 },
        filter: { type: 'lowpass', frequency: 1200, Q: 0.8 },
      },
      glockenspiel: {
        category: 'percussion',
        frequencyRange: { min: 1397, max: 4186 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sine' },
          { ratio: 2.76, amp: 0.4, wave: 'sine' },
          { ratio: 5.4, amp: 0.2, wave: 'sine' },
        ],
        envelope: { attack: 0.002, decay: 1.2, sustain: 0.0, release: 0.8 },
        filter: { type: 'highpass', frequency: 800, Q: 0.5 },
      },
      xylophone: {
        category: 'percussion',
        frequencyRange: { min: 698, max: 4186 },
        harmonics: [
          { ratio: 1, amp: 1.0, wave: 'sine' },
          { ratio: 3, amp: 0.3, wave: 'sine' },
          { ratio: 6, amp: 0.1, wave: 'sine' },
        ],
        envelope: { attack: 0.002, decay: 0.5, sustain: 0.0, release: 0.3 },
        filter: { type: 'lowpass', frequency: 8000, Q: 0.5 },
      },
    };
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.ctx.destination);
  }

  /**
   * Convert RGB to HSL
   */
  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /**
   * Classify an RGB color into a hue family bucket.
   * Returns one of: red, orange, yellow, green, cyan, blue, purple, magenta, neutral.
   */
  classifyColorFamily(r, g, b) {
    const hsl = this.rgbToHsl(r, g, b);
    if (hsl.s < 15 || hsl.l < 10 || hsl.l > 90) return 'neutral';
    const h = hsl.h;
    if (h >= 345 || h < 15) return 'red';
    if (h < 45) return 'orange';
    if (h < 75) return 'yellow';
    if (h < 165) return 'green';
    if (h < 195) return 'cyan';
    if (h < 255) return 'blue';
    if (h < 285) return 'purple';
    return 'magenta';
  }

  /**
   * Resolve effective instrument for a color, honoring color-family mapping when enabled.
   * Returns { instrument, waveform }.
   */
  _effectiveInstrumentFor(r, g, b) {
    if (!this.colorMappingEnabled) {
      return { instrument: this.instrument, waveform: this.waveform };
    }
    const family = this.classifyColorFamily(r, g, b);
    const assigned = this.familyInstruments[family];
    const basicWaves = ['sine', 'triangle', 'sawtooth', 'square'];
    if (!assigned) return { instrument: this.instrument, waveform: this.waveform };
    if (basicWaves.includes(assigned)) {
      return { instrument: 'basic', waveform: assigned };
    }
    return { instrument: assigned, waveform: this.waveform };
  }

  /**
   * Map a color (r, g, b) to audio parameters based on the current mapping mode.
   * Returns { frequency, gain, detune }
   */
  colorToSound(r, g, b) {
    const hsl = this.rgbToHsl(r, g, b);
    const range = this.maxFreq - this.minFreq;
    let frequency, gain;

    switch (this.mappingMode) {
      case 'hue':
        // Hue (0-360) maps to frequency
        frequency = this.minFreq + (hsl.h / 360) * range;
        // Saturation affects "richness" (slight detuning)
        // Lightness affects volume
        gain = this.volume * (hsl.l / 100) * (0.3 + 0.7 * (hsl.s / 100));
        break;

      case 'brightness':
        // Brightness directly maps to frequency
        frequency = this.minFreq + (hsl.l / 100) * range;
        gain = this.volume * (0.3 + 0.7 * (hsl.s / 100));
        break;

      case 'full':
        // Hue → pitch, Saturation → harmonics presence, Lightness → volume
        frequency = this.minFreq + (hsl.h / 360) * range;
        gain = this.volume * (hsl.l / 100);
        break;

      default:
        frequency = this.minFreq + (hsl.h / 360) * range;
        gain = this.volume * (hsl.l / 100);
    }

    // Clamp
    frequency = Math.max(this.minFreq, Math.min(this.maxFreq, frequency));
    gain = Math.max(0, Math.min(1, gain));

    return { frequency, gain, hsl };
  }

  /**
   * Get the closest musical note name for a frequency
   */
  frequencyToNote(freq) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const semitones = 12 * Math.log2(freq / a4);
    const noteIndex = Math.round(semitones) + 69; // MIDI note number
    const octave = Math.floor(noteIndex / 12) - 1;
    const name = noteNames[((noteIndex % 12) + 12) % 12];
    const cents = Math.round((semitones - Math.round(semitones)) * 100);
    return `${name}${octave}${cents >= 0 ? '+' : ''}${cents}c`;
  }

  /**
   * Snap a frequency to the nearest chromatic semitone (equal temperament)
   */
  snapFrequency(freq) {
    const semitones = Math.round(12 * Math.log2(freq / 440));
    return 440 * Math.pow(2, semitones / 12);
  }

  /**
   * Start or update the sound for a given color
   */
  playColor(r, g, b) {
    this.init();

    const effective = this._effectiveInstrumentFor(r, g, b);

    // If switching instrument mid-play, stop so we start fresh with the new voice.
    if (this.isPlaying && this._activeInstrument && this._activeInstrument !== effective.instrument) {
      this.stop();
    }
    this._activeInstrument = effective.instrument;

    const { frequency, gain } = this.colorToSound(r, g, b);
    const now = this.ctx.currentTime;

    if (effective.instrument === 'basic') {
      this._playBasic(frequency, gain, now, effective.waveform);
    } else {
      this._playInstrument(frequency, gain, now, effective.instrument);
    }
  }

  /**
   * Basic oscillator mode (original behavior)
   */
  _playBasic(frequency, gain, now, waveform) {
    const wave = waveform || this.waveform;
    if (!this.isPlaying) {
      this.oscillator = this.ctx.createOscillator();
      this.gainNode = this.ctx.createGain();

      this.oscillator.type = wave;
      this.oscillator.frequency.setValueAtTime(frequency, now);
      this.gainNode.gain.setValueAtTime(0, now);
      this.gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.oscillator.start(now);
      this.isPlaying = true;
    } else {
      this.oscillator.frequency.linearRampToValueAtTime(frequency, now + this.rampTime);
      this.gainNode.gain.linearRampToValueAtTime(gain, now + this.rampTime);
      this.oscillator.type = wave;
    }
  }

  /**
   * Orchestral instrument mode using additive synthesis
   */
  _playInstrument(frequency, gain, now, instrumentName) {
    const name = instrumentName || this.instrument;
    const inst = this.instruments[name];
    if (!inst) return this._playBasic(frequency, gain, now);

    if (!this.isPlaying) {
      // Create master gain node
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0, now);

      // Create filter if defined
      let destination = this.gainNode;
      if (inst.filter) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = inst.filter.type;
        filter.frequency.setValueAtTime(inst.filter.frequency, now);
        filter.Q.setValueAtTime(inst.filter.Q, now);
        this.gainNode.connect(filter);
        filter.connect(this.analyser);
        this._activeFilter = filter;
      } else {
        this.gainNode.connect(this.analyser);
      }

      // Create oscillators for each harmonic partial
      this.activeNodes = [];
      const totalAmp = inst.harmonics.reduce((sum, h) => sum + h.amp, 0);

      for (const harmonic of inst.harmonics) {
        const osc = this.ctx.createOscillator();
        const partialGain = this.ctx.createGain();

        osc.type = harmonic.wave;
        osc.frequency.setValueAtTime(frequency * harmonic.ratio, now);
        partialGain.gain.setValueAtTime(harmonic.amp / totalAmp, now);

        osc.connect(partialGain);
        partialGain.connect(this.gainNode);
        osc.start(now);

        this.activeNodes.push({ osc, gain: partialGain, ratio: harmonic.ratio });
      }

      // Add vibrato LFO if defined
      if (inst.vibrato) {
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(inst.vibrato.rate, now);
        lfoGain.gain.setValueAtTime(inst.vibrato.depth, now);
        lfo.connect(lfoGain);
        // Connect LFO to all oscillator frequencies
        for (const node of this.activeNodes) {
          lfoGain.connect(node.osc.frequency);
        }
        lfo.start(now);
        this._lfo = lfo;
        this._lfoGain = lfoGain;
      }

      // Apply ADSR envelope (attack phase)
      const env = inst.envelope;
      this.gainNode.gain.setValueAtTime(0, now);
      this.gainNode.gain.linearRampToValueAtTime(gain, now + env.attack);
      this.gainNode.gain.linearRampToValueAtTime(gain * env.sustain, now + env.attack + env.decay);

      // Store the first oscillator as this.oscillator for compatibility
      this.oscillator = this.activeNodes[0]?.osc || null;
      this.isPlaying = true;
    } else {
      // Smooth transition: update all partial frequencies and master gain
      for (const node of this.activeNodes) {
        node.osc.frequency.linearRampToValueAtTime(
          frequency * node.ratio, now + this.rampTime
        );
      }
      this.gainNode.gain.linearRampToValueAtTime(gain * (inst.envelope.sustain || 0.7), now + this.rampTime);
    }
  }

  /**
   * Cluster colors into N groups by hue bin, returning averaged RGB per bin
   */
  _clusterColors(colors, numBins) {
    const bins = Array.from({ length: numBins }, () => ({ r: 0, g: 0, b: 0, count: 0 }));
    const binSize = 360 / numBins;

    for (const [r, g, b] of colors) {
      const hsl = this.rgbToHsl(r, g, b);
      const binIdx = Math.min(Math.floor(hsl.h / binSize), numBins - 1);
      bins[binIdx].r += r;
      bins[binIdx].g += g;
      bins[binIdx].b += b;
      bins[binIdx].count++;
    }

    return bins
      .filter(b => b.count > 0)
      .map(b => [
        Math.round(b.r / b.count),
        Math.round(b.g / b.count),
        Math.round(b.b / b.count)
      ]);
  }

  /**
   * Play a chord from multiple colors (for region selection).
   * Colors are clustered into distinct voices, each played simultaneously.
   * Returns an array of { frequency, gain, hsl } for display.
   */
  playColors(colors) {
    this.init();
    this.stopChord();
    this.stop();

    if (colors.length === 0) return [];

    // Cluster into up to maxVoices distinct color groups
    const clustered = this._clusterColors(colors, this.maxVoices);
    if (clustered.length === 0) return [];

    const now = this.ctx.currentTime;

    // Create a master gain for the chord, scaled by number of voices
    this.chordMaster = this.ctx.createGain();
    this.chordMaster.gain.setValueAtTime(1 / Math.sqrt(clustered.length), now);
    this.chordMaster.connect(this.analyser);

    const results = [];

    for (const [r, g, b] of clustered) {
      const sound = this.colorToSound(r, g, b);
      let freq = sound.frequency;
      if (this.snapToScale) {
        freq = this.snapFrequency(freq);
        freq = Math.max(this.minFreq, Math.min(this.maxFreq, freq));
      }

      results.push({ frequency: freq, gain: sound.gain, hsl: sound.hsl });

      // Create a voice for this cluster (per-color instrument if mapping enabled)
      this._createChordVoice(freq, sound.gain, now, r, g, b);
    }

    this.isChordPlaying = true;
    return results;
  }

  /**
   * Create a single chord voice (basic or instrument) connected to chordMaster
   */
  _createChordVoice(frequency, gain, now, r, g, b) {
    const effective = (r !== undefined)
      ? this._effectiveInstrumentFor(r, g, b)
      : { instrument: this.instrument, waveform: this.waveform };
    const inst = (effective.instrument !== 'basic') ? this.instruments[effective.instrument] : null;

    if (!inst) {
      // Basic waveform voice
      const osc = this.ctx.createOscillator();
      const gn = this.ctx.createGain();
      osc.type = effective.waveform;
      osc.frequency.setValueAtTime(frequency, now);
      gn.gain.setValueAtTime(0, now);
      gn.gain.linearRampToValueAtTime(gain, now + 0.02);
      osc.connect(gn);
      gn.connect(this.chordMaster);
      osc.start(now);
      this.chordVoices.push({ oscillators: [osc], gainNode: gn });
    } else {
      // Orchestral instrument voice
      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0, now);

      let output = voiceGain;
      let filter = null;
      if (inst.filter) {
        filter = this.ctx.createBiquadFilter();
        filter.type = inst.filter.type;
        filter.frequency.setValueAtTime(inst.filter.frequency, now);
        filter.Q.setValueAtTime(inst.filter.Q, now);
        voiceGain.connect(filter);
        filter.connect(this.chordMaster);
        output = voiceGain;
      } else {
        voiceGain.connect(this.chordMaster);
      }

      const oscillators = [];
      const totalAmp = inst.harmonics.reduce((sum, h) => sum + h.amp, 0);

      for (const harmonic of inst.harmonics) {
        const osc = this.ctx.createOscillator();
        const partialGain = this.ctx.createGain();
        osc.type = harmonic.wave;
        osc.frequency.setValueAtTime(frequency * harmonic.ratio, now);
        partialGain.gain.setValueAtTime(harmonic.amp / totalAmp, now);
        osc.connect(partialGain);
        partialGain.connect(voiceGain);
        osc.start(now);
        oscillators.push(osc);
      }

      // Vibrato LFO
      let lfo = null, lfoGain = null;
      if (inst.vibrato) {
        lfo = this.ctx.createOscillator();
        lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(inst.vibrato.rate, now);
        lfoGain.gain.setValueAtTime(inst.vibrato.depth, now);
        lfo.connect(lfoGain);
        for (const osc of oscillators) {
          lfoGain.connect(osc.frequency);
        }
        lfo.start(now);
      }

      // ADSR envelope
      const env = inst.envelope;
      voiceGain.gain.setValueAtTime(0, now);
      voiceGain.gain.linearRampToValueAtTime(gain, now + env.attack);
      voiceGain.gain.linearRampToValueAtTime(gain * env.sustain, now + env.attack + env.decay);

      this.chordVoices.push({ oscillators, gainNode: voiceGain, filter, lfo, lfoGain });
    }
  }

  /**
   * Stop all chord voices
   */
  stopChord() {
    if (!this.isChordPlaying && this.chordVoices.length === 0) return;

    const now = this.ctx?.currentTime || 0;
    // If color-family mapping is on, voices may span multiple instruments; use a
    // generous release so none clicks. Otherwise use the single instrument's release.
    let releaseTime = 0.05;
    if (this.colorMappingEnabled) {
      releaseTime = 0.8;
    } else if (this.instrument !== 'basic' && this.instruments[this.instrument]) {
      releaseTime = this.instruments[this.instrument].envelope.release;
    }

    const voicesToClean = [...this.chordVoices];
    const master = this.chordMaster;

    // Fade out each voice
    for (const voice of voicesToClean) {
      if (voice.gainNode) {
        voice.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);
      }
    }

    setTimeout(() => {
      for (const voice of voicesToClean) {
        for (const osc of voice.oscillators) {
          try { osc.stop(); } catch (e) {}
          try { osc.disconnect(); } catch (e) {}
        }
        if (voice.gainNode) try { voice.gainNode.disconnect(); } catch (e) {}
        if (voice.filter) try { voice.filter.disconnect(); } catch (e) {}
        if (voice.lfo) {
          try { voice.lfo.stop(); } catch (e) {}
          try { voice.lfo.disconnect(); } catch (e) {}
        }
        if (voice.lfoGain) try { voice.lfoGain.disconnect(); } catch (e) {}
      }
      if (master) try { master.disconnect(); } catch (e) {}
    }, (releaseTime + 0.05) * 1000);

    this.chordVoices = [];
    this.chordMaster = null;
    this.isChordPlaying = false;
  }

  /**
   * Stop all sound with a quick fade-out
   */
  stop() {
    this.stopChord();
    if (!this.isPlaying || !this.gainNode) return;

    const now = this.ctx.currentTime;
    const activeName = this._activeInstrument || this.instrument;
    const releaseTime = (activeName !== 'basic' && this.instruments[activeName])
      ? this.instruments[activeName].envelope.release
      : 0.05;

    this.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

    const nodesToClean = [...this.activeNodes];
    const osc = this.oscillator;
    const gn = this.gainNode;
    const filter = this._activeFilter;
    const lfo = this._lfo;
    const lfoGain = this._lfoGain;

    setTimeout(() => {
      // Stop all partial oscillators
      for (const node of nodesToClean) {
        try { node.osc.stop(); } catch (e) {}
        try { node.osc.disconnect(); } catch (e) {}
        try { node.gain.disconnect(); } catch (e) {}
      }
      // Stop basic oscillator if used
      if (osc && nodesToClean.length === 0) {
        try { osc.stop(); } catch (e) {}
        try { osc.disconnect(); } catch (e) {}
      }
      try { gn.disconnect(); } catch (e) {}
      if (filter) try { filter.disconnect(); } catch (e) {}
      if (lfo) {
        try { lfo.stop(); } catch (e) {}
        try { lfo.disconnect(); } catch (e) {}
      }
      if (lfoGain) try { lfoGain.disconnect(); } catch (e) {}
    }, (releaseTime + 0.05) * 1000);

    this.oscillator = null;
    this.gainNode = null;
    this.activeNodes = [];
    this._activeFilter = null;
    this._lfo = null;
    this._lfoGain = null;
    this._activeInstrument = null;
    this.isPlaying = false;
  }

  /**
   * Get analyser data for visualizer
   */
  getWaveformData() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }
}
