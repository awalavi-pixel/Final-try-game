import * as THREE from 'three';

interface CheckpointData {
  missionId: string;
  missionIndex: number;
  position: { x: number; y: number; z: number };
  health: number;
  ammo: { current: number; reserve: number }[];
  objectiveState: Record<string, boolean>;
  timestamp: number;
}

export class CheckpointSystem {
  private static readonly STORAGE_KEY = 'ghost_reboot_checkpoint';
  private static readonly AUTO_SAVE_INTERVAL = 90; // seconds

  private lastSaveTime = 0;
  private onRespawn: ((data: CheckpointData) => void) | null = null;
  private fadeEl: HTMLElement;

  constructor() {
    this.fadeEl = document.createElement('div');
    this.fadeEl.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:#000;opacity:0;pointer-events:none;z-index:1000;
      transition:opacity 0.8s ease;
    `;
    document.body.appendChild(this.fadeEl);
  }

  setRespawnCallback(fn: (data: CheckpointData) => void): void {
    this.onRespawn = fn;
  }

  save(
    missionId: string,
    missionIndex: number,
    position: THREE.Vector3,
    health: number,
    ammo: { current: number; reserve: number }[],
    objectiveState: Record<string, boolean>
  ): void {
    const data: CheckpointData = {
      missionId,
      missionIndex,
      position: { x: position.x, y: position.y, z: position.z },
      health,
      ammo,
      objectiveState,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(CheckpointSystem.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable
    }
  }

  load(): CheckpointData | null {
    try {
      const raw = localStorage.getItem(CheckpointSystem.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as CheckpointData;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(CheckpointSystem.STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  update(dt: number, gameTime: number, saveCallback: () => void): void {
    if (gameTime - this.lastSaveTime >= CheckpointSystem.AUTO_SAVE_INTERVAL) {
      this.lastSaveTime = gameTime;
      saveCallback();
    }
    void dt;
  }

  triggerDeath(onComplete: () => void): void {
    this.fadeEl.style.transition = 'opacity 0.8s ease';
    this.fadeEl.style.opacity = '1';
    this.fadeEl.style.pointerEvents = 'all';

    setTimeout(() => {
      onComplete();
      setTimeout(() => {
        this.fadeEl.style.opacity = '0';
        this.fadeEl.style.pointerEvents = 'none';
      }, 300);
    }, 800);
  }

  showCheckpointReached(): void {
    const msg = document.createElement('div');
    msg.style.cssText = `
      position:fixed;top:20%;left:50%;transform:translateX(-50%);
      font-family:'Courier New',monospace;font-size:18px;color:#88ff88;
      text-shadow:0 0 8px #00ff00;letter-spacing:3px;
      pointer-events:none;z-index:500;
      animation:fadeInOut 2s ease forwards;
    `;
    msg.textContent = 'CHECKPOINT';
    const style = document.createElement('style');
    style.textContent = '@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-10px);}20%{opacity:1;transform:translateX(-50%) translateY(0);}80%{opacity:1;}100%{opacity:0;}}';
    document.head.appendChild(style);
    document.body.appendChild(msg);
    setTimeout(() => { msg.remove(); style.remove(); }, 2000);
  }
}
