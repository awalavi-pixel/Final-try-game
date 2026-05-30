import * as THREE from 'three';
import type { AudioManager } from '../audio/AudioManager';

export type MenuState = 'main' | 'campaign' | 'multiplayer' | 'options' | 'closed';

export class MainMenu {
  private container: HTMLElement;
  private state: MenuState = 'main';
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrame = 0;
  private bgCanvas: HTMLCanvasElement;
  private time = 0;
  private onStart: ((mode: 'campaign' | 'multiplayer') => void) | null = null;

  constructor(container: HTMLElement, audioManager: AudioManager) {
    this.container = container;

    // Background 3D scene
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;';
    this.container.appendChild(this.bgCanvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.bgCanvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0e18, 20, 80);
    this.scene.background = new THREE.Color(0x0a0e18);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 5, 20);
    this.camera.lookAt(0, 0, 0);

    this.buildBGScene();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.renderBG();
    this.showMain(audioManager);
  }

  private buildBGScene(): void {
    // Lighting
    const ambient = new THREE.AmbientLight(0x1a2030, 0.5);
    this.scene.add(ambient);
    const moonLight = new THREE.DirectionalLight(0x4060ff, 0.8);
    moonLight.position.set(-10, 20, 10);
    this.scene.add(moonLight);
    const fireLight = new THREE.PointLight(0xff6600, 2, 20);
    fireLight.position.set(0, 2, 0);
    this.scene.add(fireLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x151a10, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // Shipping containers silhouettes
    const containerColors = [0x1a2530, 0x2a1510, 0x0a1520];
    const containerPositions = [
      [-8, 1.2, -5], [-8, 3.6, -5], [8, 1.2, -8], [8, 3.6, -8],
      [0, 1.2, -15], [0, 3.6, -15], [-15, 1.2, -10], [15, 1.2, -12],
    ];
    for (const [x, y, z] of containerPositions) {
      const geo = new THREE.BoxGeometry(6.1, 2.4, 2.4);
      const mat = new THREE.MeshStandardMaterial({ color: containerColors[Math.floor(Math.random() * containerColors.length)], roughness: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x as number, y as number, z as number);
      mesh.userData['menuBG'] = true;
      this.scene.add(mesh);
    }

    // Smoke/fire particles
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff4400, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 20, Math.random() * 5, (Math.random() - 0.5) * 20);
      mesh.userData['particle'] = true;
      mesh.userData['speed'] = 0.5 + Math.random() * 1.5;
      mesh.userData['phase'] = Math.random() * Math.PI * 2;
      this.scene.add(mesh);
    }

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 300;
      positions[i * 3 + 1] = 20 + Math.random() * 80;
      positions[i * 3 + 2] = -50 + (Math.random() - 0.5) * 100;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true });
    this.scene.add(new THREE.Points(starGeo, starMat));
  }

  private renderBG(): void {
    this.time += 0.016;

    // Animate particles
    this.scene.traverse(obj => {
      if (obj.userData['particle'] && obj instanceof THREE.Mesh) {
        obj.position.y += obj.userData['speed'] as number * 0.016;
        obj.rotation.z += 0.02;
        const mat = obj.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.2 + 0.1 * Math.sin(this.time * 2 + (obj.userData['phase'] as number));
        if (obj.position.y > 15) {
          obj.position.y = 0;
          obj.position.x = (Math.random() - 0.5) * 20;
        }
      }
    });

    // Camera slow pan
    this.camera.position.x = Math.sin(this.time * 0.1) * 3;
    this.camera.position.y = 5 + Math.sin(this.time * 0.07) * 1;
    this.camera.lookAt(0, 2, 0);

    this.renderer.render(this.scene, this.camera);
    this.animFrame = requestAnimationFrame(() => this.renderBG());
  }

  private showMain(audioManager: AudioManager): void {
    // Remove existing UI
    const existing = this.container.querySelector('.menu-ui');
    if (existing) existing.remove();

    const ui = document.createElement('div');
    ui.className = 'menu-ui';
    ui.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Courier New',monospace;
    `;

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size:52px;font-weight:bold;color:#fff;letter-spacing:6px;
      text-shadow:0 0 20px rgba(255,100,0,0.8),0 0 40px rgba(255,100,0,0.4);
      margin-bottom:8px;text-transform:uppercase;
    `;
    title.textContent = 'OPERATION';
    ui.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
      font-size:28px;color:#ff8800;letter-spacing:12px;
      text-shadow:0 0 10px rgba(255,100,0,0.6);margin-bottom:60px;
      text-transform:uppercase;
    `;
    subtitle.textContent = 'GHOST REBOOT';
    ui.appendChild(subtitle);

    const menuItems = ['CAMPAIGN', 'MULTIPLAYER', 'OPTIONS', 'QUIT'];
    const menuContainer = document.createElement('div');
    menuContainer.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;';

    menuItems.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.textContent = item;
      btn.style.cssText = `
        background:transparent;border:1px solid rgba(255,255,255,0.3);
        color:#ccc;font-family:'Courier New',monospace;font-size:18px;
        letter-spacing:4px;padding:12px 48px;cursor:pointer;
        transition:all 0.2s;text-transform:uppercase;min-width:280px;
        animation:slideIn 0.3s ease-out ${i * 0.08}s both;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,100,0,0.2)';
        btn.style.color = '#ff8800';
        btn.style.borderColor = 'rgba(255,100,0,0.8)';
        btn.style.boxShadow = '0 0 12px rgba(255,100,0,0.4)';
        audioManager.playUIClick();
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
        btn.style.color = '#ccc';
        btn.style.borderColor = 'rgba(255,255,255,0.3)';
        btn.style.boxShadow = 'none';
      });
      btn.addEventListener('click', () => {
        audioManager.playUIClick();
        if (item === 'CAMPAIGN' && this.onStart) {
          this.close();
          this.onStart('campaign');
        } else if (item === 'MULTIPLAYER' && this.onStart) {
          this.close();
          this.onStart('multiplayer');
        } else if (item === 'OPTIONS') {
          this.showOptions(audioManager);
        } else if (item === 'QUIT') {
          window.close();
        }
      });
      menuContainer.appendChild(btn);
    });

    ui.appendChild(menuContainer);

    // Version
    const ver = document.createElement('div');
    ver.style.cssText = 'position:absolute;bottom:20px;right:20px;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:1px;';
    ver.textContent = 'v1.0.0 | Three.js r158';
    ui.appendChild(ver);

    // CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { opacity:0; transform:translateX(-30px); }
        to { opacity:1; transform:translateX(0); }
      }
    `;
    document.head.appendChild(style);

    this.container.appendChild(ui);
  }

  private showOptions(audioManager: AudioManager): void {
    const existing = this.container.querySelector('.menu-ui');
    if (existing) existing.remove();

    const ui = document.createElement('div');
    ui.className = 'menu-ui';
    ui.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Courier New',monospace;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-size:32px;color:#ff8800;letter-spacing:6px;margin-bottom:40px;text-transform:uppercase;';
    title.textContent = 'OPTIONS';
    ui.appendChild(title);

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
      padding:32px 48px;min-width:400px;display:flex;flex-direction:column;gap:20px;
    `;

    const options = [
      { label: 'Master Volume', min: 0, max: 1, val: 0.7, onChange: (v: number) => audioManager.setMasterVolume(v) },
      { label: 'SFX Volume', min: 0, max: 1, val: 1.0, onChange: (v: number) => audioManager.setCategoryVolume('sfx', v) },
      { label: 'Music Volume', min: 0, max: 1, val: 1.0, onChange: (v: number) => audioManager.setCategoryVolume('music', v) },
      { label: 'Mouse Sensitivity', min: 0.0005, max: 0.005, val: 0.002, onChange: (_v: number) => {} },
    ];

    options.forEach(opt => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:20px;';

      const label = document.createElement('label');
      label.style.cssText = 'color:#ccc;font-size:14px;letter-spacing:2px;min-width:160px;';
      label.textContent = opt.label;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(opt.min);
      slider.max = String(opt.max);
      slider.step = String((opt.max - opt.min) / 100);
      slider.value = String(opt.val);
      slider.style.cssText = 'flex:1;accent-color:#ff8800;cursor:pointer;';
      slider.addEventListener('input', () => opt.onChange(parseFloat(slider.value)));

      row.appendChild(label);
      row.appendChild(slider);
      panel.appendChild(row);
    });

    ui.appendChild(panel);

    const back = document.createElement('button');
    back.textContent = 'BACK';
    back.style.cssText = `
      margin-top:24px;background:transparent;border:1px solid rgba(255,255,255,0.3);
      color:#ccc;font-family:'Courier New',monospace;font-size:16px;
      letter-spacing:4px;padding:10px 40px;cursor:pointer;text-transform:uppercase;
    `;
    back.addEventListener('click', () => {
      audioManager.playUIClick();
      this.showMain(audioManager);
    });
    ui.appendChild(back);

    this.container.appendChild(ui);
  }

  onStartGame(fn: (mode: 'campaign' | 'multiplayer') => void): void {
    this.onStart = fn;
  }

  close(): void {
    cancelAnimationFrame(this.animFrame);
    this.renderer.dispose();
    this.container.style.display = 'none';
  }

  isOpen(): boolean {
    return this.container.style.display !== 'none';
  }
}
