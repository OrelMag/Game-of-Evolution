const ENV_CONFIG = {
  arctic: {
    gradientTop:    '#0a1520',
    gradientBottom: '#1a2535',
    particleCount:  120,
    spawn(_canvas) {
      return {
        x:     Math.random(),
        y:     Math.random(),
        vx:    0,
        vy:    0.00006 + Math.random() * 0.00008,
        r:     1.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      };
    },
    update(p, dt) {
      p.y += p.vy * dt;
      p.x += Math.sin(p.phase + p.y * Math.PI * 4) * 0.00015 * dt;
      if (p.y > 1.02) { p.y = -0.02; p.x = Math.random(); }
      if (p.x < 0)    p.x += 1;
      if (p.x > 1)    p.x -= 1;
    },
    draw(ctx, p, W, H) {
      ctx.fillStyle = 'rgba(220,235,255,0.75)';
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  deepSea: {
    gradientTop:    '#000d1a',
    gradientBottom: '#001a2e',
    particleCount:  60,
    spawn(_canvas) {
      return {
        x:           Math.random(),
        y:           1.02 - Math.random() * 1.1,
        vy:          -(0.00004 + Math.random() * 0.00006),
        r:           2 + Math.random() * 3,
        alpha:       0.3 + Math.random() * 0.5,
        wobbleSpeed: 0.001 + Math.random() * 0.002,
        phase:       Math.random() * Math.PI * 2,
      };
    },
    update(p, dt) {
      p.y     += p.vy * dt;
      p.phase += p.wobbleSpeed * dt;
      p.x     += Math.sin(p.phase) * 0.00012 * dt;
      if (p.y < -0.05) { p.y = 1.02; p.x = Math.random(); }
    },
    draw(ctx, p, W, H) {
      ctx.save();
      ctx.shadowBlur  = p.r * 4;
      ctx.shadowColor = 'rgba(0,230,200,0.9)';
      ctx.fillStyle   = `rgba(0,210,190,${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },

  desert: {
    gradientTop:    '#1a0f00',
    gradientBottom: '#2e1a00',
    particleCount:  80,
    spawn(_canvas) {
      const isPuff = Math.random() < 0.1;
      return {
        isPuff,
        x:     -0.02,
        y:     0.1 + Math.random() * 0.85,
        vx:    isPuff ? (0.00004 + Math.random() * 0.00004) : (0.00010 + Math.random() * 0.00012),
        vy:    (Math.random() - 0.3) * 0.00003,
        r:     isPuff ? (4 + Math.random() * 5) : (1 + Math.random() * 1.5),
        alpha: isPuff ? (0.08 + Math.random() * 0.10) : (0.25 + Math.random() * 0.45),
      };
    },
    update(p, dt) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x > 1.05) { p.x = -0.02; p.y = 0.1 + Math.random() * 0.85; p.vy = (Math.random() - 0.3) * 0.00003; }
    },
    draw(ctx, p, W, H) {
      ctx.fillStyle = `rgba(200,160,90,${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  forest: {
    gradientTop:    '#060e08',
    gradientBottom: '#0c1a10',
    particleCount:  50,
    _colors: ['rgba(60,160,60,0.7)', 'rgba(100,200,50,0.65)', 'rgba(180,210,50,0.6)'],
    spawn(_canvas) {
      return {
        x:        Math.random(),
        y:        Math.random() * -0.1,
        vx:       (Math.random() - 0.5) * 0.00008,
        vy:       0.00005 + Math.random() * 0.00007,
        angle:    Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.003,
        rx:       3 + Math.random() * 4,
        ry:       1.5 + Math.random() * 2,
        colorIdx: Math.floor(Math.random() * 3),
      };
    },
    update(p, dt) {
      p.y     += p.vy * dt;
      p.x     += p.vx * dt;
      p.angle += p.rotSpeed * dt;
      if (p.x < 0 || p.x > 1) p.vx *= -1;
      if (p.y > 1.05) { p.y = -0.02; p.x = Math.random(); }
    },
    draw(ctx, p, W, H) {
      ctx.save();
      ctx.translate(p.x * W, p.y * H);
      ctx.rotate(p.angle);
      ctx.fillStyle = ENV_CONFIG.forest._colors[p.colorIdx];
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },

  volcanic: {
    gradientTop:    '#0a0500',
    gradientBottom: '#1a0800',
    particleCount:  90,
    _colors: ['#ff6010', '#ff4500', '#ffaa00', '#ff2200'],
    spawn(_canvas) {
      return {
        x:        0.2 + Math.random() * 0.6,
        y:        0.85 + Math.random() * 0.15,
        vx:       (Math.random() - 0.5) * 0.00010,
        vy:       -(0.00025 + Math.random() * 0.00030),
        r:        1 + Math.random() * 2,
        colorIdx: Math.floor(Math.random() * 4),
      };
    },
    update(p, dt) {
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      if (p.y < -0.05) {
        p.y        = 0.85 + Math.random() * 0.15;
        p.x        = 0.2  + Math.random() * 0.6;
        p.vx       = (Math.random() - 0.5) * 0.00010;
        p.vy       = -(0.00025 + Math.random() * 0.00030);
        p.colorIdx = Math.floor(Math.random() * 4);
      }
    },
    draw(ctx, p, W, H) {
      const alpha = Math.max(0, Math.min(0.9, p.y * 0.9));
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = ENV_CONFIG.volcanic._colors[p.colorIdx];
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  },
};

export class HabitatBackground {
  constructor(container) {
    this._canvas = document.createElement('canvas');
    this._canvas.id = 'habitat-bg';
    this._canvas.style.pointerEvents = 'none';
    container.insertBefore(this._canvas, container.firstChild);

    this._ctx       = this._canvas.getContext('2d');
    this._config    = null;
    this._particles = [];
    this._active    = false;
    this._rafId     = null;
    this._lastTs    = null;

    this._ro = new ResizeObserver(() => this._syncSize());
    this._ro.observe(container);
    this._syncSize();
  }

  setEnvironment(envKey) {
    this._config = ENV_CONFIG[envKey] ?? ENV_CONFIG.arctic;
    this._spawnParticles();
  }

  setActive(bool) {
    if (bool === this._active) return;
    this._active = bool;
    if (bool) {
      this._lastTs = null;
      this._rafId  = requestAnimationFrame(ts => this._loop(ts));
    } else {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }

  destroy() {
    this.setActive(false);
    this._ro.disconnect();
    this._canvas.remove();
  }

  _syncSize() {
    const { width, height } = this._canvas.parentElement.getBoundingClientRect();
    this._canvas.width  = Math.max(1, Math.floor(width));
    this._canvas.height = Math.max(1, Math.floor(height));
    if (this._config) this._spawnParticles();
  }

  _spawnParticles() {
    this._particles = Array.from(
      { length: this._config.particleCount },
      () => this._config.spawn(this._canvas)
    );
  }

  _loop(ts) {
    if (!this._active) return;
    const dt = this._lastTs === null ? 16 : Math.min(ts - this._lastTs, 50);
    this._lastTs = ts;

    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const cfg = this._config;
    const ctx = this._ctx;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, cfg.gradientTop);
    grad.addColorStop(1, cfg.gradientBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (const p of this._particles) {
      cfg.update(p, dt, this._canvas);
      cfg.draw(ctx, p, W, H);
    }

    this._rafId = requestAnimationFrame(ts => this._loop(ts));
  }
}
