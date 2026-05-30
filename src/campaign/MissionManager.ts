import * as THREE from 'three';

export interface Objective {
  id: string;
  description: string;
  position: THREE.Vector3;
  radius: number;
  completed: boolean;
  type: 'reach' | 'kill' | 'survive' | 'defend';
  targetCount?: number;
  currentCount?: number;
}

export interface EnemyWaveDef {
  positions: THREE.Vector3[];
  difficulty: 'RECRUIT' | 'REGULAR' | 'HARDENED' | 'VETERAN';
  patrolPath?: THREE.Vector3[];
  triggerRadius?: number;
  triggerPosition?: THREE.Vector3;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  mapId: 'freight';
  playerSpawn: THREE.Vector3;
  playerRotation: number;
  objectives: Objective[];
  enemyWaves: EnemyWaveDef[];
  checkpoints: THREE.Vector3[];
  ambientDialogue: string[];
}

export class MissionManager {
  private missions: Mission[] = [];
  private currentMission: Mission | null = null;
  private currentMissionIndex = 0;

  onMissionComplete: (() => void) | null = null;
  onObjectiveUpdate: ((obj: Objective) => void) | null = null;

  constructor() {
    this.buildMissions();
  }

  private buildMissions(): void {
    this.missions = [
      {
        id: 'mission_01',
        name: 'Operation: Ghost Reboot',
        description: 'Infiltrate the freight yard and eliminate hostile forces.',
        mapId: 'freight',
        playerSpawn: new THREE.Vector3(0, 1.65, 44),
        playerRotation: Math.PI,
        objectives: [
          {
            id: 'obj_01', description: 'Eliminate all hostiles in the freight yard',
            position: new THREE.Vector3(0, 0, 0), radius: 60,
            completed: false, type: 'kill', targetCount: 12, currentCount: 0
          },
          {
            id: 'obj_02', description: 'Reach the warehouse',
            position: new THREE.Vector3(0, 0, -30), radius: 10,
            completed: false, type: 'reach'
          },
          {
            id: 'obj_03', description: 'Secure the area',
            position: new THREE.Vector3(0, 0, -20), radius: 15,
            completed: false, type: 'survive', targetCount: 30, currentCount: 0
          }
        ],
        enemyWaves: [
          {
            positions: [
              new THREE.Vector3(-10, 1.65, 10),
              new THREE.Vector3(10, 1.65, 10),
              new THREE.Vector3(-20, 1.65, 0),
              new THREE.Vector3(20, 1.65, 0),
            ],
            difficulty: 'REGULAR',
            patrolPath: [
              new THREE.Vector3(-10, 1.65, 10),
              new THREE.Vector3(10, 1.65, 10),
              new THREE.Vector3(0, 1.65, 20),
            ]
          },
          {
            positions: [
              new THREE.Vector3(-5, 1.65, -5),
              new THREE.Vector3(5, 1.65, -5),
              new THREE.Vector3(-15, 1.65, -15),
              new THREE.Vector3(15, 1.65, -15),
            ],
            difficulty: 'HARDENED',
            triggerPosition: new THREE.Vector3(0, 0, 15),
            triggerRadius: 20
          },
          {
            positions: [
              new THREE.Vector3(-10, 1.65, -25),
              new THREE.Vector3(0, 1.65, -28),
              new THREE.Vector3(10, 1.65, -25),
              new THREE.Vector3(-5, 1.65, -35),
            ],
            difficulty: 'HARDENED',
            triggerPosition: new THREE.Vector3(0, 0, -10),
            triggerRadius: 15
          }
        ],
        checkpoints: [
          new THREE.Vector3(0, 1.65, 30),
          new THREE.Vector3(0, 1.65, 10),
          new THREE.Vector3(0, 1.65, -15),
        ],
        ambientDialogue: [
          'Hesh: Logan, eyes up. Contacts ahead.',
          'Hesh: Multiple targets. Stay low.',
          'Hesh: Ghost team, move up.',
          'Hesh: Clear! Push to the warehouse.',
          'Hesh: Good kill. Keep moving.',
        ]
      },
      {
        id: 'mission_02',
        name: 'No Man\'s Land',
        description: 'Hold the freight yard against enemy counterattack.',
        mapId: 'freight',
        playerSpawn: new THREE.Vector3(0, 1.65, -30),
        playerRotation: 0,
        objectives: [
          {
            id: 'obj_defend', description: 'Defend the position for 120 seconds',
            position: new THREE.Vector3(0, 0, -25), radius: 20,
            completed: false, type: 'defend', targetCount: 120, currentCount: 0
          },
          {
            id: 'obj_kills', description: 'Eliminate 20 enemies',
            position: new THREE.Vector3(0, 0, 0), radius: 60,
            completed: false, type: 'kill', targetCount: 20, currentCount: 0
          }
        ],
        enemyWaves: [
          {
            positions: Array.from({ length: 6 }, (_, i) => new THREE.Vector3(-15 + i * 6, 1.65, 40)),
            difficulty: 'REGULAR',
          },
          {
            positions: Array.from({ length: 6 }, (_, i) => new THREE.Vector3(-15 + i * 6, 1.65, 44)),
            difficulty: 'HARDENED',
            triggerPosition: new THREE.Vector3(0, 0, -25),
            triggerRadius: 100
          },
          {
            positions: Array.from({ length: 4 }, (_, i) => new THREE.Vector3(-10 + i * 6, 1.65, 40)),
            difficulty: 'VETERAN',
            triggerPosition: new THREE.Vector3(0, 0, -25),
            triggerRadius: 100
          }
        ],
        checkpoints: [new THREE.Vector3(0, 1.65, -25)],
        ambientDialogue: [
          'Hesh: They\'re coming from the south!',
          'Hesh: Hold the line!',
          'Hesh: They keep coming!',
          'Hesh: Almost there, stay with me!',
        ]
      }
    ];

    // Generate remaining 16 missions with variations
    for (let i = 3; i <= 18; i++) {
      this.missions.push(this.generateMission(i));
    }
  }

