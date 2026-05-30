import * as THREE from 'three';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { Renderer } from './core/Renderer';
import { Player } from './gameplay/Player';
import { WeaponBase } from './gameplay/WeaponBase';
import { DamageSystem } from './gameplay/DamageSystem';
import { AudioManager } from './audio/AudioManager';
import { SpatialAudio } from './audio/SpatialAudio';
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { LevelManager } from './levels/LevelManager';
import { SquadManager } from './ai/SquadManager';
import { MissionManager } from './campaign/MissionManager';
import { CheckpointSystem } from './campaign/CheckpointSystem';
import { getHeshCallout } from './gameplay/characters/Hesh';
import { getWeaponStats } from './gameplay/WeaponStats';
import type { FreightMap } from './levels/FreightMap';

// ============================================================
// GAME STATE
// ============================================================
type GameMode = 'menu' | 'campaign' | 'multiplayer';

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private inputManager: InputManager;
  private audioManager: AudioManager;
  private spatialAudio: SpatialAudio;
  private damageSystem: DamageSystem;
  private hud: HUD;
  private mainMenu: MainMenu;
  private levelManager: LevelManager;
  private squadManager: SquadManager;
  private missionManager: MissionManager;
  private checkpointSystem: CheckpointSystem;
  private gameLoop: GameLoop;

  private player!: Player;
  private currentLevel!: FreightMap;
  private mode: GameMode = 'menu';
  private gameTime = 0;
  private missionIndex = 0;
  private heshCalloutTimer = 0;
  private heshCalloutIndex = 0;
  private score = 0;
  private killCount = 0;

  // Bullet/particle pool
  private bulletTrails: BulletTrail[] = [];
  private decals: THREE.Mesh[] = [];
  private decalMat: THREE.MeshBasicMaterial;

  // Weapon switch keys
  private weaponSwitchListenerActive = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    this.renderer = new Renderer(this.canvas);
    this.inputManager = new InputManager(this.canvas);
    this.audioManager = new AudioManager();
    this.spatialAudio = new SpatialAudio(this.audioManager);
    this.damageSystem = new DamageSystem();

    const hudContainer = document.getElementById('hud')!;
    this.hud = new HUD(hudContainer);

    const menuContainer = document.getElementById('main-menu')!;
    this.mainMenu = new MainMenu(menuContainer, this.audioManager);

    this.levelManager = new LevelManager(this.renderer.getScene());
    this.squadManager = new SquadManager(this.renderer.getScene());
    this.missionManager = new MissionManager();
    this.checkpointSystem = new CheckpointSystem();

    this.decalMat = new THREE.MeshBasicMaterial({
      color: 0x111111, depthWrite: false, transparent: true, opacity: 0.8
    });

    this.setupMenuCallbacks();
    this.setupDamageSystem();

    // Start the game loop (runs even in menu for animation)
    this.gameLoop = new GameLoop(
      (dt) => this.fixedUpdate(dt),
      (alpha) => this.render(alpha)
    );
    this.gameLoop.start();

    this.audioManager.playAmbient();
  }

  private setupMenuCallbacks(): void {
    this.mainMenu.onStartGame((mode) => {
      this.startGame(mode === 'campaign' ? 'campaign' : 'multiplayer');
    });
  }

  private setupDamageSystem(): void {
    this.damageSystem.onDamage((evt) => {
      if (evt.targetId === 'player') {
        const dir = new THREE.Vector3(evt.direction.x, evt.direction.y, evt.direction.z);
        const angle = Math.atan2(dir.x, dir.z) * (180 / Math.PI);
        this.hud.showDamageArc(angle);
      }
    });
  }

  private startGame(mode: GameMode): void {
    this.mode = mode;

    // Load level
    this.currentLevel = this.levelManager.loadLevel('freight');

    // Setup player
    const spawn = mode === 'campaign'
      ? new THREE.Vector3(0, 1.65, 44)
      : (this.currentLevel.getSpawn(0)?.position ?? new THREE.Vector3(0, 1.65, 44));

    this.player = new Player(this.damageSystem, spawn);

    // Give player weapons
    const weaponIds = ['sc2010', 'm9a1'];
    const weapons: WeaponBase[] = [];
    for (const wId of weaponIds) {
      const stats = getWeaponStats(wId);
      if (stats) {
        const weapon = new WeaponBase(stats);
        weapon.setAudioManager(this.audioManager);
        weapon.setScene(this.renderer.getScene());
        this.player.addWeapon(weapon);
        weapons.push(weapon);
      }
    }

    // Hide all weapons except first
    for (let i = 1; i < weapons.length; i++) {
      weapons[i].mesh.visible = false;
    }

    // Add camera to scene
    this.renderer.getScene().add(this.player.camera);

    // Setup AI
    this.squadManager.setAudioManager(this.audioManager);
    this.squadManager.setCoverNodes(this.currentLevel.coverNodes);
    this.squadManager.removeAll();

    // Weapon switch via number keys
    this.setupWeaponSwitchKeys();

    // Enemy fire callback
    this.squadManager.setFireCallback((from, to, enemyId) => {
      this.handleEnemyFire(from, to, enemyId);
    });

    if (mode === 'campaign') {
      this.startCampaignMission(this.missionIndex);
    } else {
      this.startMultiplayer();
    }

    // Mission callbacks
    this.missionManager.onMissionComplete = () => {
      this.hud.showMessage('MISSION COMPLETE', 4);
      this.audioManager.playUIClick();
      setTimeout(() => {
        this.missionIndex++;
        if (this.missionIndex < this.missionManager.getMissions().length) {
          this.startCampaignMission(this.missionIndex);
        } else {
          this.hud.showMessage('YOU HAVE COMPLETED ALL MISSIONS!', 6);
        }
      }, 4000);
    };

    this.missionManager.onObjectiveUpdate = (obj) => {
      this.hud.showSubtitle(`Objective: ${obj.description} — COMPLETE`, 3);
    };

    // Checkpoint death callback
    this.checkpointSystem.setRespawnCallback(() => {
      this.respawnPlayer();
    });
  }

  private startCampaignMission(index: number): void {
    const mission = this.missionManager.loadMission(index);
    if (!mission) return;

    // Reset squads
    this.squadManager.removeAll();

    // Spawn enemies from mission definition
    let waveIndex = 0;
    const spawnWave = (wave: typeof mission.enemyWaves[0]) => {
      this.squadManager.spawnSquad(wave.positions, wave.difficulty, wave.patrolPath);
    };

    // Spawn first wave immediately
    if (mission.enemyWaves.length > 0) {
      spawnWave(mission.enemyWaves[0]);
      waveIndex = 1;
    }

    // Schedule trigger-based waves
    for (let i = waveIndex; i < mission.enemyWaves.length; i++) {
      const wave = mission.enemyWaves[i];
      if (wave.triggerPosition && wave.triggerRadius) {
        // These will be checked in update
        wave.triggerPosition.userData = { triggered: false };
      }
    }

    // Reposition player
    this.player.respawn(mission.playerSpawn);

    // Show mission info
    this.hud.showSubtitle(`MISSION: ${mission.name}`, 4);
    setTimeout(() => {
      this.hud.showSubtitle(mission.objectives[0]?.description ?? '', 3);
    }, 4500);

    this.heshCalloutIndex = 0;
    this.heshCalloutTimer = 5;
  }

  private startMultiplayer(): void {
    // Spawn bot squads for both teams
    const team1Positions = Array.from({ length: 6 }, (_, i) =>
      new THREE.Vector3(-10 + i * 4, 1.65, 44));
    const team2Positions = Array.from({ length: 6 }, (_, i) =>
      new THREE.Vector3(-10 + i * 4, 1.65, -38));

    this.squadManager.spawnSquad(team1Positions, 'REGULAR',
      [new THREE.Vector3(-5, 1.65, 30), new THREE.Vector3(5, 1.65, 10), new THREE.Vector3(0, 1.65, 0)]
    );
    this.squadManager.spawnSquad(team2Positions, 'HARDENED',
      [new THREE.Vector3(-5, 1.65, -30), new THREE.Vector3(5, 1.65, -15), new THREE.Vector3(0, 1.65, 0)]
    );

    this.hud.showSubtitle('MULTIPLAYER — Freight | Elimination', 3);
    this.hud.showMessage('ELIMINATE ALL ENEMIES', 3);
  }

  private setupWeaponSwitchKeys(): void {
    if (this.weaponSwitchListenerActive) return;
    this.weaponSwitchListenerActive = true;

    document.addEventListener('keydown', (e) => {
      if (this.mode === 'menu') return;
      if (e.code === 'Digit1') this.player.switchWeapon(0);
      if (e.code === 'Digit2') this.player.switchWeapon(1);
      if (e.code === 'Digit3') this.player.switchWeapon(2);
    });
  }

  private fixedUpdate(dt: number): void {
    if (this.mode === 'menu') return;
    if (!this.player) return;

    this.gameTime += dt;

    // Player update
    this.player.update(dt, this.inputManager, this.gameTime);

    // Check player alive
    if (!this.player.alive) {
      this.checkpointSystem.triggerDeath(() => {
        this.respawnPlayer();
      });
      return;
    }

    // AI update
    this.squadManager.update(dt, this.player.position, this.player.alive);

    // Weapon raycast for player fire
    const weapon = this.player.currentWeapon;
    const inputState = this.inputManager.getState();
    if (weapon && inputState.fire && weapon.canFire() && !this.player.isSprint()) {
      const scene = this.renderer.getScene();
      const hit = weapon.raycast(this.player.camera, scene);
      if (hit) {
        this.handlePlayerHit(hit);
      }
      this.hud.addCrosshairSpread(8 + Math.random() * 5);
    }

    // Mission position check
    const mission = this.missionManager.getCurrentMission();
    if (mission) {
      this.missionManager.onPlayerReachedPosition(this.player.position);
      this.missionManager.updateSurviveTimer(dt);

      // Check trigger waves
      for (const wave of mission.enemyWaves) {
        if (wave.triggerPosition && wave.triggerRadius && wave.triggerPosition.userData) {
          if (!wave.triggerPosition.userData['triggered']) {
            const dist = this.player.position.distanceTo(wave.triggerPosition);
            if (dist < wave.triggerRadius) {
              wave.triggerPosition.userData['triggered'] = true;
              this.squadManager.spawnSquad(wave.positions, wave.difficulty, wave.patrolPath);
            }
          }
        }
      }
    }

    // Hesh dialogue
    this.heshCalloutTimer -= dt;
    if (this.heshCalloutTimer <= 0) {
      const enemies = this.squadManager.getAliveEnemies();
      if (enemies.length > 0) {
        const callout = getHeshCallout(this.heshCalloutIndex++);
        this.hud.showSubtitle(`Hesh: ${callout}`, 3);
        this.heshCalloutTimer = 15 + Math.random() * 20;
      }
    }

    // Checkpoint auto-save
    this.checkpointSystem.update(dt, this.gameTime, () => {
      if (this.player && mission) {
        const ammo = this.player.weapons.map(w => ({ current: w.currentAmmo, reserve: w.reserveAmmo }));
        const objState: Record<string, boolean> = {};
        for (const obj of mission.objectives) {
          objState[obj.id] = obj.completed;
        }
        this.checkpointSystem.save(mission.id, this.missionIndex, this.player.position, this.player.health, ammo, objState);
        this.checkpointSystem.showCheckpointReached();
      }
    });

    // Minimap
    const enemies = this.squadManager.getAliveEnemies().map(e => ({ x: e.position.x, z: e.position.z }));
    this.hud.updateMinimap(this.player.position.x, this.player.position.z, this.player.camera.rotation.y, enemies);

    // HUD update
    this.hud.update(dt, this.player);

    // Spatial audio listener
    const fwd = new THREE.Vector3();
    this.player.camera.getWorldDirection(fwd);
    this.audioManager.updateListener(
      this.player.camera.position.x, this.player.camera.position.y, this.player.camera.position.z,
      fwd.x, fwd.y, fwd.z,
      0, 1, 0
    );

    // Clean up bullet trails
    for (let i = this.bulletTrails.length - 1; i >= 0; i--) {
      this.bulletTrails[i].life -= dt;
      if (this.bulletTrails[i].life <= 0) {
        this.renderer.getScene().remove(this.bulletTrails[i].mesh);
        this.bulletTrails.splice(i, 1);
      } else {
        (this.bulletTrails[i].mesh.material as THREE.MeshBasicMaterial).opacity = this.bulletTrails[i].life * 2;
      }
    }
  }

  private handlePlayerHit(hit: { point: THREE.Vector3; normal?: THREE.Vector3; objectId: string; hitZone: 'head' | 'torso' | 'limb'; distance: number }): void {
    const weapon = this.player.currentWeapon;
    if (!weapon) return;

    // Check if hit an enemy
    const enemies = this.squadManager.getAliveEnemies();
    let hitEnemy = false;
    for (const enemy of enemies) {
      // Check if any mesh part matches
      let matched = false;
      enemy.mesh.traverse((child) => {
        if (child.uuid === hit.objectId) matched = true;
      });
      if (matched) {
        const damage = weapon.calcDamage({ ...hit, normal: hit.normal ?? new THREE.Vector3(0,1,0) });
        enemy.takeDamage(damage);
        hitEnemy = true;
        const isKill = !enemy.alive;
        this.hud.showHitMarker(isKill);
        this.audioManager.playHitMarker();
        if (isKill) {
          this.killCount++;
          this.score += 100;
          this.missionManager.onEnemyKilled();
          this.hud.showSubtitle(`Score: ${this.score}`, 1);
        }
        break;
      }
    }

    // Bullet decal on surface
    if (!hitEnemy) {
      this.spawnDecal(hit.point);
    }

    // Bullet trail
    this.spawnBulletTrail(this.player.camera.position.clone(), hit.point);
  }

  private handleEnemyFire(from: THREE.Vector3, to: THREE.Vector3, enemyId: string): void {
    // Check if bullet hits player (simplified sphere check)
    const distToPlayer = to.distanceTo(this.player.position);
    if (distToPlayer < 0.8 && this.player.alive) {
      const damage = 15 + Math.random() * 10;
      const dir = from.clone().sub(this.player.position).normalize();
      this.player.takeDamage(damage, dir, this.gameTime);
    }
    // Bullet trail
    this.spawnBulletTrail(from, to);
    void enemyId;
  }

  private spawnDecal(pos: THREE.Vector3): void {
    if (this.decals.length > 50) {
      const old = this.decals.shift();
      if (old) this.renderer.getScene().remove(old);
    }
    const geo = new THREE.CircleGeometry(0.05, 6);
    const mesh = new THREE.Mesh(geo, this.decalMat.clone());
    mesh.position.copy(pos);
    mesh.position.y += 0.01;
    mesh.rotation.x = -Math.PI / 2;
    this.renderer.getScene().add(mesh);
    this.decals.push(mesh);
  }

  private spawnBulletTrail(from: THREE.Vector3, to: THREE.Vector3): void {
    const dir = to.clone().sub(from);
    const length = dir.length();
    const geo = new THREE.CylinderGeometry(0.005, 0.005, length, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.5, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);

    const mid = from.clone().add(to).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.lookAt(to);
    mesh.rotateX(Math.PI / 2);

    this.renderer.getScene().add(mesh);
    this.bulletTrails.push({ mesh, life: 0.1 });
  }

  private respawnPlayer(): void {
    const spawn = this.currentLevel?.getSpawn(0);
    if (spawn) {
      this.player.respawn(spawn.position);
    } else {
      this.player.respawn(new THREE.Vector3(0, 1.65, 44));
    }
    this.hud.showMessage('RESPAWNING...', 1);
  }

  private render(alpha: number): void {
    if (this.mode === 'menu') return;
    if (!this.player) return;

    // Use player camera
    this.renderer.getRenderer().render(this.renderer.getScene(), this.player.camera);
    void alpha;
  }
}

interface BulletTrail {
  mesh: THREE.Mesh;
  life: number;
}

// Extend Vector3 with userData for trigger checks
declare module 'three' {
  interface Vector3 {
    userData?: Record<string, unknown>;
  }
}

// ============================================================
// BOOTSTRAP
// ============================================================
let game: Game | null = null;

function init(): void {
  game = new Game();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { game };
