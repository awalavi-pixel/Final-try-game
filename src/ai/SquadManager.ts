import * as THREE from 'three';
import { EnemyAI } from './EnemyAI';
import type { Difficulty } from './EnemyAI';
import type { CoverNode } from '../levels/FreightMap';
import type { AudioManager } from '../audio/AudioManager';

export class SquadManager {
  private squads: Squad[] = [];
  private enemies: EnemyAI[] = [];
  private scene: THREE.Scene;
  private nextId = 0;
  private coverNodes: CoverNode[] = [];
  private audioManager: AudioManager | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setAudioManager(am: AudioManager): void {
    this.audioManager = am;
  }

  setCoverNodes(nodes: CoverNode[]): void {
    this.coverNodes = nodes;
  }

  spawnSquad(positions: THREE.Vector3[], difficulty: Difficulty = 'REGULAR', patrolPath?: THREE.Vector3[]): Squad {
    const squad: Squad = {
      id: `squad_${this.squads.length}`,
      members: [],
      commanderId: '',
      morale: 1.0,
      active: true
    };

    for (let i = 0; i < positions.length; i++) {
      const enemy = new EnemyAI(`enemy_${this.nextId++}`, positions[i], difficulty);
      enemy.setCoverNodes(this.coverNodes);
      if (this.audioManager) enemy.setAudioManager(this.audioManager);

      if (patrolPath) {
        // Distribute patrol points
        const pts = patrolPath.slice(i % Math.max(1, patrolPath.length - 1));
        enemy.setPatrolPoints(pts.length > 0 ? pts : patrolPath);
      }

      squad.members.push(enemy);
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);

      enemy.onDeath = (id: string) => this.onEnemyDeath(id, squad);
    }

    if (squad.members.length > 0) {
      squad.commanderId = squad.members[0].id;
    }

    this.squads.push(squad);
    return squad;
  }

  update(dt: number, playerPosition: THREE.Vector3, playerAlive: boolean): void {
    for (const enemy of this.enemies) {
      enemy.update(dt, playerPosition, playerAlive);
    }

    // Squad coordination
    for (const squad of this.squads) {
      if (!squad.active) continue;
      this.updateSquadTactics(squad, playerPosition);
    }
  }

  private updateSquadTactics(squad: Squad, playerPos: THREE.Vector3): void {
    const aliveMembers = squad.members.filter(m => m.alive);
    if (aliveMembers.length === 0) {
      squad.active = false;
      return;
    }

    // Find if any member is in combat
    const inCombat = aliveMembers.some(m =>
      m.state === 'COMBAT' || m.state === 'SUPPRESS' || m.state === 'FLANK'
    );

    if (!inCombat || aliveMembers.length < 2) return;

    // Assign roles: 1 flanker, rest suppress
    let flankAssigned = false;
    for (const member of aliveMembers) {
      if (member.state === 'RETREAT' || member.state === 'DEAD') continue;
      if (!flankAssigned && member.id !== squad.commanderId) {
        if (member.state === 'COMBAT' && Math.random() < 0.01) {
          member.state = 'FLANK';
          flankAssigned = true;
        }
      } else if (member.state === 'COMBAT' && Math.random() < 0.005) {
        member.startSuppressMode(3);
      }
    }
    void playerPos;
  }

  private onEnemyDeath(id: string, squad: Squad): void {
    squad.morale -= 0.25;

    // Check if commander died
    if (squad.commanderId === id) {
      // 50% panic retreat on commander death
      const aliveMembers = squad.members.filter(m => m.alive);
      for (const member of aliveMembers) {
        if (Math.random() < 0.5) {
          member.state = 'RETREAT';
        }
      }
      // Assign new commander
      if (aliveMembers.length > 0) {
        squad.commanderId = aliveMembers[0].id;
      }
    }

    // Low morale retreat
    if (squad.morale < 0.25) {
      for (const m of squad.members.filter(e => e.alive)) {
        m.state = 'RETREAT';
      }
    }
  }

  getEnemies(): EnemyAI[] {
    return this.enemies;
  }

  getAliveEnemies(): EnemyAI[] {
    return this.enemies.filter(e => e.alive);
  }

  removeAll(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
    }
    this.enemies = [];
    this.squads = [];
  }

  setFireCallback(fn: (from: THREE.Vector3, to: THREE.Vector3, enemyId: string) => void): void {
    for (const enemy of this.enemies) {
      enemy.onFire = (from, to) => fn(from, to, enemy.id);
    }
  }
}

interface Squad {
  id: string;
  members: EnemyAI[];
  commanderId: string;
  morale: number;
  active: boolean;
}
