class CanvasManager {
  constructor(imageCanvas, overlayCanvas, wrapper) {
    this.imageCanvas = imageCanvas;
    this.overlayCanvas = overlayCanvas;
    this.wrapper = wrapper;
    this.imageCtx = imageCanvas.getContext('2d', { willReadFrequently: true });
    this.overlayCtx = overlayCanvas.getContext('2d');

    this.image = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // Interaction state
    this.mode = 'click'; // 'click', 'region', 'scan'
    this.isMouseDown = false;
    this.regionStart = null;
    this.regionEnd = null;
    this.scanX = 0;
    this.scanAnimId = null;
    this.scanSpeed = 5;

    // Callbacks
    this.onColorPick = null;    // (r, g, b, x, y) => {}
    this.onRegionPick = null;   // (colors[]) => {}
    this.onScanColumn = null;   // (colors[]) => {}
    this.onInteractionEnd = null; // () => {}

    this._bindEvents();
  }

  _bindEvents() {
    this.wrapper.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.wrapper.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.wrapper.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.wrapper.addEventListener('mouseleave', (e) => this._onMouseLeave(e));

    // Touch support
    this.wrapper.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this._onMouseDown(touch);
    });
    this.wrapper.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this._onMouseMove(touch);
    });
    this.wrapper.addEventListener('touchend', (e) => {
      this._onMouseUp(e);
    });
  }

  _getCanvasPos(e) {
    const rect = this.imageCanvas.getBoundingClientRect();
    return {
      x: Math.floor(e.clientX - rect.left),
      y: Math.floor(e.clientY - rect.top)
    };
  }

  _getPixel(x, y) {
    if (x < 0 || y < 0 || x >= this.imageCanvas.width || y >= this.imageCanvas.height) return null;
    const data = this.imageCtx.getImageData(x, y, 1, 1).data;
    return [data[0], data[1], data[2]];
  }

  _getRegionColors(x1, y1, x2, y2) {
    const left = Math.max(0, Math.min(x1, x2));
    const top = Math.max(0, Math.min(y1, y2));
    const right = Math.min(this.imageCanvas.width, Math.max(x1, x2));
    const bottom = Math.min(this.imageCanvas.height, Math.max(y1, y2));
    const w = right - left;
    const h = bottom - top;

    if (w <= 0 || h <= 0) return [];

    const imageData = this.imageCtx.getImageData(left, top, w, h);
    const colors = [];
    // Sample every Nth pixel for performance
    const step = Math.max(1, Math.floor(Math.sqrt(w * h) / 20));
    for (let i = 0; i < imageData.data.length; i += step * 4) {
      colors.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
    }
    return colors;
  }

  _getColumnColors(x) {
    if (x < 0 || x >= this.imageCanvas.width) return [];
    const h = this.imageCanvas.height;
    const imageData = this.imageCtx.getImageData(x, 0, 1, h);
    const colors = [];
    const step = Math.max(1, Math.floor(h / 20));
    for (let y = 0; y < h; y += step) {
      const i = y * 4;
      colors.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
    }
    return colors;
  }

  _onMouseDown(e) {
    if (!this.image) return;
    this.isMouseDown = true;
    const pos = this._getCanvasPos(e);

    if (this.mode === 'click') {
      const pixel = this._getPixel(pos.x, pos.y);
      if (pixel && this.onColorPick) {
        this.onColorPick(pixel[0], pixel[1], pixel[2], pos.x, pos.y);
      }
    } else if (this.mode === 'region') {
      this.regionStart = pos;
      this.regionEnd = pos;
      this._drawRegionOverlay();
    } else if (this.mode === 'scan') {
      this._startScan(pos.x);
    }
  }

  _onMouseMove(e) {
    if (!this.image) return;
    const pos = this._getCanvasPos(e);

    if (this.mode === 'click' && this.isMouseDown) {
      const pixel = this._getPixel(pos.x, pos.y);
      if (pixel && this.onColorPick) {
        this.onColorPick(pixel[0], pixel[1], pixel[2], pos.x, pos.y);
      }
    } else if (this.mode === 'region' && this.isMouseDown) {
      this.regionEnd = pos;
      this._drawRegionOverlay();
      // Live audio feedback for region
      const colors = this._getRegionColors(
        this.regionStart.x, this.regionStart.y,
        this.regionEnd.x, this.regionEnd.y
      );
      if (colors.length && this.onRegionPick) {
        this.onRegionPick(colors);
      }
    }
  }

  _onMouseUp(e) {
    if (this.mode === 'region' && this.isMouseDown && this.regionStart && this.regionEnd) {
      const colors = this._getRegionColors(
        this.regionStart.x, this.regionStart.y,
        this.regionEnd.x, this.regionEnd.y
      );
      if (colors.length && this.onRegionPick) {
        this.onRegionPick(colors);
      }
    }

    if (this.mode === 'click' && this.isMouseDown) {
      if (this.onInteractionEnd) this.onInteractionEnd();
    }

    this.isMouseDown = false;
  }

  _onMouseLeave(e) {
    if (this.isMouseDown && this.mode === 'click') {
      this.isMouseDown = false;
      if (this.onInteractionEnd) this.onInteractionEnd();
    }
  }

  _drawRegionOverlay() {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    if (!this.regionStart || !this.regionEnd) return;

    const x = Math.min(this.regionStart.x, this.regionEnd.x);
    const y = Math.min(this.regionStart.y, this.regionEnd.y);
    const w = Math.abs(this.regionEnd.x - this.regionStart.x);
    const h = Math.abs(this.regionEnd.y - this.regionStart.y);

    this.overlayCtx.strokeStyle = '#7c6ff7';
    this.overlayCtx.lineWidth = 2;
    this.overlayCtx.fillStyle = 'rgba(124, 111, 247, 0.15)';
    this.overlayCtx.fillRect(x, y, w, h);
    this.overlayCtx.strokeRect(x, y, w, h);
  }

  _startScan(startX) {
    this.stopScan();
    this.scanX = startX || 0;
    const width = this.imageCanvas.width;
    const pxPerFrame = (this.scanSpeed / 5) * 2; // scale: speed 5 = 2px/frame

    const step = () => {
      if (this.scanX >= width) {
        this.stopScan();
        if (this.onInteractionEnd) this.onInteractionEnd();
        return;
      }

      // Draw scan line
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      this.overlayCtx.strokeStyle = '#7c6ff7';
      this.overlayCtx.lineWidth = 2;
      this.overlayCtx.shadowColor = 'rgba(124, 111, 247, 0.6)';
      this.overlayCtx.shadowBlur = 8;
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(this.scanX, 0);
      this.overlayCtx.lineTo(this.scanX, this.overlayCanvas.height);
      this.overlayCtx.stroke();
      this.overlayCtx.shadowBlur = 0;

      // Get column colors
      const colors = this._getColumnColors(Math.floor(this.scanX));
      if (colors.length && this.onScanColumn) {
        this.onScanColumn(colors);
      }

      this.scanX += pxPerFrame;
      this.scanAnimId = requestAnimationFrame(step);
    };

    this.scanAnimId = requestAnimationFrame(step);
  }

  stopScan() {
    if (this.scanAnimId) {
      cancelAnimationFrame(this.scanAnimId);
      this.scanAnimId = null;
    }
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.image = img;
          this._fitImage();
          this.wrapper.classList.add('has-image');
          resolve();
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  _fitImage() {
    if (!this.image) return;

    const wrapperRect = this.wrapper.getBoundingClientRect();
    const maxW = wrapperRect.width - 4; // account for border
    const maxH = wrapperRect.height - 4;

    const imgW = this.image.width;
    const imgH = this.image.height;

    this.scale = Math.min(maxW / imgW, maxH / imgH, 1);
    const displayW = Math.floor(imgW * this.scale);
    const displayH = Math.floor(imgH * this.scale);

    this.imageCanvas.width = displayW;
    this.imageCanvas.height = displayH;
    this.overlayCanvas.width = displayW;
    this.overlayCanvas.height = displayH;

    this.imageCtx.imageSmoothingEnabled = true;
    this.imageCtx.drawImage(this.image, 0, 0, displayW, displayH);
  }

  clear() {
    this.image = null;
    this.imageCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.imageCanvas.width = 0;
    this.imageCanvas.height = 0;
    this.overlayCanvas.width = 0;
    this.overlayCanvas.height = 0;
    this.wrapper.classList.remove('has-image');
    this.stopScan();
  }

  resize() {
    if (this.image) {
      this._fitImage();
    }
  }
}
