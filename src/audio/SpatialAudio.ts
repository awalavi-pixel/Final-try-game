import type { AudioManager } from './AudioManager';

export class SpatialAudio {
  constructor(private audioManager: AudioManager) {}

  updateListenerFromCamera(camera: { position: { x: number; y: number; z: number }; getWorldDirection: (v: { x: number; y: number; z: number }) => { x: number; y: number; z: number } }): void {
    const fwd = { x: 0, y: 0, z: -1 };
    camera.getWorldDirection(fwd);
    this.audioManager.updateListener(
      camera.position.x, camera.position.y, camera.position.z,
      fwd.x, fwd.y, fwd.z,
      0, 1, 0
    );
  }
}
