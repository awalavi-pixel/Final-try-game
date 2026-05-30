import * as THREE from 'three';
import type { WeaponStats } from './WeaponStats';
import type { AudioManager } from '../audio/AudioManager';

export interface BulletHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  objectId: string;
  hitZone: 'head' | 'torso' | 'limb';
}

export class WeaponBase {
  stats: WeaponStats;
  currentAmmo: number;
  reserveAmmo: number;

  private fireCooldown = 0;
  private reloadTimer = 0;
  private isReloading = false;
  private isBursting = false;
  private burstShotsLeft = 0;
  private burstCooldown = 0;
  private recoilIndex = 0;
  private adsProgress = 0; // 0=hip, 1=ADS
  private muzzleFlashTimer = 0;
  private totalShotsFired = 0;

  mesh: THREE.Group;
  private muzzleFlash: THREE.Mesh;

  // Recoil accumulation
  recoilX = 0;
  recoilY = 0;

  private audioManager: AudioManager | null = null;
  private scene: THREE.Scene | null = null;
  private particlePool: THREE.Mesh[] = [];

  constructor(stats: WeaponStats) {
    this.stats = stats;
    this.currentAmmo = stats.magazineSize;
    this.reserveAmmo = stats.reserveAmmo;
    this.mesh = this.buildMesh();
    this.muzzleFlash = this.buildMuzzleFlash();
    this.mesh.add(this.muzzleFlash);
  }

