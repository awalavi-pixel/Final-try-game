import * as THREE from 'three';
import type { InputManager } from '../core/InputManager';
import type { WeaponBase } from './WeaponBase';
import type { DamageSystem } from './DamageSystem';

export class Player {
  // Movement speeds (m/s)
  private static readonly WALK_SPEED = 4.5;
  private static readonly SPRINT_SPEED = 7.2;
  private static readonly CROUCH_SPEED = 2.8;
  private static readonly PRONE_SPEED = 1.2;
  private static readonly TACTICAL_SPRINT_SPEED = 9.0;
  private static readonly JUMP_VELOCITY = 5.0;
  private static readonly GRAVITY = -15.0;

  // Health
  health = 100;
  private maxHealth = 100;
  private regenDelay = 4.0;
  private regenRate = 20;
  private lastDamageTime = -999;
  alive = true;

  // Physics
  position: THREE.Vector3;
  velocity: THREE.Vector3 = new THREE.Vector3();
  private onGround = true;
  private jumpCooldown = 0;

  // Stance
  private isCrouching = false;
  private isProne = false;
  private isSprinting = false;
  private isTacticalSprinting = false;
  private tacticalSprintTimer = 0;
  private tacSprintLocked = false;

  // Camera
  camera: THREE.PerspectiveCamera;
  private yaw = 0;
  private pitch = 0;
  private bobTime = 0;
  private breathTime = 0;
  private hitReactionX = 0;
  private hitReactionY = 0;
  private currentFOV = 90;
  private targetFOV = 90;

  // Weapons
  weapons: WeaponBase[] = [];
  currentWeaponIndex = 0;

  // Collision geometry
  private colliderHeight = 1.8;
  private colliderRadius = 0.35;
  collisionObjects: THREE.Object3D[] = [];

  constructor(private damageSystem: DamageSystem, startPos: THREE.Vector3) {
    this.position = startPos.clone();
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.05, 500);
    // Set initial camera position immediately so first render is correct
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  addWeapon(weapon: WeaponBase): void {
    this.weapons.push(weapon);
    this.camera.add(weapon.mesh);
  }

  get currentWeapon(): WeaponBase | null {
    return this.weapons[this.currentWeaponIndex] ?? null;
  }

