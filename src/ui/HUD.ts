import type { Player } from '../gameplay/Player';

interface DamageArc {
  angle: number;
  timer: number;
}

export class HUD {
  private container: HTMLElement;
  private ammoEl: HTMLElement;
  private healthEl: HTMLElement;
  private crosshairEl: HTMLElement;
  private hitMarkerEl: HTMLElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private vignetteEl: HTMLElement;
  private subtitleEl: HTMLElement;
  private damageArcs: DamageArc[] = [];
  private damageArcEls: HTMLElement[] = [];
  private hitMarkerTimer = 0;
  private hitMarkerKill = false;
  private crosshairSpread = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.innerHTML = '';
    this.container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';

    this.ammoEl = this.create('div', `
      position:absolute;bottom:40px;left:30px;
      font-family:'Courier New',monospace;font-size:22px;color:#fff;
      text-shadow:0 0 4px #000,0 0 8px #000;letter-spacing:2px;
    `);
    this.healthEl = this.create('div', `
      position:absolute;bottom:70px;left:30px;
      font-family:'Courier New',monospace;font-size:16px;color:#88ff88;
      text-shadow:0 0 4px #000;
    `);

    // Crosshair
    this.crosshairEl = this.create('div', `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:20px;height:20px;pointer-events:none;
    `);
    this.crosshairEl.innerHTML = `
      <div style="position:absolute;top:50%;left:0;right:0;height:2px;background:#fff;transform:translateY(-50%);opacity:0.8;box-shadow:0 0 2px #000;"></div>
      <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:#fff;transform:translateX(-50%);opacity:0.8;box-shadow:0 0 2px #000;"></div>
      <div id="ch-top" style="position:absolute;left:50%;transform:translateX(-50%);width:2px;height:6px;background:#fff;top:0;opacity:0.9;"></div>
      <div id="ch-bot" style="position:absolute;left:50%;transform:translateX(-50%);width:2px;height:6px;background:#fff;bottom:0;opacity:0.9;"></div>
      <div id="ch-left" style="position:absolute;top:50%;transform:translateY(-50%);width:6px;height:2px;background:#fff;left:0;opacity:0.9;"></div>
      <div id="ch-right" style="position:absolute;top:50%;transform:translateY(-50%);width:6px;height:2px;background:#fff;right:0;opacity:0.9;"></div>
    `;

    // Hit marker
    this.hitMarkerEl = this.create('div', `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:20px;height:20px;pointer-events:none;opacity:0;
    `);
    this.hitMarkerEl.innerHTML = `
      <div style="position:absolute;top:0;left:50%;width:2px;height:8px;transform:translateX(-50%) rotate(45deg);"></div>
      <div style="position:absolute;top:0;left:50%;width:2px;height:8px;transform:translateX(-50%) rotate(-45deg);"></div>
      <div style="position:absolute;bottom:0;left:50%;width:2px;height:8px;transform:translateX(-50%) rotate(45deg);"></div>
      <div style="position:absolute;bottom:0;left:50%;width:2px;height:8px;transform:translateX(-50%) rotate(-45deg);"></div>
    `;

    // Minimap
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 150;
    this.minimapCanvas.height = 150;
    this.minimapCanvas.style.cssText = `
      position:absolute;bottom:30px;right:30px;
      width:150px;height:150px;
      border-radius:50%;border:2px solid rgba(255,255,255,0.4);
      background:rgba(0,0,0,0.5);
    `;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.container.appendChild(this.minimapCanvas);

    // Vignette
    this.vignetteEl = this.create('div', `
      position:absolute;top:0;left:0;right:0;bottom:0;
      background:radial-gradient(ellipse at center,transparent 50%,rgba(200,0,0,0) 100%);
      pointer-events:none;opacity:0;transition:opacity 0.3s;
    `);

    // Subtitle
    this.subtitleEl = this.create('div', `
      position:absolute;bottom:120px;left:50%;transform:translateX(-50%);
      font-family:'Courier New',monospace;font-size:14px;color:#ddd;
      text-shadow:0 0 4px #000;background:rgba(0,0,0,0.4);
      padding:4px 12px;border-radius:3px;opacity:0;transition:opacity 0.3s;
      max-width:600px;text-align:center;
    `);

    // Pointer lock hint
    const lockHint = this.create('div', `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      font-family:'Courier New',monospace;font-size:18px;color:#fff;
      text-shadow:0 0 8px #000;text-align:center;pointer-events:none;
      background:rgba(0,0,0,0.6);padding:16px 24px;border-radius:6px;
    `);
    lockHint.id = 'pointer-lock-hint';
    lockHint.innerHTML = 'Click to play<br><small style="font-size:12px;color:#aaa">WASD move · Mouse look · LMB fire · RMB ADS · R reload · G grenade</small>';
    this.container.appendChild(lockHint);

