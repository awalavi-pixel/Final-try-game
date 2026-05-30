import * as THREE from 'three';
import type { CoverNode } from '../levels/FreightMap';
import type { AudioManager } from '../audio/AudioManager';

export type EnemyState = 'PATROL' | 'ALERT' | 'SEARCH' | 'COMBAT' | 'SUPPRESS' | 'FLANK' | 'RETREAT' | 'DEAD';
export type Difficulty = 'RECRUIT' | 'REGULAR' | 'HARDENED' | 'VETERAN';

const REACTION_TIMES: Record<Difficulty, number> = {
  RECRUIT: 0.8,
  REGULAR: 0.5,
  HARDENED: 0.3,
  VETERAN: 0.15
};

export class EnemyAI {
  id: string;
  state: EnemyState = 'PATROL';
  health = 100;
  maxHealth = 100;
  alive = true;

  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3 = new THREE.Vector3();
  private yaw = 0;

  private patrolPoints: THREE.Vector3[] = [];
  private patrolIndex = 0;
  private patrolWaitTimer = 0;

  private lastKnownPlayerPos: THREE.Vector3 | null = null;
  private stateTimer = 0;
  private alertTimer = 0;
  private reactionTimer = 0;
  private suppressTimer = 0;
  private grenadeTimer = 0;
  private coverHideTime = 0;

  private currentCover: CoverNode | null = null;
  private targetPosition: THREE.Vector3 | null = null;

  private fireCooldown = 0;
  private readonly fireRate = 0.15; // seconds between shots
  private difficulty: Difficulty;

  private coverNodes: CoverNode[] = [];
  private audioManager: AudioManager | null = null;

  // Callback for when enemy fires
  onFire: ((from: THREE.Vector3, to: THREE.Vector3) => void) | null = null;
  onDeath: ((id: string) => void) | null = null;

  constructor(id: string, position: THREE.Vector3, difficulty: Difficulty = 'REGULAR') {
    this.id = id;
    this.position = position.clone();
    this.difficulty = difficulty;
    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    this.reactionTimer = REACTION_TIMES[difficulty];
  }

  setAudioManager(am: AudioManager): void {
    this.audioManager = am;
  }

  setCoverNodes(nodes: CoverNode[]): void {
    this.coverNodes = nodes;
  }

  setPatrolPoints(points: THREE.Vector3[]): void {
    this.patrolPoints = points;
    this.patrolIndex = 0;
  }

