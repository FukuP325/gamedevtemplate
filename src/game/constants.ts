export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAYER_MAX_HP = 200;
export const ENEMY_MAX_HP = 100;
export const ENEMY_HP_INCREASE = 50;
export const ENEMY_ATTACK_POWER = 10;
export const ENEMY_ATTACK_INTERVAL = 1000;
export const ENEMY_ATTACK_INCREASE = 1;
export const PLAYER_ATTACK_INTERVAL = 200;
export const AUTO_ATTACK_INTERVAL = 800;
export const AUTO_MODE_HOLD_DURATION = 1000;
export const SKILL_COOLDOWN = 5000;
export const SKILL_DAMAGE_MULTIPLIER = 3;
export const MONEY_PUNCH_COOLDOWN = 8000;
export const RAPID_SKILL_COOLDOWN = 10000;
export const KILLS_PER_LEVEL = 3;
export const ENEMY_REWARD = 100;
export const ENEMY_DEFEAT_HEAL = 30;
export const ENEMY_RESPAWN_MIN = 500;
export const ENEMY_RESPAWN_MAX = 1000;
export const CLEAR_TICKET_PRICE = 10000;

export type Equipment = {
  name: string;
  hpBonus: number;
  price: number;
};

export const EQUIPMENTS: readonly Equipment[] = [
  { name: '丈夫な鎧', hpBonus: 50, price: 250 },
  { name: '守護の盾', hpBonus: 100, price: 500 },
  { name: '生命の指輪', hpBonus: 200, price: 1000 },
];

export type EnemyVariant = {
  name: string;
  shape: 'slime' | 'goblin' | 'golem';
  bodyColor: number;
  headColor: number;
  attackPower: number;
  reward: number;
};

export const ENEMY_VARIANTS: readonly EnemyVariant[] = [
  { name: 'スライム', shape: 'slime', bodyColor: 0x57cc99, headColor: 0x2a9d8f, attackPower: 3, reward: 50 },
  { name: 'ゴブリン', shape: 'goblin', bodyColor: 0xe76f51, headColor: 0x6d597a, attackPower: 6, reward: 100 },
  { name: 'ゴーレム', shape: 'golem', bodyColor: 0x8d99ae, headColor: 0x495057, attackPower: 9, reward: 200 },
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