export function formatMs(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const milli = ms % 1000;

  return {
    min: String(min).padStart(2, '0'),
    sec: String(sec).padStart(2, '0'),
    ms: String(milli).padStart(3, '0'),
    full: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(milli).padStart(3, '0')}`
  };
}

export class CountdownTimer {
  constructor({ onTick, onExpire }) {
    this.onTick = onTick || (() => {});
    this.onExpire = onExpire || (() => {});
    this.timeLeftAtSync = 0;
    this.syncPerf = 0;
    this.frozen = false;
    this.animId = null;
    this.running = false;
    this.wakeLock = null;
  }

  sync(timeLeftMs, isFrozen = false) {
    this.timeLeftAtSync = Math.max(0, timeLeftMs);
    this.syncPerf = performance.now();
    this.frozen = !!isFrozen;

    if (!this.running && !this.frozen) {
      this.start();
    } else {
      this.tick();
    }
  }

  start() {
    this.running = true;
    this.requestWakeLock();

    const loop = () => {
      if (!this.running) return;
      this.tick();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.releaseWakeLock();
  }

  tick() {
    let currentLeftMs = this.timeLeftAtSync;
    if (!this.frozen) {
      const elapsedSinceSync = performance.now() - this.syncPerf;
      currentLeftMs = Math.max(0, this.timeLeftAtSync - elapsedSinceSync);
    }

    const formatted = formatMs(currentLeftMs);
    let colorClass = 'text-primary-light';
    let pulseClass = '';

    if (currentLeftMs < 60000) {
      colorClass = 'text-danger';
      pulseClass = 'animate-pulse-subtle';
    } else if (currentLeftMs < 300000) {
      colorClass = 'text-warn';
    }

    this.onTick({
      ms: currentLeftMs,
      formatted,
      colorClass,
      pulseClass,
      frozen: this.frozen
    });

    if (currentLeftMs <= 0 && !this.frozen) {
      this.stop();
      this.onExpire();
    }
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch {}
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
  }
}

