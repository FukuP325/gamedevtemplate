export const GAME_WIDTH = 1280;

export const PLAYER_MAX_HP = 150;
export const ENEMY_MAX_HP = 100;
export const ENEMY_HP_INCREASE = 50;
export const ENEMY_ATTACK_INTERVAL = 1000;
export const ENEMY_ATTACK_INCREASE = 3;
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
export const CLEAR_TICKET_PRICE = 1000000;
export const POTION_PRICE = 100;
export const STRENGTH_POTION_PRICE = 250;
export const WEAKNESS_POTION_PRICE = 500;
export const HEALTH_POTION_PRICE = 600;
export const DEFENSE_POTION_PRICE = 650;
export const CONFUSION_POTION_PRICE = 850;

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
  durability: number | null;
  price: number;
};

export const WEAPONS: readonly Weapon[] = [
  { name: '拳', attackPower: 5, durability: null, price: 0 },
  { name: '駆け出しの剣', attackPower: 10, durability: 15, price: 100 },
  { name: '鉄の剣', attackPower: 20, durability: 30, price: 150 },
  { name: '鋼の剣', attackPower: 40, durability: 100, price: 250 },
  { name: '破砕の剣', attackPower: 60, durability: 200, price: 500 },
  { name: '神速の剣', attackPower: 80, durability: 40, price: 750 },
  { name: '炎の剣', attackPower: 100, durability: 60, price: 1000 },
  { name: '雷鳴の剣', attackPower: 120, durability: 60, price: 1250 },
  { name: '業火の剣', attackPower: 140, durability: 70, price: 1500 },
  { name: '天雷の剣', attackPower: 160, durability: 70, price: 1750 },
  { name: '邪剣アビス', attackPower: 180, durability: null, price: 2000 },
  { name: '聖剣エターナル', attackPower: 200, durability: null, price: 2500 },
];