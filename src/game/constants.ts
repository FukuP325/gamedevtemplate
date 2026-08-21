export const GAME_WIDTH = 1280;

export const PLAYER_MAX_HP = 150;

export const ENEMY_MAX_HP = 100;

export const ENEMY_HP_INCREASE = 50;

export const ENEMY_ATTACK_INTERVAL = 1000;

export const ENEMY_ATTACK_INCREASE = 1;

export const PLAYER_ATTACK_INTERVAL = 200;

export const AUTO_ATTACK_INTERVAL = 800;

export const AUTO_MODE_HOLD_DURATION = 1000;

export const SKILL_COOLDOWN = 5000;

export const SKILL_DAMAGE_MULTIPLIER = 3;

export const MONEY_PUNCH_COOLDOWN = 8000;

export const HEAL_SKILL_COOLDOWN = 8000;

export const RAPID_SKILL_COOLDOWN = 10000;

export const KILLS_PER_LEVEL = 3;

export const ENEMY_DEFEAT_HEAL = 30;

export const ENEMY_RESPAWN_MIN = 500;

export const ENEMY_RESPAWN_MAX = 1000;

export const CLEAR_TICKET_PRICE = 10000;

// レアキャラ
export const RARE_ENEMY_CHANCE = 0.2;
export const RARE_ENEMY_REWARD_MULTIPLIER = 2;
export const RARE_ENEMY_COLOR = 0xf4d35e;
export const RARE_ENEMY_HEAD_COLOR = 0xffe08a;

export type Equipment = {
  name: string;
  hpBonus: number;
  price: number;
};

export const EQUIPMENTS: readonly Equipment[] = [
  { name: '丈夫な鎧', hpBonus: 50, price: 250 },
  { name: '守護の盾', hpBonus: 100, price: 500 },
  { name: '生命の指輪', hpBonus: 200, price: 1000 },
  { name: '火守りの外套', hpBonus: 300, price: 1500 },
  { name: '不屈の鎧', hpBonus: 500, price: 2500 },
  { name: '王の冠', hpBonus: 800, price: 4000 },
];

export type EnemyVariant = {
  name: string;
  shape: string;
  bodyColor: number;
  headColor: number;
  attackPower: number;
  reward: number;
  attackInterval: number;
};

export const ENEMY_VARIANTS: readonly EnemyVariant[] = [
  {
    name: 'スライム',
    shape: 'slime',
    bodyColor: 0x57cc99,
    headColor: 0x2a9d8f,
    attackPower: 3,
    reward: 50,
    attackInterval: 1000,
  },
  {
    name: 'ゴブリン',
    shape: 'goblin',
    bodyColor: 0xe76f51,
    headColor: 0x6d597a,
    attackPower: 6,
    reward: 100,
    attackInterval: 1500,
  },
  {
    name: 'ゴーレム',
    shape: 'golem',
    bodyColor: 0x8d99ae,
    headColor: 0x495057,
    attackPower: 9,
    reward: 200,
    attackInterval: 2000,
  },
];

export type Weapon = {
  name: string;
  attackPower: number;
  price: number;
};

export const WEAPONS: readonly Weapon[] = [
  { name: '駆け出しの剣', attackPower: 10, price: 0 },
  { name: '鉄の剣', attackPower: 20, price: 150 },
  { name: '鋼の剣', attackPower: 40, price: 250 },
  { name: '炎の剣', attackPower: 60, price: 500 },
  { name: '雷鳴の剣', attackPower: 80, price: 750 },
  { name: '聖剣エターナル', attackPower: 100, price: 1000 },
];