import * as THREE from 'three';

export interface CoverNode {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  quality: number; // 0-1 rating
}

export interface SpawnPoint {
  position: THREE.Vector3;
  team: 0 | 1;
  rotation: number;
}

export class FreightMap {
  scene: THREE.Scene;
  collidables: THREE.Mesh[] = [];
  coverNodes: CoverNode[] = [];
  spawnPoints: SpawnPoint[] = [];

  private containerMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildContainerMaterials();
    this.build();
  }

  private buildContainerMaterials(): void {
    const colors = [0x8B4513, 0x2F4F4F, 0x8B0000, 0x006400, 0x00008B, 0x4B4B00, 0x3D3D3D];
    for (const c of colors) {
      const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.3 });
      this.containerMaterials.push(mat);
    }
  }

  private build(): void {
    this.buildGround();
    this.buildContainers();
    this.buildRailCars();
    this.buildWarehouse();
    this.buildFences();
    this.buildLighting();
    this.buildSpawnPoints();
    this.buildDebris();
  }

  private buildGround(): void {
    // Main ground
    const groundGeo = new THREE.PlaneGeometry(120, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.95, metalness: 0.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData['collidable'] = true;
    this.scene.add(ground);
    this.collidables.push(ground);

    // Rail tracks
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.8 });
    for (let t = 0; t < 2; t++) {
      const trackGeo = new THREE.BoxGeometry(80, 0.1, 0.2);
      const track = new THREE.Mesh(trackGeo, trackMat);
      track.position.set(0, 0.05, -10 + t * 3.5);
      this.scene.add(track);
    }
    // Rail ties
    const tieGeo = new THREE.BoxGeometry(3, 0.1, 0.6);
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.9 });
    for (let i = -20; i <= 20; i++) {
      const tie = new THREE.Mesh(tieGeo, tieMat);
      tie.position.set(i * 2, 0.05, -8.25);
      this.scene.add(tie);
    }
  }

  private addContainer(x: number, y: number, z: number, rotY: number, matIndex = 0): void {
    const geo = new THREE.BoxGeometry(6.1, 2.4, 2.4);
    const mat = this.containerMaterials[matIndex % this.containerMaterials.length];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + 1.2, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData['collidable'] = true;
    this.scene.add(mesh);
    this.collidables.push(mesh);

    // Add cover nodes on all sides
    const sides = [
      new THREE.Vector3(3.2, 0, 0),
      new THREE.Vector3(-3.2, 0, 0),
      new THREE.Vector3(0, 0, 1.3),
      new THREE.Vector3(0, 0, -1.3),
    ];
    const normals = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];
    for (let s = 0; s < 4; s++) {
      const nodePos = sides[s].clone();
      nodePos.applyEuler(new THREE.Euler(0, rotY, 0));
      nodePos.add(new THREE.Vector3(x, y + 0.8, z));
      this.coverNodes.push({
        position: nodePos,
        normal: normals[s].clone().applyEuler(new THREE.Euler(0, rotY, 0)),
        quality: 0.8
      });
    }
  }

  private buildContainers(): void {
    // Left stack area (x < -15)
    const leftStacks = [
      [-38, 0, 20, 0, 0], [-38, 2.4, 20, 0, 1], [-38, 4.8, 20, 0, 2],
      [-32, 0, 20, 0, 3], [-32, 2.4, 20, 0, 4],
      [-38, 0, 28, 0, 1], [-38, 2.4, 28, 0, 2],
      [-32, 0, 28, 0, 0],
      [-38, 0, 12, 0, 2], [-32, 0, 12, 0, 3], [-32, 2.4, 12, 0, 1],
      [-25, 0, 8, Math.PI / 2, 0], [-25, 2.4, 8, Math.PI / 2, 2],
      [-20, 0, 15, 0, 4], [-20, 2.4, 15, 0, 5],
      [-15, 0, 25, 0, 3], [-15, 0, 32, 0, 1], [-15, 2.4, 32, 0, 0],
    ];
    for (const [x, y, z, r, m] of leftStacks) {
      this.addContainer(x as number, y as number, z as number, r as number, m as number);
    }

    // Right stack area (x > 15)
    const rightStacks = [
      [35, 0, 20, 0, 1], [35, 2.4, 20, 0, 2], [35, 4.8, 20, 0, 3],
      [29, 0, 20, 0, 4], [29, 2.4, 20, 0, 0],
      [35, 0, 28, 0, 2], [35, 2.4, 28, 0, 3],
      [29, 0, 28, 0, 1], [29, 2.4, 28, 0, 4],
      [35, 0, 12, 0, 3], [29, 0, 12, 0, 0], [29, 2.4, 12, 0, 2],
      [22, 0, 8, Math.PI / 2, 1], [22, 2.4, 8, Math.PI / 2, 3],
      [17, 0, 15, 0, 5], [17, 2.4, 15, 0, 1],
      [12, 0, 25, 0, 2], [12, 0, 32, 0, 3], [12, 2.4, 32, 0, 4],
    ];
    for (const [x, y, z, r, m] of rightStacks) {
      this.addContainer(x as number, y as number, z as number, r as number, m as number);
    }

    // Center containers (cover in middle)
    const centerContainers = [
      [-5, 0, 18, 0, 0], [5, 0, 18, 0, 2],
      [0, 0, 22, Math.PI / 2, 1],
      [-5, 0, 35, 0, 3], [5, 0, 35, 0, 4],
      [0, 0, -5, Math.PI / 2, 5],
      [-8, 0, -5, 0, 1], [8, 0, -5, 0, 2],
      [0, 0, -15, 0, 3], [-10, 0, -18, 0, 4], [10, 0, -18, 0, 0],
    ];
    for (const [x, y, z, r, m] of centerContainers) {
      this.addContainer(x as number, y as number, z as number, r as number, m as number);
    }
  }

  private addRailCar(x: number, z: number): void {
    // Body
    const bodyGeo = new THREE.BoxGeometry(12, 3.2, 2.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, metalness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(x, 1.8, z);
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData['collidable'] = true;
    this.scene.add(body);
    this.collidables.push(body);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.9 });
    for (let w = -2; w <= 2; w += 2) {
      for (const side of [-1.5, 1.5]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x + w * 2, 0.5, z + side);
        this.scene.add(wheel);
      }
    }

    // Cover nodes
    this.coverNodes.push(
      { position: new THREE.Vector3(x - 7, 0.8, z + 1.8), normal: new THREE.Vector3(-1, 0, 0), quality: 0.9 },
      { position: new THREE.Vector3(x + 7, 0.8, z + 1.8), normal: new THREE.Vector3(1, 0, 0), quality: 0.9 },
      { position: new THREE.Vector3(x, 0.8, z + 1.8), normal: new THREE.Vector3(0, 0, 1), quality: 0.7 },
      { position: new THREE.Vector3(x, 0.8, z - 1.8), normal: new THREE.Vector3(0, 0, -1), quality: 0.7 },
    );
  }

  private buildRailCars(): void {
    this.addRailCar(-18, -8.25);
    this.addRailCar(4, -8.25);
    this.addRailCar(26, -8.25);
  }

  private buildWarehouse(): void {
    // Warehouse walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.9 });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 0.5), wallMat);
    backWall.position.set(0, 5, -40);
    backWall.userData['collidable'] = true;
    this.scene.add(backWall);
    this.collidables.push(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 30), wallMat);
    leftWall.position.set(-20, 5, -25);
    leftWall.userData['collidable'] = true;
    this.scene.add(leftWall);
    this.collidables.push(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 30), wallMat);
    rightWall.position.set(20, 5, -25);
    rightWall.userData['collidable'] = true;
    this.scene.add(rightWall);
    this.collidables.push(rightWall);

    // Roof
    const roofGeo = new THREE.BoxGeometry(41, 0.5, 30);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x666656, roughness: 1 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 10, -25);
    roof.userData['collidable'] = true;
    this.scene.add(roof);
    this.collidables.push(roof);

    // Doorways (open, just mark positions)
    // Left door
    const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 4), wallMat);
    doorFrameL.position.set(-20, 3, -10);
    this.scene.add(doorFrameL);

    // Right door
    const doorFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 4), wallMat);
    doorFrameR.position.set(20, 3, -10);
    this.scene.add(doorFrameR);

    // Interior supports/pillars
    const pillarGeo = new THREE.BoxGeometry(0.6, 10, 0.6);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x706050, roughness: 0.8, metalness: 0.3 });
    const pillarPositions = [[-12, -20], [0, -20], [12, -20], [-12, -30], [0, -30], [12, -30]];
    for (const [px, pz] of pillarPositions) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px as number, 5, pz as number);
      pillar.castShadow = true;
      pillar.userData['collidable'] = true;
      this.scene.add(pillar);
      this.collidables.push(pillar);
      this.coverNodes.push({
        position: new THREE.Vector3((px as number) + 0.6, 1.0, pz as number),
        normal: new THREE.Vector3(1, 0, 0),
        quality: 0.6
      });
    }

    // Warehouse crates/boxes
    const crateGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 0.9 });
    const cratePos = [
      [-14, 0.75, -22], [-12, 0.75, -22], [-14, 2.25, -22],
      [8, 0.75, -28], [10, 0.75, -28], [8, 2.25, -28],
      [-8, 0.75, -35], [-6, 0.75, -35],
      [14, 0.75, -35], [12, 0.75, -35], [14, 2.25, -35],
    ];
    for (const [cx, cy, cz] of cratePos) {
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(cx as number, cy as number, cz as number);
      crate.userData['collidable'] = true;
      this.scene.add(crate);
      this.collidables.push(crate);
    }

    // Roof access ladder (visual only)
    const ladderMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    for (let i = 0; i < 10; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), ladderMat);
      rung.position.set(20, i * 1.0 + 0.5, -38);
      this.scene.add(rung);
    }
    for (const sx of [-0.25, 0.25]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 10, 0.05), ladderMat);
      rail.position.set(20 + sx, 5, -38);
      this.scene.add(rail);
    }
  }

  private buildFences(): void {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.8, metalness: 0.5, wireframe: false });

    // Perimeter fences
    const segments = [
      // Format: x, y, z, width, height, rotY
      [0, 3, 50, 120, 6, 0],   // Front
      [0, 3, -50, 120, 6, 0],  // not used, warehouse there
      [-60, 3, 0, 0.5, 6, 0],  // Left
      [60, 3, 0, 0.5, 6, 0],   // Right
    ];

    for (const [x, y, z, w, h, rot] of segments) {
      if (w === 0) continue;
      const geo = new THREE.BoxGeometry(w as number, h as number, 0.1);
      const mesh = new THREE.Mesh(geo, fenceMat);
      mesh.position.set(x as number, y as number, z as number);
      mesh.rotation.y = rot as number;
      this.scene.add(mesh);
    }

    // Concrete barriers
    const barrierGeo = new THREE.BoxGeometry(3, 1.2, 0.8);
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.95 });
    const barrierPositions = [
      [-5, 0, 5], [5, 0, 5], [-12, 0, 0], [12, 0, 0],
      [0, 0, -2], [-18, 0, 5], [18, 0, 5],
      [0, 0, 42], [-8, 0, 42], [8, 0, 42],
    ];
    for (const [bx, , bz] of barrierPositions) {
      const barrier = new THREE.Mesh(barrierGeo, barrierMat);
      barrier.position.set(bx as number, 0.6, bz as number);
      barrier.castShadow = true;
      barrier.userData['collidable'] = true;
      this.scene.add(barrier);
      this.collidables.push(barrier);
      this.coverNodes.push({
        position: new THREE.Vector3((bx as number), 0.9, (bz as number) + 0.5),
        normal: new THREE.Vector3(0, 0, 1),
        quality: 0.85
      });
    }
  }

  private buildLighting(): void {
    // Industrial sunset ambient
    const ambient = new THREE.AmbientLight(0x8a9060, 0.4);
    this.scene.add(ambient);

    // Sun (low angle, orange-red)
    const sun = new THREE.DirectionalLight(0xff8844, 1.2);
    sun.position.set(-30, 20, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    this.scene.add(sun);

    // Point lights inside warehouse
    const warehouseLights = [
      { pos: [-10, 8, -20], color: 0xffeedd, intensity: 2 },
      { pos: [0, 8, -25], color: 0xffeedd, intensity: 2 },
      { pos: [10, 8, -30], color: 0xffeedd, intensity: 1.5 },
    ];
    for (const l of warehouseLights) {
      const light = new THREE.PointLight(l.color, l.intensity, 20);
      light.position.set(l.pos[0], l.pos[1], l.pos[2]);
      this.scene.add(light);
    }

    // Street lights
    const lampPositions = [[-20, 0, 10], [20, 0, 10], [-20, 0, 30], [20, 0, 30]];
    for (const [lx, , lz] of lampPositions) {
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(lx as number, 3, lz as number);
      this.scene.add(pole);

      const bulbGeo = new THREE.SphereGeometry(0.2);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(lx as number, 6.2, lz as number);
      this.scene.add(bulb);

      const light = new THREE.PointLight(0xffee88, 1.5, 15);
      light.position.set(lx as number, 6, lz as number);
      this.scene.add(light);
    }

    // Sky
    this.scene.background = new THREE.Color(0x4a3a2a);
    this.scene.fog = new THREE.Fog(0x4a3a2a, 60, 150);
  }

  private buildSpawnPoints(): void {
    // Team 0 spawns (south)
    for (let i = 0; i < 6; i++) {
      this.spawnPoints.push({
        position: new THREE.Vector3(-10 + i * 4, 1.65, 44),
        team: 0,
        rotation: Math.PI
      });
    }
    // Team 1 spawns (north, in/near warehouse)
    for (let i = 0; i < 6; i++) {
      this.spawnPoints.push({
        position: new THREE.Vector3(-10 + i * 4, 1.65, -38),
        team: 1,
        rotation: 0
      });
    }
  }

  private buildDebris(): void {
    // Rubble/scatter
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x706050, roughness: 1 });
    for (let i = 0; i < 30; i++) {
      const size = 0.2 + Math.random() * 0.5;
      const geo = new THREE.BoxGeometry(size, size * 0.5, size);
      const mesh = new THREE.Mesh(geo, debrisMat);
      mesh.position.set(
        (Math.random() - 0.5) * 80,
        size * 0.25,
        (Math.random() - 0.5) * 80
      );
      mesh.rotation.y = Math.random() * Math.PI;
      this.scene.add(mesh);
    }

    // Barrels
    const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 10);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x304050, roughness: 0.7, metalness: 0.4 });
    const barrelPositions = [
      [-15, 0, -8], [15, 0, -8], [-5, 0, 10], [5, 0, 10],
      [-25, 0, 20], [25, 0, 20], [0, 0, 38],
    ];
    for (const [bx, , bz] of barrelPositions) {
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(bx as number, 0.4, bz as number);
      barrel.userData['collidable'] = true;
      this.scene.add(barrel);
      this.collidables.push(barrel);
      this.coverNodes.push({
        position: new THREE.Vector3((bx as number) + 0.4, 0.6, bz as number),
        normal: new THREE.Vector3(1, 0, 0),
        quality: 0.5
      });
    }
  }

  getSpawn(team: 0 | 1): SpawnPoint {
    const spawns = this.spawnPoints.filter(s => s.team === team);
    return spawns[Math.floor(Math.random() * spawns.length)];
  }

  getBestCoverNode(position: THREE.Vector3, threatDir: THREE.Vector3): CoverNode | null {
    let best: CoverNode | null = null;
    let bestScore = -Infinity;

    for (const node of this.coverNodes) {
      const dist = node.position.distanceTo(position);
      if (dist > 20) continue;
      // Cover quality + facing threat
      const dotToThreat = node.normal.dot(threatDir);
      const score = node.quality - dotToThreat * 0.5 - dist * 0.02;
      if (score > bestScore) {
        bestScore = score;
        best = node;
      }
    }
    return best;
  }
}
