export interface DamageEvent {
  targetId: string;
  damage: number;
  hitZone: 'head' | 'torso' | 'limb';
  sourceId: string;
  direction: { x: number; y: number; z: number };
  isFatal: boolean;
}

type DamageListener = (event: DamageEvent) => void;

export class DamageSystem {
  private listeners: DamageListener[] = [];

  onDamage(fn: DamageListener): void {
    this.listeners.push(fn);
  }

  dispatch(event: DamageEvent): void {
    for (const fn of this.listeners) {
      fn(event);
    }
  }

  calcFinalDamage(
    baseDamage: number,
    hitZone: 'head' | 'torso' | 'limb',
    distance: number,
    effectiveRange: number
  ): number {
    const falloff = Math.max(0.3, 1 - (distance / effectiveRange) * 0.7);
    const zoneMultiplier = hitZone === 'head' ? 2.0 : hitZone === 'limb' ? 0.7 : 1.0;
    return baseDamage * falloff * zoneMultiplier;
  }
}
