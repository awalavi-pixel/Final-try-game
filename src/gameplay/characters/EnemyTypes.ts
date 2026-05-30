export interface EnemyTypeDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  health: number;
  primaryWeapon: string;
  sidearmWeapon: string;
  grenadeChance: number;
  armorMultiplier: number;
  color: number;
}

export const ENEMY_TYPES: EnemyTypeDef[] = [
  {
    id: 'militia', name: 'Federation Militia', tier: 1,
    health: 60, primaryWeapon: 'ak12', sidearmWeapon: 'm9a1',
    grenadeChance: 0.1, armorMultiplier: 1.0, color: 0x3a4a3a
  },
  {
    id: 'soldier', name: 'Federation Soldier', tier: 2,
    health: 80, primaryWeapon: 'sa805', sidearmWeapon: 'p226',
    grenadeChance: 0.2, armorMultiplier: 0.9, color: 0x2a3a2a
  },
  {
    id: 'veteran', name: 'Federation Veteran', tier: 3,
    health: 100, primaryWeapon: 'fad', sidearmWeapon: 'deagle',
    grenadeChance: 0.3, armorMultiplier: 0.8, color: 0x1a2a1a
  },
  {
    id: 'heavygunner', name: 'Federation Heavy', tier: 4,
    health: 150, primaryWeapon: 'bizon', sidearmWeapon: 'mp443',
    grenadeChance: 0.4, armorMultiplier: 0.7, color: 0x1a1a2a
  },
  {
    id: 'elite', name: 'Federation Elite', tier: 5,
    health: 120, primaryWeapon: 'honeybadger', sidearmWeapon: 'deagle',
    grenadeChance: 0.5, armorMultiplier: 0.6, color: 0x0a0a1a
  }
];

export function getEnemyType(id: string): EnemyTypeDef | undefined {
  return ENEMY_TYPES.find(e => e.id === id);
}