  update(dt: number, input: InputManager, gameTime: number): void {
    if (!this.alive) return;

    const state = input.getState();
    const delta = input.consumeMouseDelta();

    // Mouse look
    if (state.isPointerLocked) {
      this.yaw -= delta.x * state.sensitivity;
      this.pitch -= delta.y * state.sensitivity;
      this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch));
    }

    // Camera hit reaction decay
    this.hitReactionX *= Math.pow(0.01, dt);
    this.hitReactionY *= Math.pow(0.01, dt);

    // Apply weapon recoil to camera
    const weapon = this.currentWeapon;
    if (weapon) {
      this.pitch -= weapon.recoilY * 0.008;
      this.yaw -= weapon.recoilX * 0.005;
    }

    // Stance
    const prevCrouch = this.isCrouching;
    this.isCrouching = state.crouch && !state.prone;
    this.isProne = state.prone;

    if (this.isCrouching !== prevCrouch) {
      this.colliderHeight = this.isCrouching ? 1.2 : 1.8;
    }

    // Movement
    const moveDir = new THREE.Vector3();
    if (state.forward) moveDir.z -= 1;
    if (state.back) moveDir.z += 1;
    if (state.left) moveDir.x -= 1;
    if (state.right) moveDir.x += 1;
    if (moveDir.length() > 0) moveDir.normalize();

    // Sprint logic
    const canSprint = state.sprint && state.forward && !state.ads && !this.isCrouching && !this.isProne;
    const isMoving = moveDir.length() > 0;

    if (canSprint && isMoving && !this.tacSprintLocked) {
      this.isSprinting = true;
      // Double-tap sprint = tactical sprint
      if (this.tacticalSprintTimer > 0) {
        this.isTacticalSprinting = true;
        this.tacticalSprintTimer = 2.0;
      } else {
        this.isTacticalSprinting = false;
      }
    } else {
      this.isSprinting = false;
      if (!canSprint) {
        this.isTacticalSprinting = false;
        this.tacSprintLocked = false;
      }
    }

    if (this.isTacticalSprinting) {
      this.tacticalSprintTimer -= dt;
      if (this.tacticalSprintTimer <= 0) {
        this.isTacticalSprinting = false;
        this.tacSprintLocked = true;
      }
    }

    let speed = Player.WALK_SPEED;
    if (this.isTacticalSprinting) speed = Player.TACTICAL_SPRINT_SPEED;
    else if (this.isSprinting) speed = Player.SPRINT_SPEED;
    else if (this.isCrouching) speed = Player.CROUCH_SPEED;
    else if (this.isProne) speed = Player.PRONE_SPEED;

    // Apply movement in world space (yaw only)
    const euler = new THREE.Euler(0, this.yaw, 0, 'YXZ');
    const worldMove = moveDir.clone().applyEuler(euler).multiplyScalar(speed);
    this.velocity.x = worldMove.x;
    this.velocity.z = worldMove.z;

    // Jump
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;
    if (state.jump && this.onGround && this.jumpCooldown <= 0 && !this.isCrouching && !this.isProne) {
      this.velocity.y = Player.JUMP_VELOCITY;
      this.onGround = false;
      this.jumpCooldown = 0.4;
    }

    // Gravity
    if (!this.onGround) {
      this.velocity.y += Player.GRAVITY * dt;
    }

    // Move
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    // Ground check (simple flat terrain at y=0)
    const groundY = this.getGroundHeight();
    const feetY = groundY + this.getEyeOffset();
    if (this.position.y <= feetY) {
      this.position.y = feetY;
      this.velocity.y = 0;
      this.onGround = true;
    } else if (this.position.y > feetY + 0.05) {
      this.onGround = false;
    }

    // Camera bob
    const movingOnGround = isMoving && this.onGround;
    if (movingOnGround) {
      this.bobTime += dt * speed * 0.7;
    } else {
      this.bobTime += dt * 0.5;
    }

    this.breathTime += dt * (state.ads ? 0.3 : 0.8);

    const bobAmt = movingOnGround ? (this.isSprinting ? 0.025 : 0.012) : 0;
    const adsProgress = weapon?.getADSProgress() ?? 0;
    const breathAmt = state.ads ? 0.002 * (1 - adsProgress) : 0;

    // Camera position
    const eyeHeight = this.getEyeOffset();
    const bobX = Math.sin(this.bobTime * 2) * bobAmt;
    const bobY = Math.abs(Math.sin(this.bobTime)) * bobAmt;
    const breathX = Math.sin(this.breathTime * 0.5) * breathAmt;
    const breathY = Math.sin(this.breathTime * 0.7) * breathAmt;

    this.camera.position.copy(this.position);
    this.camera.position.y = this.position.y + bobY + breathY;

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + bobX * 0.1 + breathX + this.hitReactionX;
    this.camera.rotation.x = this.pitch + this.hitReactionY;
    this.camera.rotation.z = bobX * 0.02;

    // FOV
    this.targetFOV = state.ads ? 65 : (this.isSprinting ? 95 : 90);
    if (this.currentFOV !== this.targetFOV) {
      this.currentFOV += (this.targetFOV - this.currentFOV) * Math.min(1, dt * 8);
      this.camera.fov = this.currentFOV;
      this.camera.updateProjectionMatrix();
    }

    // Health regen
    if (gameTime - this.lastDamageTime >= this.regenDelay && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt);
    }

    // Weapon update
    if (weapon) {
      weapon.update(dt, {
        fire: state.fire && !this.isSprinting,
        ads: state.ads && !this.isSprinting,
        reload: state.reload
      });

      // Weapon shooting raycast
      if (state.fire && weapon.canFire() && !this.isSprinting) {
        // handled in weapon.update -> tryFire, but we do raycast here
      }
    }

    // Weapon switch
    this.handleWeaponSwitch(state);

    void eyeHeight;
  }

  private getEyeOffset(): number {
    if (this.isProne) return 0.3;
    if (this.isCrouching) return 1.0;
    return 1.65;
  }

  private getGroundHeight(): number {
    // Check collision with ground meshes - simplified flat terrain
    return 0;
  }

  private handleWeaponSwitch(state: { fire: boolean }): void {
    void state;
    // Handled by number keys via event listener
  }

  switchWeapon(index: number): void {
    if (index >= 0 && index < this.weapons.length) {
      // Hide current
      if (this.weapons[this.currentWeaponIndex]) {
        this.weapons[this.currentWeaponIndex].mesh.visible = false;
      }
      this.currentWeaponIndex = index;
      this.weapons[this.currentWeaponIndex].mesh.visible = true;
    }
  }

  takeDamage(damage: number, direction: THREE.Vector3, gameTime: number): void {
    if (!this.alive) return;
    this.health -= damage;
    this.lastDamageTime = gameTime;

    // Hit reaction
    this.hitReactionY += (Math.random() - 0.5) * 0.04;
    this.hitReactionX += (Math.random() - 0.5) * 0.03;

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }

    this.damageSystem.dispatch({
      targetId: 'player',
      damage,
      hitZone: 'torso',
      sourceId: 'enemy',
      direction: { x: direction.x, y: direction.y, z: direction.z },
      isFatal: !this.alive
    });
  }

  respawn(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.camera.position.copy(pos);
    this.health = this.maxHealth;
    this.alive = true;
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
  }

  isADS(): boolean {
    return (this.currentWeapon?.getADSProgress() ?? 0) > 0.5;
  }

  isSprint(): boolean {
    return this.isSprinting;
  }
}
