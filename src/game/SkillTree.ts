export type SkillTreeSkill = {
  id: number;
  name: string;
  description: string;
  parentIds: number[];
  levelRequired: number;
};

export const SKILL_TREE: readonly SkillTreeSkill[] = [
  {
    id: 0,
    name: '攻撃力強化',
    description: '攻撃力 +10',
    parentIds: [],
    levelRequired: 1,
  },
  {
    id: 1,
    name: '最大HP強化',
    description: '最大HP +50',
    parentIds: [],
    levelRequired: 1,
  },
  {
    id: 2,
    name: '高速攻撃',
    description: '通常攻撃の間隔 -30ms',
    parentIds: [0],
    levelRequired: 1,
  },
  {
    id: 3,
    name: '鉄壁',
    description: '敵から受けるダメージ -1',
    parentIds: [1],
    levelRequired: 1,
  },
  {
    id: 4,
    name: '強撃',
    description: 'スキルダメージ +25%',
    parentIds: [0],
    levelRequired: 2,
  },
  {
    id: 5,
    name: '回復強化',
    description: '敵撃破時の回復量 +15',
    parentIds: [1],
    levelRequired: 2,
  },
  {
    id: 6,
    name: '連撃強化',
    description: '連撃ダメージ +30%',
    parentIds: [2],
    levelRequired: 2,
  },
  {
    id: 7,
    name: '不屈',
    description: '最大HP +100',
    parentIds: [3],
    levelRequired: 2,
  },
  {
    id: 8,
    name: '札束強化',
    description: '札束パンチダメージ +50%',
    parentIds: [4],
    levelRequired: 3,
  },
  {
    id: 9,
    name: '黄金の心',
    description: '敵撃破報酬 +20%',
    parentIds: [5],
    levelRequired: 3,
  },
];

export const SKILL_TREE_COUNT = SKILL_TREE.length;