  setAudioManager(am: AudioManager): void {
    this.audioManager = am;
  }

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  private buildMesh(): THREE.Group {
    const group = new THREE.Group();
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.08, 0.1, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);
    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.8 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.42);
    group.add(barrel);
    // Stock
    const stockGeo = new THREE.BoxGeometry(0.07, 0.09, 0.18);
    const stock = new THREE.Mesh(stockGeo, bodyMat);
    stock.position.set(0, -0.01, 0.28);
    group.add(stock);
    // Grip
    const gripGeo = new THREE.BoxGeometry(0.055, 0.12, 0.06);
    const grip = new THREE.Mesh(gripGeo, bodyMat);
    grip.position.set(0, -0.1, 0.1);
    group.add(grip);
    // Mag
    const magGeo = new THREE.BoxGeometry(0.04, 0.12, 0.07);
    const magMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(0, -0.12, 0);
    group.add(mag);

    group.position.set(0.18, -0.22, -0.35);
    return group;
  }

  private buildMuzzleFlash(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const flash = new THREE.Mesh(geo, mat);
    flash.position.set(0, 0, -0.6);
    return flash;
  }

  update(dt: number, input: { fire: boolean; ads: boolean; reload: boolean }): void {
    // ADS
    const targetAds = input.ads ? 1 : 0;
    this.adsProgress += (targetAds - this.adsProgress) * Math.min(1, dt / this.stats.adsTime);

    // Cooldown
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.burstCooldown > 0) this.burstCooldown -= dt;

    // Recoil recovery
    this.recoilX *= Math.pow(0.02, dt);
    this.recoilY *= Math.pow(0.05, dt);

    // Muzzle flash fade
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      const mat = this.muzzleFlash.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, this.muzzleFlashTimer / 0.05);
    }

    // Reload
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }

    // Auto reload trigger
    if (input.reload && !this.isReloading && this.currentAmmo < this.stats.magazineSize && this.reserveAmmo > 0) {
      this.startReload();
    }

    // Burst continuation (no ammo decrement here — handled by tryFireExternal)
    if (this.isBursting && this.burstShotsLeft > 0 && this.burstCooldown <= 0) {
      this.isBursting = false; // let external caller handle next burst shot
    } else if (this.burstShotsLeft <= 0) {
      this.isBursting = false;
    }
    // NOTE: actual firing (ammo, cooldown, recoil) is driven by main.ts via tryFireExternal()

    // Weapon bob in hip
    const time = performance.now() / 1000;
    this.mesh.position.set(
      0.18 + Math.sin(time * 5) * 0.003 * (1 - this.adsProgress),
      -0.22 + Math.abs(Math.sin(time * 5)) * 0.004 * (1 - this.adsProgress),
      -0.35
    );
  }

  private tryFire(): void {
    if (this.currentAmmo <= 0) {
      if (this.reserveAmmo > 0) this.startReload();
      else this.audioManager?.playDryFire();
      return;
    }
    this.executeFire();
    const fireInterval = 60 / this.stats.rpm;
    this.fireCooldown = fireInterval;
  }

  private startBurst(): void {
    if (this.currentAmmo <= 0) {
      if (this.reserveAmmo > 0) this.startReload();
      return;
    }
    this.isBursting = true;
    this.burstShotsLeft = this.stats.burstCount ?? 3;
    this.executeFire();
    this.fireCooldown = 60 / 1000; // tight burst
  }

  private executeFire(): BulletHit | null {
    if (this.currentAmmo <= 0) {
      this.isBursting = false;
      this.burstShotsLeft = 0;
      return null;
    }
    this.currentAmmo--;
    this.burstShotsLeft--;
    this.burstCooldown = 0.05;
    this.totalShotsFired++;

    // Recoil
    const patLen = this.stats.recoilPattern.length;
    const idx = this.recoilIndex % patLen;
    const p = this.stats.recoilPattern[idx];
    this.recoilX += p.x * (1 - this.adsProgress * 0.5);
    this.recoilY += p.y * (1 - this.adsProgress * 0.5);
    this.recoilIndex++;

    // Muzzle flash
    this.muzzleFlashTimer = 0.05;
    (this.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1;

    // Audio
    this.audioManager?.playGunshot(this.stats.id, this.stats.suppressedDefault ?? false);

    return null;
  }

  raycast(camera: THREE.Camera, scene: THREE.Scene): BulletHit | null {
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    // Spread
    const spread = this.adsProgress > 0.9 ? this.stats.spreadADS : this.stats.spreadBase;
    const spreadX = (Math.random() - 0.5) * spread;
    const spreadY = (Math.random() - 0.5) * spread;

    const dir = new THREE.Vector3(spreadX, spreadY, -1).normalize();
    dir.applyQuaternion(camera.quaternion);

    raycaster.set(camera.position.clone(), dir);
    raycaster.far = 500;

    const meshes: THREE.Mesh[] = [];
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh && obj.userData['collidable']) {
        meshes.push(obj);
      }
    });

    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const hit = hits[0];
      const zone = hit.object.userData['hitZone'] as string ?? 'torso';
      return {
        point: hit.point,
        normal: hit.face?.normal ?? new THREE.Vector3(0, 1, 0),
        distance: hit.distance,
        objectId: hit.object.uuid,
        hitZone: zone === 'head' ? 'head' : zone === 'limb' ? 'limb' : 'torso'
      };
    }

    // Simple screen center raycaster
    raycaster.setFromCamera(center, camera as THREE.PerspectiveCamera);
    const allHits = raycaster.intersectObjects(meshes, false);
    if (allHits.length > 0) {
      const hit = allHits[0];
      const zone = hit.object.userData['hitZone'] as string ?? 'torso';
      return {
        point: hit.point,
        normal: hit.face?.normal ?? new THREE.Vector3(0, 1, 0),
        distance: hit.distance,
        objectId: hit.object.uuid,
        hitZone: zone === 'head' ? 'head' : zone === 'limb' ? 'limb' : 'torso'
      };
    }
    return null;
  }

  calcDamage(hit: BulletHit): number {
    const falloff = Math.max(0, 1 - (hit.distance / this.stats.range) * 0.5);
    const zoneMultiplier = hit.hitZone === 'head' ? 2.0 : hit.hitZone === 'limb' ? 0.7 : 1.0;
    return this.stats.damage * falloff * zoneMultiplier;
  }

  getSpreadForShotgun(): THREE.Vector3[] {
    const pellets: THREE.Vector3[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const spread = this.stats.spreadBase;
      pellets.push(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        -1
      ).normalize());
    }
    return pellets;
  }

  startReload(): void {
    if (this.isReloading || this.reserveAmmo <= 0 || this.currentAmmo >= this.stats.magazineSize) return;
    this.isReloading = true;
    this.reloadTimer = this.currentAmmo === 0 ? this.stats.reloadEmptyTime : this.stats.reloadTime;
    this.audioManager?.playReload(this.stats.id);
  }

  private finishReload(): void {
    const needed = this.stats.magazineSize - this.currentAmmo;
    const given = Math.min(needed, this.reserveAmmo);
    this.currentAmmo += given;
    this.reserveAmmo -= given;
    this.isReloading = false;
    this.recoilIndex = 0;
  }

  isCurrentlyReloading(): boolean {
    return this.isReloading;
  }

  triggerReload(): void {
    if (!this.isReloading && this.currentAmmo < this.stats.magazineSize && this.reserveAmmo > 0) {
      this.startReload();
    }
  }

  getADSProgress(): number {
    return this.adsProgress;
  }

  getFireCooldown(): number {
    return this.fireCooldown;
  }

  canFire(): boolean {
    return !this.isReloading && this.fireCooldown <= 0 && this.currentAmmo > 0;
  }

  /**
   * Called by main.ts each frame when fire is held.
   * Returns {fired, recoilX, recoilY} so the caller can apply pitch/yaw delta once per shot.
   */
  tryFireExternal(): { fired: boolean; recoilDeltaX: number; recoilDeltaY: number } {
    if (!this.canFire()) return { fired: false, recoilDeltaX: 0, recoilDeltaY: 0 };

    if (this.stats.fireMode === 'burst') {
      if (this.isBursting) return { fired: false, recoilDeltaX: 0, recoilDeltaY: 0 };
      this.isBursting = true;
      this.burstShotsLeft = this.stats.burstCount ?? 3;
    }

    this.currentAmmo--;
    const fireInterval = 60 / this.stats.rpm;
    this.fireCooldown = fireInterval;
    this.totalShotsFired++;

    const patLen = this.stats.recoilPattern.length;
    const p = this.stats.recoilPattern[this.recoilIndex % patLen];
    this.recoilIndex++;
    const adsMult = 1 - this.adsProgress * 0.5;
    const rdx = p.x * adsMult;
    const rdy = p.y * adsMult;
    this.recoilX += rdx;
    this.recoilY += rdy;

    this.muzzleFlashTimer = 0.05;
    (this.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1;
    this.audioManager?.playGunshot(this.stats.id, this.stats.suppressedDefault ?? false);

    if (this.currentAmmo <= 0 && this.reserveAmmo > 0) {
      this.startReload();
    }

    return { fired: true, recoilDeltaX: rdx, recoilDeltaY: rdy };
  }
}