  private buildMesh(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2d3a2d, roughness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.userData['hitZone'] = 'torso';
    body.userData['collidable'] = true;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.9 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    head.userData['hitZone'] = 'head';
    head.userData['collidable'] = true;
    group.add(head);

    // Helmet
    const helmetGeo = new THREE.BoxGeometry(0.32, 0.2, 0.32);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1a2818, roughness: 0.8 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = 1.7;
    group.add(helmet);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    for (const side of [-0.35, 0.35]) {
      const arm = new THREE.Mesh(armGeo, bodyMat);
      arm.position.set(side, 0.95, 0);
      arm.userData['hitZone'] = 'limb';
      arm.userData['collidable'] = true;
      group.add(arm);
    }

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    for (const side of [-0.15, 0.15]) {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(side, 0.3, 0);
      leg.userData['hitZone'] = 'limb';
      leg.userData['collidable'] = true;
      group.add(leg);
    }

    // Weapon visual
    const gunGeo = new THREE.BoxGeometry(0.07, 0.07, 0.45);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.7 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0.3, 1.1, -0.3);
    group.add(gun);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3, playerAlive: boolean): void {
    if (!this.alive) return;

    this.fireCooldown -= dt;
    this.stateTimer += dt;
    this.grenadeTimer += dt;

    const distToPlayer = this.position.distanceTo(playerPosition);
    const canSeePlayer = playerAlive && this.checkLineOfSight(playerPosition) && distToPlayer < 50;

    this.updateState(dt, playerPosition, playerAlive, canSeePlayer, distToPlayer);
    this.executeState(dt, playerPosition, playerAlive);

    // Move mesh
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
  }

  private checkLineOfSight(playerPos: THREE.Vector3): boolean {
    // Simplified - no actual raycast here, just angle + distance checks
    const toPlayer = playerPos.clone().sub(this.position).normalize();
    const facing = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const dot = facing.dot(toPlayer);
    // 80 degree half angle = cos(40°) ≈ 0.766
    return dot > 0.3; // Wider for gameplay balance
  }

  private updateState(dt: number, playerPos: THREE.Vector3, playerAlive: boolean, canSee: boolean, dist: number): void {
    if (!playerAlive) {
      if (this.state === 'COMBAT' || this.state === 'SUPPRESS' || this.state === 'FLANK') {
        this.state = 'PATROL';
        this.stateTimer = 0;
      }
      return;
    }

    switch (this.state) {
      case 'PATROL':
        if (canSee || dist < 10) {
          this.state = 'ALERT';
          this.alertTimer = REACTION_TIMES[this.difficulty];
          this.stateTimer = 0;
        }
        break;

      case 'ALERT':
        this.alertTimer -= dt;
        this.faceTarget(playerPos, dt * 3);
        if (this.alertTimer <= 0) {
          if (canSee) {
            this.state = 'COMBAT';
            this.lastKnownPlayerPos = playerPos.clone();
          } else {
            this.state = 'SEARCH';
          }
          this.stateTimer = 0;
        }
        break;

      case 'SEARCH':
        if (canSee) {
          this.state = 'COMBAT';
          this.stateTimer = 0;
        } else if (this.stateTimer > 8) {
          this.state = 'PATROL';
          this.stateTimer = 0;
        }
        break;

      case 'COMBAT':
        if (canSee) {
          this.lastKnownPlayerPos = playerPos.clone();
          this.coverHideTime = 0;
          if (dist < 5) {
            this.state = 'RETREAT';
            this.stateTimer = 0;
          } else if (this.health < 30) {
            this.state = 'RETREAT';
            this.stateTimer = 0;
          }
        } else {
          this.coverHideTime += dt;
          if (this.coverHideTime > 3 && this.grenadeTimer > 10) {
            // Throw grenade at cover
            this.grenadeTimer = 0;
          }
          if (this.stateTimer > 5) {
            this.state = 'FLANK';
            this.stateTimer = 0;
          }
        }
        break;

      case 'SUPPRESS':
        this.suppressTimer -= dt;
        if (this.suppressTimer <= 0 || canSee) {
          this.state = 'COMBAT';
          this.stateTimer = 0;
        }
        break;

      case 'FLANK':
        if (canSee) {
          this.state = 'COMBAT';
          this.stateTimer = 0;
        } else if (this.stateTimer > 6 || dist < 5) {
          this.state = 'COMBAT';
          this.stateTimer = 0;
        }
        break;

      case 'RETREAT':
        if (this.stateTimer > 3) {
          if (this.health > 50) {
            this.state = 'COMBAT';
          } else {
            this.state = 'SUPPRESS';
            this.suppressTimer = 3;
          }
          this.stateTimer = 0;
        }
        break;
    }
  }

  private executeState(dt: number, playerPos: THREE.Vector3, playerAlive: boolean): void {
    switch (this.state) {
      case 'PATROL':
        this.doPatrol(dt);
        break;
      case 'ALERT':
        this.faceTarget(playerPos, dt * 2);
        break;
      case 'SEARCH':
        this.doSearch(dt);
        break;
      case 'COMBAT':
        this.doCombat(dt, playerPos);
        break;
      case 'SUPPRESS':
        this.doSuppress(dt, playerPos);
        break;
      case 'FLANK':
        this.doFlank(dt, playerPos);
        break;
      case 'RETREAT':
        this.doRetreat(dt, playerPos);
        break;
    }
    void playerAlive;
  }

  private doPatrol(dt: number): void {
    if (this.patrolPoints.length === 0) return;

    const target = this.patrolPoints[this.patrolIndex];
    const dist = this.position.distanceTo(target);

    if (dist < 1.0) {
      this.patrolWaitTimer += dt;
      if (this.patrolWaitTimer > 2) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
        this.patrolWaitTimer = 0;
      }
    } else {
      this.moveTowards(target, 2.0, dt);
    }
  }

  private doSearch(dt: number): void {
    if (this.lastKnownPlayerPos) {
      this.moveTowards(this.lastKnownPlayerPos, 3.0, dt);
    }
  }

  private doCombat(dt: number, playerPos: THREE.Vector3): void {
    // Seek cover if exposed
    if (!this.currentCover || this.stateTimer > 3) {
      const threatDir = playerPos.clone().sub(this.position).normalize();
      this.currentCover = this.findCover(this.position, threatDir);
      this.stateTimer = 0;
    }

    if (this.currentCover) {
      const distToCover = this.position.distanceTo(this.currentCover.position);
      if (distToCover > 1.5) {
        this.moveTowards(this.currentCover.position, 4.5, dt);
      } else {
        // At cover, peek and fire
        this.faceTarget(playerPos, dt * 4);
        this.tryFireAt(playerPos);
      }
    } else {
      // No cover - strafe and fire
      this.faceTarget(playerPos, dt * 3);
      this.tryFireAt(playerPos);
      // Strafe
      const strafe = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const dir = Math.sin(this.stateTimer * 1.5) > 0 ? 1 : -1;
      this.position.addScaledVector(strafe, dir * 2.0 * dt);
    }
  }

  private doSuppress(dt: number, playerPos: THREE.Vector3): void {
    this.faceTarget(playerPos, dt * 2);
    if (this.fireCooldown <= 0) {
      this.audioManager?.playGunshot('enemy', false);
      this.fireCooldown = this.fireRate * 2;
    }
  }

  private doFlank(dt: number, playerPos: THREE.Vector3): void {
    // Move perpendicular to player direction
    const toPlayer = playerPos.clone().sub(this.position).normalize();
    const flankDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
    const flankTarget = this.position.clone().addScaledVector(flankDir, 8);
    this.moveTowards(flankTarget, 4.5, dt);
  }

  private doRetreat(dt: number, playerPos: THREE.Vector3): void {
    const awayFromPlayer = this.position.clone().sub(playerPos).normalize();
    const retreatTarget = this.position.clone().addScaledVector(awayFromPlayer, 10);
    this.moveTowards(retreatTarget, 5.0, dt);
  }

  private moveTowards(target: THREE.Vector3, speed: number, dt: number): void {
    const dir = target.clone().sub(this.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.1) return;
    dir.normalize();

    this.yaw = Math.atan2(dir.x, dir.z);
    this.position.addScaledVector(dir, Math.min(speed * dt, dist));
    this.position.y = 1.65; // ground level
  }

  private faceTarget(target: THREE.Vector3, speed: number): void {
    const dir = target.clone().sub(this.position).normalize();
    const targetYaw = Math.atan2(dir.x, dir.z);
    const diff = this.normalizeAngle(targetYaw - this.yaw);
    this.yaw += Math.sign(diff) * Math.min(Math.abs(diff), speed * 0.016);
  }

  private normalizeAngle(a: number): number {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  private tryFireAt(target: THREE.Vector3): void {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = this.fireRate;

    // Add spread based on difficulty
    const spread = this.difficulty === 'VETERAN' ? 0.02 : this.difficulty === 'HARDENED' ? 0.05 : 0.1;
    const aimTarget = target.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * spread * 10,
      (Math.random() - 0.5) * spread * 10,
      0
    ));

    if (this.onFire) {
      const muzzlePos = this.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      this.onFire(muzzlePos, aimTarget);
    }
    this.audioManager?.playGunshot('enemy', false);
  }

  private findCover(position: THREE.Vector3, threatDir: THREE.Vector3): CoverNode | null {
    let best: CoverNode | null = null;
    let bestScore = -Infinity;

    for (const node of this.coverNodes) {
      const dist = node.position.distanceTo(position);
      if (dist > 15) continue;
      const dotToThreat = node.normal.dot(threatDir);
      const score = node.quality + dotToThreat * 0.3 - dist * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = node;
      }
    }
    return best;
  }

  takeDamage(damage: number): void {
    if (!this.alive) return;
    this.health -= damage;
    if (this.health <= 0) {
      this.die();
    } else {
      // React to being shot
      if (this.state === 'PATROL' || this.state === 'SEARCH') {
        this.state = 'ALERT';
        this.alertTimer = REACTION_TIMES[this.difficulty];
        this.stateTimer = 0;
      }
    }
  }

  private die(): void {
    this.alive = false;
    this.state = 'DEAD';
    this.health = 0;

    // Play death animation (fall)
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.y = 0.5;

    if (this.onDeath) this.onDeath(this.id);
  }

  startSuppressMode(duration: number): void {
    this.state = 'SUPPRESS';
    this.suppressTimer = duration;
    this.stateTimer = 0;
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
}
