# Color Listener

Upload an image. Click or drag to hear its colors.

Color Listener is an interactive web app that converts the colors in any image into sound through real-time audio synthesis. Click a pixel to hear its hue, drag to play a chord from a region, or scan across the image like a musical score.

## Features

- **Three interaction modes** — Click individual pixels, select a region for chord playback, or auto-scan left to right
- **26 instruments** — Basic waveforms (sine, triangle, sawtooth, square), strings, woodwinds, brass, and percussion, each with realistic harmonic partials and ADSR envelopes
- **Frequency mapping** — Map color to pitch by hue, brightness, or full HSL
- **Polyphonic chords** — Region and scan modes cluster colors by hue and play up to 6 simultaneous voices
- **Snap to Scale** — Lock output frequencies to the chromatic scale
- **Waveform visualizer** — Real-time display of the audio output
- **Touch support** — Works on mobile and tablet

## Getting Started

```bash
npm run dev
```

This installs dependencies and starts a local server on [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Vanilla JavaScript
- Web Audio API (synthesis, envelopes, filters, vibrato)
- HTML5 Canvas (image rendering and interaction)
- live-server (development)

## License

ISC
