export type WeaponCategory = 'AR' | 'SMG' | 'SR' | 'SG' | 'PISTOL' | 'EQUIPMENT';
export type FireMode = 'auto' | 'semi' | 'burst' | 'bolt';

export interface WeaponStats {
  id: string;
  name: string;
  category: WeaponCategory;
  damage: number;
  rpm: number;
  magazineSize: number;
  reserveAmmo: number;
  range: number;           // effective range in meters
  fireMode: FireMode;
  burstCount?: number;
  suppressedDefault?: boolean;
  adsTime: number;         // seconds
  reloadTime: number;      // seconds (tactical)
  reloadEmptyTime: number; // seconds (empty mag)
  spreadBase: number;
  spreadADS: number;
  recoilPattern: { x: number; y: number }[];
}

export const ALL_WEAPONS: WeaponStats[] = [
  // ASSAULT RIFLES
  {
    id: 'msbs', name: 'MSBS', category: 'AR',
    damage: 40, rpm: 750, magazineSize: 30, reserveAmmo: 120,
    range: 40, fireMode: 'burst', burstCount: 3,
    adsTime: 0.2, reloadTime: 1.8, reloadEmptyTime: 2.3,
    spreadBase: 0.03, spreadADS: 0.008,
    recoilPattern: [
      {x:0,y:0.5},{x:0.1,y:0.6},{x:-0.1,y:0.7},
      {x:0.2,y:0.6},{x:-0.2,y:0.7},{x:0,y:0.5}
    ]
  },
  {
    id: 'sc2010', name: 'SC-2010', category: 'AR',
    damage: 38, rpm: 800, magazineSize: 30, reserveAmmo: 120,
    range: 45, fireMode: 'auto',
    adsTime: 0.2, reloadTime: 1.9, reloadEmptyTime: 2.4,
    spreadBase: 0.03, spreadADS: 0.007,
    recoilPattern: [
      {x:0,y:0.4},{x:0.15,y:0.5},{x:-0.15,y:0.5},
      {x:0.1,y:0.6},{x:-0.1,y:0.6},{x:0,y:0.5}
    ]
  },
  {
    id: 'sa805', name: 'SA-805', category: 'AR',
    damage: 42, rpm: 680, magazineSize: 30, reserveAmmo: 120,
    range: 55, fireMode: 'auto',
    adsTime: 0.22, reloadTime: 2.0, reloadEmptyTime: 2.5,
    spreadBase: 0.025, spreadADS: 0.006,
    recoilPattern: [
      {x:0,y:0.45},{x:0.1,y:0.55},{x:-0.05,y:0.6},
      {x:0.05,y:0.55},{x:-0.1,y:0.6},{x:0,y:0.5}
    ]
  },
  {
    id: 'fad', name: 'FAD', category: 'AR',
    damage: 35, rpm: 900, magazineSize: 35, reserveAmmo: 140,
    range: 35, fireMode: 'auto',
    adsTime: 0.18, reloadTime: 1.7, reloadEmptyTime: 2.2,
    spreadBase: 0.04, spreadADS: 0.01,
    recoilPattern: [
      {x:0,y:0.35},{x:0.2,y:0.45},{x:-0.2,y:0.5},
      {x:0.15,y:0.45},{x:-0.15,y:0.5},{x:0,y:0.4}
    ]
  },
  {
    id: 'ak12', name: 'AK-12', category: 'AR',
    damage: 44, rpm: 660, magazineSize: 30, reserveAmmo: 120,
    range: 60, fireMode: 'auto',
    adsTime: 0.22, reloadTime: 2.1, reloadEmptyTime: 2.6,
    spreadBase: 0.028, spreadADS: 0.006,
    recoilPattern: [
      {x:0,y:0.5},{x:0.2,y:0.6},{x:-0.1,y:0.65},
      {x:0.1,y:0.6},{x:-0.2,y:0.65},{x:0,y:0.55}
    ]
  },
  {
    id: 'arx160', name: 'ARX-160', category: 'AR',
    damage: 36, rpm: 850, magazineSize: 30, reserveAmmo: 120,
    range: 38, fireMode: 'auto',
    adsTime: 0.19, reloadTime: 1.8, reloadEmptyTime: 2.3,
    spreadBase: 0.035, spreadADS: 0.009,
    recoilPattern: [
      {x:0,y:0.4},{x:0.18,y:0.5},{x:-0.18,y:0.55},
      {x:0.1,y:0.5},{x:-0.1,y:0.55},{x:0,y:0.45}
    ]
  },
  {
    id: 'honeybadger', name: 'HoneyBadger', category: 'AR',
    damage: 40, rpm: 750, magazineSize: 30, reserveAmmo: 120,
    range: 40, fireMode: 'auto', suppressedDefault: true,
    adsTime: 0.2, reloadTime: 1.9, reloadEmptyTime: 2.4,
    spreadBase: 0.03, spreadADS: 0.008,
    recoilPattern: [
      {x:0,y:0.45},{x:0.12,y:0.55},{x:-0.12,y:0.6},
      {x:0.08,y:0.55},{x:-0.08,y:0.6},{x:0,y:0.5}
    ]
  },
  // SMGS
  {
    id: 'vector', name: 'Vector CRB', category: 'SMG',
    damage: 30, rpm: 1100, magazineSize: 25, reserveAmmo: 100,
    range: 20, fireMode: 'auto',
    adsTime: 0.15, reloadTime: 1.5, reloadEmptyTime: 2.0,
    spreadBase: 0.05, spreadADS: 0.015,
    recoilPattern: [
      {x:0,y:0.3},{x:0.25,y:0.4},{x:-0.25,y:0.45},
      {x:0.2,y:0.4},{x:-0.2,y:0.45},{x:0,y:0.35}
    ]
  },
  {
    id: 'cbjms', name: 'CBJ-MS', category: 'SMG',
    damage: 28, rpm: 1000, magazineSize: 40, reserveAmmo: 160,
    range: 22, fireMode: 'auto',
    adsTime: 0.16, reloadTime: 1.6, reloadEmptyTime: 2.1,
    spreadBase: 0.048, spreadADS: 0.014,
    recoilPattern: [
      {x:0,y:0.32},{x:0.22,y:0.42},{x:-0.22,y:0.47},
      {x:0.18,y:0.42},{x:-0.18,y:0.47},{x:0,y:0.37}
    ]
  },
  {
    id: 'bizon', name: 'Bizon', category: 'SMG',
    damage: 32, rpm: 750, magazineSize: 64, reserveAmmo: 192,
    range: 25, fireMode: 'auto',
    adsTime: 0.18, reloadTime: 2.2, reloadEmptyTime: 2.8,
    spreadBase: 0.04, spreadADS: 0.012,
    recoilPattern: [
      {x:0,y:0.35},{x:0.18,y:0.45},{x:-0.18,y:0.5},
      {x:0.14,y:0.45},{x:-0.14,y:0.5},{x:0,y:0.4}
    ]
  },
  {
    id: 'k7', name: 'K7', category: 'SMG',
    damage: 30, rpm: 900, magazineSize: 30, reserveAmmo: 120,
    range: 20, fireMode: 'auto', suppressedDefault: true,
    adsTime: 0.16, reloadTime: 1.6, reloadEmptyTime: 2.1,
    spreadBase: 0.045, spreadADS: 0.013,
    recoilPattern: [
      {x:0,y:0.33},{x:0.2,y:0.43},{x:-0.2,y:0.48},
      {x:0.16,y:0.43},{x:-0.16,y:0.48},{x:0,y:0.38}
    ]
  },
  {
    id: 'thoras12', name: 'Thor AS12', category: 'SMG',
    damage: 34, rpm: 800, magazineSize: 30, reserveAmmo: 120,
    range: 28, fireMode: 'auto',
    adsTime: 0.17, reloadTime: 1.7, reloadEmptyTime: 2.2,
    spreadBase: 0.042, spreadADS: 0.013,
    recoilPattern: [
      {x:0,y:0.36},{x:0.19,y:0.46},{x:-0.19,y:0.51},
      {x:0.15,y:0.46},{x:-0.15,y:0.51},{x:0,y:0.41}
    ]
  },
  // SNIPER RIFLES
  {
    id: 'usr', name: 'USR', category: 'SR',
    damage: 95, rpm: 50, magazineSize: 5, reserveAmmo: 25,
    range: 300, fireMode: 'bolt',
    adsTime: 0.5, reloadTime: 3.0, reloadEmptyTime: 3.5,
    spreadBase: 0.001, spreadADS: 0.0001,
    recoilPattern: [{x:0,y:2.0}]
  },
  {
    id: 'l115', name: 'L115', category: 'SR',
    damage: 99, rpm: 45, magazineSize: 5, reserveAmmo: 25,
    range: 350, fireMode: 'bolt',
    adsTime: 0.55, reloadTime: 3.2, reloadEmptyTime: 3.7,
    spreadBase: 0.001, spreadADS: 0.00005,
    recoilPattern: [{x:0,y:2.2}]
  },
  {
    id: 'svuas', name: 'SVU-AS', category: 'SR',
    damage: 70, rpm: 260, magazineSize: 10, reserveAmmo: 40,
    range: 200, fireMode: 'semi',
    adsTime: 0.4, reloadTime: 2.5, reloadEmptyTime: 3.0,
    spreadBase: 0.002, spreadADS: 0.0003,
    recoilPattern: [{x:0.1,y:1.5},{x:-0.1,y:1.6}]
  },
  {
    id: 'vks', name: 'VKS', category: 'SR',
    damage: 88, rpm: 140, magazineSize: 5, reserveAmmo: 25,
    range: 250, fireMode: 'bolt', suppressedDefault: true,
    adsTime: 0.48, reloadTime: 3.0, reloadEmptyTime: 3.5,
    spreadBase: 0.001, spreadADS: 0.00008,
    recoilPattern: [{x:0,y:1.8}]
  },
  // SHOTGUNS
  {
    id: 'mts255', name: 'MTS-255', category: 'SG',
    damage: 20, rpm: 120, magazineSize: 5, reserveAmmo: 25,
    range: 10, fireMode: 'semi',
    adsTime: 0.3, reloadTime: 0.5, reloadEmptyTime: 0.5,
    spreadBase: 0.12, spreadADS: 0.08,
    recoilPattern: [{x:0,y:1.5}]
  },
  {
    id: 'bulldog', name: 'Bulldog', category: 'SG',
    damage: 18, rpm: 200, magazineSize: 6, reserveAmmo: 30,
    range: 10, fireMode: 'auto',
    adsTime: 0.28, reloadTime: 1.8, reloadEmptyTime: 2.3,
    spreadBase: 0.13, spreadADS: 0.09,
    recoilPattern: [{x:0.05,y:1.3},{x:-0.05,y:1.4}]
  },
  {
    id: 'fingerflay', name: 'Finger-Flay', category: 'SG',
    damage: 90, rpm: 80, magazineSize: 6, reserveAmmo: 24,
    range: 15, fireMode: 'semi',
    adsTime: 0.32, reloadTime: 0.5, reloadEmptyTime: 0.5,
    spreadBase: 0.04, spreadADS: 0.02,
    recoilPattern: [{x:0,y:2.5}]
  },
  // PISTOLS
  {
    id: 'm9a1', name: 'M9A1', category: 'PISTOL',
    damage: 45, rpm: 600, magazineSize: 15, reserveAmmo: 60,
    range: 25, fireMode: 'semi',
    adsTime: 0.12, reloadTime: 1.2, reloadEmptyTime: 1.6,
    spreadBase: 0.04, spreadADS: 0.015,
    recoilPattern: [{x:0.1,y:0.6},{x:-0.1,y:0.7}]
  },
  {
    id: 'p226', name: 'P226', category: 'PISTOL',
    damage: 48, rpm: 550, magazineSize: 13, reserveAmmo: 52,
    range: 25, fireMode: 'semi',
    adsTime: 0.13, reloadTime: 1.3, reloadEmptyTime: 1.7,
    spreadBase: 0.038, spreadADS: 0.014,
    recoilPattern: [{x:0.08,y:0.65},{x:-0.08,y:0.75}]
  },
  {
    id: 'deagle', name: 'Desert Eagle', category: 'PISTOL',
    damage: 70, rpm: 400, magazineSize: 7, reserveAmmo: 35,
    range: 30, fireMode: 'semi',
    adsTime: 0.15, reloadTime: 1.5, reloadEmptyTime: 2.0,
    spreadBase: 0.06, spreadADS: 0.02,
    recoilPattern: [{x:0.2,y:1.0},{x:-0.2,y:1.1}]
  },
  {
    id: 'mp443', name: 'MP-443', category: 'PISTOL',
    damage: 44, rpm: 620, magazineSize: 17, reserveAmmo: 68,
    range: 25, fireMode: 'semi',
    adsTime: 0.12, reloadTime: 1.2, reloadEmptyTime: 1.6,
    spreadBase: 0.042, spreadADS: 0.016,
    recoilPattern: [{x:0.09,y:0.58},{x:-0.09,y:0.68}]
  }
];

export function getWeaponStats(id: string): WeaponStats | undefined {
  return ALL_WEAPONS.find(w => w.id === id);
}
