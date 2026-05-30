import * as THREE from 'three';

export class AssetManager {
  private textures = new Map<string, THREE.Texture>();
  private materials = new Map<string, THREE.Material>();
  private geometries = new Map<string, THREE.BufferGeometry>();
  private loader = new THREE.TextureLoader();

  getTexture(key: string, url?: string): THREE.Texture {
    if (this.textures.has(key)) return this.textures.get(key)!;
    if (url) {
      const tex = this.loader.load(url);
      this.textures.set(key, tex);
      return tex;
    }
    // Procedural default texture
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    this.textures.set(key, tex);
    return tex;
  }

  getMaterial(key: string): THREE.MeshStandardMaterial | undefined {
    return this.materials.get(key) as THREE.MeshStandardMaterial | undefined;
  }

  setMaterial(key: string, mat: THREE.Material): void {
    this.materials.set(key, mat);
  }

  createProceduralTexture(color: string, roughPattern = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    if (roughPattern) {
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.2})`;
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
      }
    }
    return new THREE.CanvasTexture(canvas);
  }

  dispose(): void {
    this.textures.forEach(t => t.dispose());
    this.materials.forEach(m => m.dispose());
    this.geometries.forEach(g => g.dispose());
  }
}
