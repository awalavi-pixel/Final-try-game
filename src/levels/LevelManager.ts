import * as THREE from 'three';
import { FreightMap } from './FreightMap';
import type { SpawnPoint } from './FreightMap';

export type LevelId = 'freight';

export class LevelManager {
  private currentLevel: FreightMap | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  loadLevel(id: LevelId): FreightMap {
    // Clear previous level objects
    this.unloadCurrent();

    if (id === 'freight') {
      this.currentLevel = new FreightMap(this.scene);
    }

    return this.currentLevel!;
  }

  private unloadCurrent(): void {
    if (!this.currentLevel) return;
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse(obj => {
      if (obj.userData['levelObject']) toRemove.push(obj);
    });
    for (const obj of toRemove) {
      this.scene.remove(obj);
    }
    this.currentLevel = null;
  }

  getCurrentLevel(): FreightMap | null {
    return this.currentLevel;
  }

  getSpawn(team: 0 | 1): SpawnPoint | null {
    return this.currentLevel?.getSpawn(team) ?? null;
  }
}
