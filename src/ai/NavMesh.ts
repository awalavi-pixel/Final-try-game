import * as THREE from 'three';

export class NavMesh {
  private nodes: THREE.Vector3[] = [];
  private edges: Map<number, number[]> = new Map();

  // Simple grid-based nav mesh for the freight map
  build(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, obstacles: THREE.Box3[]): void {
    const step = 2.0;
    let idx = 0;

    for (let x = bounds.minX; x <= bounds.maxX; x += step) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += step) {
        const pos = new THREE.Vector3(x, 0, z);
        // Check if inside any obstacle
        const blocked = obstacles.some(box => {
          const expanded = box.clone();
          expanded.expandByScalar(0.5);
          return expanded.containsPoint(pos);
        });
        if (!blocked) {
          this.nodes.push(pos);
          this.edges.set(idx, []);
          idx++;
        }
      }
    }

    // Build edges
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dist = this.nodes[i].distanceTo(this.nodes[j]);
        if (dist <= step * 1.5) {
          this.edges.get(i)!.push(j);
          this.edges.get(j)!.push(i);
        }
      }
    }
  }

  findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    if (this.nodes.length === 0) return [to];

    const startIdx = this.nearestNode(from);
    const endIdx = this.nearestNode(to);

    if (startIdx === endIdx) return [to];

    // A* pathfinding
    const open = new Set<number>([startIdx]);
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();

    for (let i = 0; i < this.nodes.length; i++) {
      gScore.set(i, Infinity);
      fScore.set(i, Infinity);
    }
    gScore.set(startIdx, 0);
    fScore.set(startIdx, this.nodes[startIdx].distanceTo(this.nodes[endIdx]));

    let iterations = 0;
    while (open.size > 0 && iterations < 500) {
      iterations++;
      // Get node with lowest fScore
      let current = -1;
      let lowestF = Infinity;
      for (const node of open) {
        const f = fScore.get(node) ?? Infinity;
        if (f < lowestF) { lowestF = f; current = node; }
      }

      if (current === endIdx) {
        // Reconstruct path
        const path: THREE.Vector3[] = [to];
        let c = current;
        while (cameFrom.has(c)) {
          c = cameFrom.get(c)!;
          path.unshift(this.nodes[c].clone());
        }
        return path;
      }

      open.delete(current);
      const neighbors = this.edges.get(current) ?? [];
      for (const neighbor of neighbors) {
        const tentativeG = (gScore.get(current) ?? Infinity) + this.nodes[current].distanceTo(this.nodes[neighbor]);
        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG + this.nodes[neighbor].distanceTo(this.nodes[endIdx]));
          open.add(neighbor);
        }
      }
    }

    return [to]; // fallback direct
  }

  private nearestNode(pos: THREE.Vector3): number {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const d = this.nodes[i].distanceTo(pos);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }
}
