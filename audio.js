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

    // For smooth transitions
    this.targetFreq = 0;
    this.targetGain = 0;
    this.rampTime = 0.05;
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
   * Start or update the sound for a given color
   */
  playColor(r, g, b) {
    this.init();

    const { frequency, gain } = this.colorToSound(r, g, b);
    const now = this.ctx.currentTime;

    if (!this.isPlaying) {
      // Create new oscillator
      this.oscillator = this.ctx.createOscillator();
      this.gainNode = this.ctx.createGain();

      this.oscillator.type = this.waveform;
      this.oscillator.frequency.setValueAtTime(frequency, now);
      this.gainNode.gain.setValueAtTime(0, now);
      this.gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.oscillator.start(now);
      this.isPlaying = true;
    } else {
      // Smooth transition to new frequency/gain
      this.oscillator.frequency.linearRampToValueAtTime(frequency, now + this.rampTime);
      this.gainNode.gain.linearRampToValueAtTime(gain, now + this.rampTime);
      this.oscillator.type = this.waveform;
    }
  }

  /**
   * Play a chord from multiple colors (for region selection)
   */
  playColors(colors) {
    this.init();
    this.stop();

    if (colors.length === 0) return;

    // Average the colors to get one sound
    let totalR = 0, totalG = 0, totalB = 0;
    for (const [r, g, b] of colors) {
      totalR += r;
      totalG += g;
      totalB += b;
    }
    const avgR = totalR / colors.length;
    const avgG = totalG / colors.length;
    const avgB = totalB / colors.length;

    this.playColor(avgR, avgG, avgB);
    return this.colorToSound(avgR, avgG, avgB);
  }

  /**
   * Stop all sound with a quick fade-out
   */
  stop() {
    if (!this.isPlaying || !this.gainNode) return;

    const now = this.ctx.currentTime;
    this.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);

    const osc = this.oscillator;
    const gn = this.gainNode;
    setTimeout(() => {
      try { osc.stop(); } catch (e) {}
      try { osc.disconnect(); } catch (e) {}
      try { gn.disconnect(); } catch (e) {}
    }, 80);

    this.oscillator = null;
    this.gainNode = null;
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