    document.addEventListener('pointerlockchange', () => {
      const hint = document.getElementById('pointer-lock-hint');
      if (hint) hint.style.display = document.pointerLockElement ? 'none' : 'block';
    });
  }

  private create(tag: string, css: string): HTMLElement {
    const el = document.createElement(tag);
    el.style.cssText = css;
    this.container.appendChild(el);
    return el;
  }

  update(dt: number, player: Player): void {
    const weapon = player.currentWeapon;
    if (weapon) {
      const ammoColor = weapon.currentAmmo <= 5 ? '#ff4444' : '#ffffff';
      this.ammoEl.style.color = ammoColor;
      this.ammoEl.textContent = `${weapon.currentAmmo} / ${weapon.reserveAmmo}`;
    } else {
      this.ammoEl.textContent = '';
    }

    // Health
    const hp = Math.max(0, Math.floor(player.health));
    const hpColor = hp < 30 ? '#ff4444' : hp < 60 ? '#ffaa44' : '#88ff88';
    this.healthEl.style.color = hpColor;
    this.healthEl.textContent = `HP: ${hp}`;

    // Low health vignette
    if (hp < 30) {
      const pulse = Math.abs(Math.sin(performance.now() / 400));
      this.vignetteEl.style.opacity = String((0.3 + pulse * 0.3) * (1 - hp / 30));
      this.vignetteEl.style.background = `radial-gradient(ellipse at center,transparent 40%,rgba(200,0,0,${0.4 + pulse * 0.3}) 100%)`;
    } else {
      this.vignetteEl.style.opacity = '0';
    }

    // Hit marker
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      this.hitMarkerEl.style.opacity = String(Math.min(1, this.hitMarkerTimer / 0.05));
      const color = this.hitMarkerKill ? '#ff0000' : '#ffffff';
      this.hitMarkerEl.querySelectorAll('div').forEach(d => { (d as HTMLElement).style.background = color; });
    } else {
      this.hitMarkerEl.style.opacity = '0';
    }

    // Crosshair spread
    this.crosshairSpread *= Math.pow(0.1, dt);
    const spread = 8 + this.crosshairSpread;
    const ch = this.crosshairEl;
    const chTop = ch.querySelector('#ch-top') as HTMLElement;
    const chBot = ch.querySelector('#ch-bot') as HTMLElement;
    const chLeft = ch.querySelector('#ch-left') as HTMLElement;
    const chRight = ch.querySelector('#ch-right') as HTMLElement;
    if (chTop) { chTop.style.top = `-${spread}px`; }
    if (chBot) { chBot.style.bottom = `-${spread}px`; }
    if (chLeft) { chLeft.style.left = `-${spread}px`; }
    if (chRight) { chRight.style.right = `-${spread}px`; }

    // ADS hide crosshair
    const adsProgress = player.currentWeapon?.getADSProgress() ?? 0;
    this.crosshairEl.style.opacity = String(1 - adsProgress * 0.8);

    // Damage arcs
    for (let i = this.damageArcs.length - 1; i >= 0; i--) {
      this.damageArcs[i].timer -= dt;
      if (this.damageArcs[i].timer <= 0) {
        this.damageArcs.splice(i, 1);
        if (this.damageArcEls[i]) {
          this.damageArcEls[i].remove();
          this.damageArcEls.splice(i, 1);
        }
      } else if (this.damageArcEls[i]) {
        this.damageArcEls[i].style.opacity = String(this.damageArcs[i].timer);
      }
    }
  }

  showHitMarker(isKill: boolean): void {
    this.hitMarkerTimer = 0.3;
    this.hitMarkerKill = isKill;
  }

  addCrosshairSpread(amount: number): void {
    this.crosshairSpread += amount;
  }

  showDamageArc(fromAngle: number): void {
    this.damageArcs.push({ angle: fromAngle, timer: 1.0 });
    const arc = document.createElement('div');
    arc.style.cssText = `
      position:absolute;top:50%;left:50%;
      width:120px;height:120px;
      transform:translate(-50%,-50%) rotate(${fromAngle}deg);
      border-top:4px solid rgba(255,0,0,0.8);border-radius:50%;
      pointer-events:none;
    `;
    this.container.appendChild(arc);
    this.damageArcEls.push(arc);
  }

  updateMinimap(playerX: number, playerZ: number, playerYaw: number, enemies: Array<{ x: number; z: number }>): void {
    const ctx = this.minimapCtx;
    const w = 150, h = 150, cx = 75, cy = 75;

    ctx.clearRect(0, 0, w, h);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 73, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = 'rgba(20,30,20,0.8)';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(100,120,100,0.3)';
    ctx.lineWidth = 1;
    const scale = 1.5; // pixels per meter
    const gridSpacing = 10 * scale;
    const offX = cx - playerX * scale;
    const offZ = cy - playerZ * scale;
    for (let x = offX % gridSpacing; x < w; x += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = offZ % gridSpacing; y < h; y += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Enemies
    for (const enemy of enemies) {
      const ex = cx + (enemy.x - playerX) * scale;
      const ey = cy + (enemy.z - playerZ) * scale;
      if (ex < 0 || ex > w || ey < 0 || ey > h) continue;
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
    }

    // Player dot with direction
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerYaw);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fillStyle = '#44ff44';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  showSubtitle(text: string, duration = 3.0): void {
    this.subtitleEl.textContent = text;
    this.subtitleEl.style.opacity = '1';
    setTimeout(() => {
      this.subtitleEl.style.opacity = '0';
    }, duration * 1000);
  }

  showMessage(text: string, duration = 2.0): void {
    const msg = document.createElement('div');
    msg.style.cssText = `
      position:absolute;top:30%;left:50%;transform:translateX(-50%);
      font-family:'Courier New',monospace;font-size:20px;color:#ffffff;
      text-shadow:0 0 8px #ff0000;background:rgba(0,0,0,0.5);
      padding:8px 16px;border-radius:4px;text-align:center;
      pointer-events:none;z-index:20;
    `;
    msg.textContent = text;
    this.container.appendChild(msg);
    setTimeout(() => msg.remove(), duration * 1000);
  }
}