  private generateMission(num: number): Mission {
    const names = [
      'Steel Rain', 'Black Friday', 'Into the Deep',
      'Clockwork', 'All or Nothing', 'Sin City',
      'End of the Line', 'Severed Ties', 'Loki',
      'The Ghost Killer', 'Federation Day', 'Birds of Prey',
      'Homecoming', 'Legends Never Die', 'The Hunt', 'Rorke'
    ];
    const diffs: Array<'RECRUIT' | 'REGULAR' | 'HARDENED' | 'VETERAN'> = ['REGULAR', 'REGULAR', 'HARDENED', 'HARDENED', 'VETERAN', 'VETERAN'];
    const diff = diffs[Math.min(Math.floor((num - 3) / 3), diffs.length - 1)];

    return {
      id: `mission_${num.toString().padStart(2, '0')}`,
      name: names[num - 3] ?? `Mission ${num}`,
      description: `Ghost team operation #${num}.`,
      mapId: 'freight',
      playerSpawn: new THREE.Vector3(0, 1.65, 44),
      playerRotation: Math.PI,
      objectives: [
        {
          id: `obj_${num}_main`,
          description: 'Eliminate all hostiles',
          position: new THREE.Vector3(0, 0, 0), radius: 70,
          completed: false, type: 'kill',
          targetCount: 8 + num * 2, currentCount: 0
        }
      ],
      enemyWaves: [
        {
          positions: Array.from({ length: Math.min(4 + num, 10) }, (_, i) =>
            new THREE.Vector3(-10 + (i % 5) * 5, 1.65, 5 - Math.floor(i / 5) * 15)),
          difficulty: diff
        }
      ],
      checkpoints: [new THREE.Vector3(0, 1.65, 20)],
      ambientDialogue: [
        `Hesh: Mission ${num} active.`,
        'Hesh: Stay sharp out there.',
      ]
    };
  }

  loadMission(index: number): Mission | null {
    if (index < 0 || index >= this.missions.length) return null;
    this.currentMissionIndex = index;
    this.currentMission = this.missions[index];

    // Reset objectives
    for (const obj of this.currentMission.objectives) {
      obj.completed = false;
      obj.currentCount = 0;
    }

    return this.currentMission;
  }

  getCurrentMission(): Mission | null {
    return this.currentMission;
  }

  onEnemyKilled(): void {
    if (!this.currentMission) return;
    for (const obj of this.currentMission.objectives) {
      if (obj.type === 'kill' && !obj.completed) {
        obj.currentCount = (obj.currentCount ?? 0) + 1;
        if (obj.currentCount >= (obj.targetCount ?? 1)) {
          obj.completed = true;
          if (this.onObjectiveUpdate) this.onObjectiveUpdate(obj);
        }
      }
    }
    this.checkMissionComplete();
  }

  onPlayerReachedPosition(pos: THREE.Vector3): void {
    if (!this.currentMission) return;
    for (const obj of this.currentMission.objectives) {
      if (obj.type === 'reach' && !obj.completed) {
        if (pos.distanceTo(obj.position) < obj.radius) {
          obj.completed = true;
          if (this.onObjectiveUpdate) this.onObjectiveUpdate(obj);
        }
      }
    }
    this.checkMissionComplete();
  }

  updateSurviveTimer(dt: number): void {
    if (!this.currentMission) return;
    for (const obj of this.currentMission.objectives) {
      if (obj.type === 'survive' && !obj.completed) {
        obj.currentCount = (obj.currentCount ?? 0) + dt;
        if (obj.currentCount >= (obj.targetCount ?? 30)) {
          obj.completed = true;
          if (this.onObjectiveUpdate) this.onObjectiveUpdate(obj);
        }
      }
    }
    this.checkMissionComplete();
  }

  private checkMissionComplete(): void {
    if (!this.currentMission) return;
    const allDone = this.currentMission.objectives.every(o => o.completed);
    if (allDone && this.onMissionComplete) {
      this.onMissionComplete();
    }
  }

  getMissions(): Mission[] {
    return this.missions;
  }
}
