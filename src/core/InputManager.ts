export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  prone: boolean;
  fire: boolean;
  ads: boolean;
  reload: boolean;
  interact: boolean;
  grenade: boolean;
  menu: boolean;
  mouseX: number;
  mouseY: number;
  mouseDeltaX: number;
  mouseDeltaY: number;
  sensitivity: number;
  isPointerLocked: boolean;
}

export class InputManager {
  private state: InputState = {
    forward: false, back: false, left: false, right: false,
    sprint: false, crouch: false, jump: false, prone: false,
    fire: false, ads: false, reload: false, interact: false,
    grenade: false, menu: false,
    mouseX: 0, mouseY: 0, mouseDeltaX: 0, mouseDeltaY: 0,
    sensitivity: 0.002,
    isPointerLocked: false
  };

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents(): void {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    this.canvas.addEventListener('click', () => {
      if (!this.state.isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.setKey(e.code, true);
    if (e.code === 'Escape') {
      document.exitPointerLock();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.setKey(e.code, false);
  }

  private setKey(code: string, value: boolean): void {
    switch (code) {
      case 'KeyW': case 'ArrowUp': this.state.forward = value; break;
      case 'KeyS': case 'ArrowDown': this.state.back = value; break;
      case 'KeyA': case 'ArrowLeft': this.state.left = value; break;
      case 'KeyD': case 'ArrowRight': this.state.right = value; break;
      case 'ShiftLeft': case 'ShiftRight': this.state.sprint = value; break;
      case 'ControlLeft': case 'ControlRight': this.state.crouch = value; break;
      case 'Space': this.state.jump = value; break;
      case 'KeyZ': this.state.prone = value; break;
      case 'KeyR': this.state.reload = value; break;
      case 'KeyF': this.state.interact = value; break;
      case 'KeyG': this.state.grenade = value; break;
      case 'Escape': this.state.menu = value; break;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) this.state.fire = true;
    if (e.button === 2) this.state.ads = true;
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.state.fire = false;
    if (e.button === 2) this.state.ads = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.state.isPointerLocked) {
      this.state.mouseDeltaX = e.movementX;
      this.state.mouseDeltaY = e.movementY;
    }
  }

  private onPointerLockChange(): void {
    this.state.isPointerLocked = document.pointerLockElement === this.canvas;
  }

  getState(): InputState {
    return this.state;
  }

  consumeMouseDelta(): { x: number; y: number } {
    const dx = this.state.mouseDeltaX;
    const dy = this.state.mouseDeltaY;
    this.state.mouseDeltaX = 0;
    this.state.mouseDeltaY = 0;
    return { x: dx, y: dy };
  }

  setSensitivity(s: number): void {
    this.state.sensitivity = s;
  }

  requestPointerLock(): void {
    this.canvas.requestPointerLock();
  }
}
