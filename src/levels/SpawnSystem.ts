import * as THREE from 'three';
import type { SpawnPoint } from './FreightMap';

export class SpawnSystem {
  private spawnPoints: SpawnPoint[] = [];

  setSpawnPoints(points: SpawnPoint[]): void {
    this.spawnPoints = points;
  }

  getSpawn(team: 0 | 1): THREE.Vector3 {
    const filtered = this.spawnPoints.filter(s => s.team === team);
    if (filtered.length === 0) return new THREE.Vector3(0, 1.65, 0);
    const sp = filtered[Math.floor(Math.random() * filtered.length)];
    return sp.position.clone();
  }

  getSpawnWithRotation(team: 0 | 1): { position: THREE.Vector3; rotation: number } {
    const filtered = this.spawnPoints.filter(s => s.team === team);
    if (filtered.length === 0) return { position: new THREE.Vector3(0, 1.65, 0), rotation: 0 };
    const sp = filtered[Math.floor(Math.random() * filtered.length)];
    return { position: sp.position.clone(), rotation: sp.rotation };
  }
}
