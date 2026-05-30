export class Crosshair {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:4px;height:4px;background:#fff;border-radius:50%;
      box-shadow:0 0 3px #000;pointer-events:none;
    `;
    container.appendChild(this.el);
  }

  setSpread(amount: number): void {
    const size = 4 + amount;
    this.el.style.width = `${size}px`;
    this.el.style.height = `${size}px`;
  }

  setADS(adsProgress: number): void {
    this.el.style.opacity = String(1 - adsProgress);
  }
}
