export const GAME_WIDTH = 1280;

export const PLAYER_MAX_HP = 150;
export const ENEMY_MAX_HP = 100;
export const ENEMY_HP_INCREASE = 50;
export const ENEMY_ATTACK_INTERVAL = 1000;
export const ENEMY_ATTACK_INCREASE = 1;
export const PLAYER_ATTACK_INTERVAL = 200;
export const SKILL_COOLDOWN = 5000;
export const SKILL_DAMAGE_MULTIPLIER = 3;
export const MONEY_PUNCH_COOLDOWN = 8000;
export const HEAL_SKILL_COOLDOWN = 8000;
export const RAPID_SKILL_COOLDOWN = 10000;
export const KILLS_PER_LEVEL = 3;
export const ENEMY_DEFEAT_HEAL = 30;
export const ENEMY_RESPAWN_MIN = 500;
export const ENEMY_RESPAWN_MAX = 1000;
export const CLEAR_TICKET_PRICE = 100000;

export const POTION_PRICE = 100;
export const STRENGTH_POTION_PRICE = 250;
export const WEAKNESS_POTION_PRICE = 500;
export const HEALTH_POTION_PRICE = 600;
export const DEFENSE_POTION_PRICE = 650;
export const CONFUSION_POTION_PRICE = 850;

// レアキャラ設定
export const RARE_ENEMY_CHANCE = 0.2;
export const RARE_ENEMY_REWARD_MULTIPLIER = 2;

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
  hpBonus: number;
  attackPower: number;
  reward: number;
};

export const ENEMY_VARIANTS: readonly EnemyVariant[] = [
  { name: 'スライム', shape: 'slime', bodyColor: 0x57cc99, headColor: 0x2a9d8f, hpBonus: 0, attackPower: 3, reward: 50 },
  { name: 'ゴブリン', shape: 'goblin', bodyColor: 0xe76f51, headColor: 0x6d597a, hpBonus: 10, attackPower: 6, reward: 100 },
  { name: 'ゴーレム', shape: 'golem', bodyColor: 0x8d99ae, headColor: 0x495057, hpBonus: 20, attackPower: 9, reward: 200 },
  { name: 'コウモリ', shape: 'slime', bodyColor: 0x695c8f, headColor: 0xd6c3ff, hpBonus: 20, attackPower: 10, reward: 220 },
  { name: 'マタンゴ', shape: 'slime', bodyColor: 0x9b5b75, headColor: 0xf2a7c5, hpBonus: 30, attackPower: 11, reward: 250 },
  { name: 'スケルトン', shape: 'goblin', bodyColor: 0xe6dfc8, headColor: 0xb8ad91, hpBonus: 45, attackPower: 13, reward: 310 },
  { name: 'ウェアウルフ', shape: 'goblin', bodyColor: 0x8f5e3b, headColor: 0x5b3928, hpBonus: 60, attackPower: 15, reward: 380 },
  { name: 'アイスゴーレム', shape: 'golem', bodyColor: 0x8ed8e8, headColor: 0x438da8, hpBonus: 75, attackPower: 17, reward: 460 },
  { name: '魔女', shape: 'goblin', bodyColor: 0x57436d, headColor: 0xc2a0d8, hpBonus: 90, attackPower: 19, reward: 550 },
  { name: 'ヴァンパイア', shape: 'goblin', bodyColor: 0x7e3546, headColor: 0xc17a88, hpBonus: 105, attackPower: 21, reward: 650 },
  { name: 'ワイバーン', shape: 'golem', bodyColor: 0x4f936f, headColor: 0x245740, hpBonus: 120, attackPower: 23, reward: 770 },
  { name: 'デーモン', shape: 'goblin', bodyColor: 0xb34e3f, headColor: 0x6b252d, hpBonus: 140, attackPower: 25, reward: 900 },
  { name: '古代竜', shape: 'golem', bodyColor: 0xc18b42, headColor: 0x765126, hpBonus: 160, attackPower: 28, reward: 1100 },
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