import Phaser from 'phaser';
import {
  CLEAR_TICKET_PRICE,
  ENEMY_ATTACK_INTERVAL,
  ENEMY_ATTACK_INCREASE,
  ENEMY_DEFEAT_HEAL,
  ENEMY_HP_INCREASE,
  ENEMY_MAX_HP,
  ENEMY_RESPAWN_MAX,
  ENEMY_RESPAWN_MIN,
  RARE_ENEMY_CHANCE,
  RARE_ENEMY_REWARD_MULTIPLIER,
  ENEMY_VARIANTS,
  EQUIPMENTS,
  HEAL_SKILL_COOLDOWN,
  GAME_WIDTH,
  KILLS_PER_LEVEL,
  MAX_MONEY,
  MONEY_PUNCH_COOLDOWN,
  PLAYER_ATTACK_INTERVAL,
  PLAYER_MAX_HP,
  POTION_PRICE,
  STRENGTH_POTION_PRICE,
  WEAKNESS_POTION_PRICE,
  HEALTH_POTION_PRICE,
  DEFENSE_POTION_PRICE,
  CONFUSION_POTION_PRICE,
  RAPID_SKILL_COOLDOWN,
  SKILL_COOLDOWN,
  SKILL_DAMAGE_MULTIPLIER,
  WEAPONS,
} from '../game/constants';

type GameMode = 'title' | 'playing' | 'paused' | 'enemyBook' | 'skillTree' | 'shop' | 'gacha' | 'titles' | 'gameOver' | 'clear';
type ShopCategory = 'weapon' | 'equipment' | 'potion';
type GachaItem =
  | { kind: 'weapon'; itemIndex: number; name: string; attackPower: number; durability: number | null; price: number; gachaOnly?: boolean; gachaEffect?: 'critical' | 'vampiric' | 'execute' }
  | { kind: 'equipment'; itemIndex: number; name: string; hpBonus: number; price: number; gachaOnly?: boolean; damageReduction?: number }
  | { kind: 'potion'; itemIndex: number; name: string; effect: string; price: number; gachaOnly?: boolean };
type ShopItem = GachaItem | { kind: 'ticket'; itemIndex: number; name: string; attackPower: number; price: number };

const POTION_SHOP_ITEMS = [
  { name: '回復ポーション', effect: 'HPを全回復', price: POTION_PRICE },
  { name: '力のポーション', effect: '攻撃力をだんだん上げる', price: STRENGTH_POTION_PRICE },
  { name: '弱体化ポーション', effect: '敵のHPを下げる', price: WEAKNESS_POTION_PRICE },
  { name: '体力のポーション', effect: 'HPを1.5倍にする（5分）', price: HEALTH_POTION_PRICE },
  { name: '守りのポーション', effect: '防御力を上げる', price: DEFENSE_POTION_PRICE },
  { name: '混乱のポーション', effect: '敵の攻撃力を半減', price: CONFUSION_POTION_PRICE },
] as const;

const GACHA_ONLY_POTIONS = [
  { name: '星詠みの霊薬', effect: '次の3回攻撃が2.5倍', price: 3000, gachaOnly: true },
  { name: '不死鳥の霊薬', effect: 'HP全回復、敵HPの35%ダメージ', price: 5000, gachaOnly: true },
] as const;

const POTION_GACHA_ITEMS = [...POTION_SHOP_ITEMS, ...GACHA_ONLY_POTIONS] as const;

const GACHA_PRICES: Record<ShopCategory, number> = {
  weapon: 500,
  equipment: 500,
  potion: 500,
};

const EFFECT_DEPTH = 20;
const TECHNIQUE_NAMES = ['連撃', '金の一撃', '札束パンチ', '回復'];
const PLAYER_TITLES = [
  { id: 'apprentice', name: '見習い冒険者', condition: '最初から所持' },
  { id: 'first_blood', name: '初陣の剣士', condition: '敵を1体倒す' },
  { id: 'monster_hunter', name: '百鬼狩り', condition: '敵を50体倒す' },
  { id: 'golden_hand', name: '黄金の手', condition: '累計1万円を獲得' },
  { id: 'gold_saver', name: '金貨の貯蓄家', condition: '累計10万円を獲得' },
  { id: 'gold_trader', name: '黄金商人', condition: '累計100万円を獲得' },
  { id: 'gold_tycoon', name: '大富豪', condition: '累計1,000万円を獲得' },
  { id: 'millionaire', name: '億万長者', condition: '累計1億円を獲得' },
  { id: 'billionaire', name: '十億の覇者', condition: '累計10億円を獲得' },
  { id: 'money_limit', name: '所持金カンスト', condition: '所持金を上限まで貯める' },
  { id: 'collector', name: '限定蒐集家', condition: 'ガチャ限定品を獲得' },
  { id: 'abyss_entry', name: '深淵の来訪者', condition: '深淵の第1戦に到達' },
  { id: 'abyss_walker', name: '深淵の踏破者', condition: '深淵の第5戦に到達' },
  { id: 'abyss_veteran', name: '深淵の熟練者', condition: '深淵の第10戦に到達' },
  { id: 'abyss_legend', name: '深淵の覇者', condition: '深淵の第20戦に到達' },
  { id: 'abyss_conqueror', name: '奈落の征服者', condition: '深淵の第30戦に到達' },
  { id: 'abyss_immortal', name: '深淵の不滅者', condition: '深淵の第50戦に到達' },
  { id: 'abyss_eternal', name: '永劫の挑戦者', condition: '深淵の第100戦に到達' },
  { id: 'first_boss', name: '竜狩り', condition: '深淵ボスを1体倒す' },
  { id: 'boss_hunter', name: '竜殺し', condition: '深淵ボスを5体倒す' },
  { id: 'boss_legend', name: '竜王の天敵', condition: '深淵ボスを20体倒す' },
  { id: 'golden_king', name: '黄金王', condition: '脱出チケットを購入' },
] as const;
type PlayerTitleId = (typeof PLAYER_TITLES)[number]['id'];

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'title';
  private playerHp = PLAYER_MAX_HP;
  private playerMaxHp = PLAYER_MAX_HP;
  private level = 1;
  private skillPoints = 0;
  private unlockedSkillIds = new Set<number>();
  private skillLevels = [1, 0, 0, 0];
  private defeatedCount = 0;
  private totalMoneyEarned = 0;
  private unlockedTitleIds = new Set<PlayerTitleId>(['apprentice']);
  private selectedTitleId: PlayerTitleId = 'apprentice';
  private titlePage = 0;
  private endgameMode = false;
  private endgameWave = 0;
  private bestEndgameWave = 0;
  private endgameBossesDefeated = 0;
  private enemyMaxHp = ENEMY_MAX_HP;
  private enemyHp = ENEMY_MAX_HP;
  private enemyVariantIndex = 0;
  private isRareEnemy = false;
  private discoveredEnemies = new Set<number>();
  private money = 0;
  private moneyPunchTimer?: Phaser.Time.TimerEvent;
  private potionCount = 1;
  private strengthPotionCount = 1;
  private weaknessPotionCount = 1;
  private healthPotionCount = 1;
  private defensePotionCount = 1;
  private defensePotionActive = false;
  private confusionPotionCount = 1;
  private starElixirCount = 0;
  private phoenixElixirCount = 0;
  private starElixirAttacksRemaining = 0;
  private enemyWeakened = false;
  private strengthPotionAttacksRemaining = 0;
  private vampiricAttackCount = 0;
  private healthPotionBaseMaxHp?: number;
  private healthPotionTimer?: Phaser.Time.TimerEvent;
  private damageOverTimeTimer?: Phaser.Time.TimerEvent;
  private damageOverTimeTicksRemaining = 0;
  private weaponIndex = 0;
  private selectedSkillByBranch: Array<number | undefined> = [undefined, undefined, undefined];
  private skillTreeObjects: Phaser.GameObjects.GameObject[] = [];
  private weaponDurability = new Map<number, number | null>();
  private purchasedWeapons = new Set<number>();
  private purchasedEquipments = new Set<number>();
  private enemyAlive = true;
  private lastAttackAt = -PLAYER_ATTACK_INTERVAL;
  private lastSkillAt = -SKILL_COOLDOWN;
  private lastMoneyPunchAt = -MONEY_PUNCH_COOLDOWN;
  private lastHealSkillAt = -HEAL_SKILL_COOLDOWN;
  private lastRapidSkillAt = -RAPID_SKILL_COOLDOWN;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private oneKey!: Phaser.Input.Keyboard.Key;
  private twoKey!: Phaser.Input.Keyboard.Key;
  private threeKey!: Phaser.Input.Keyboard.Key;
  private fourKey!: Phaser.Input.Keyboard.Key;
  private fiveKey!: Phaser.Input.Keyboard.Key;
  private sixKey!: Phaser.Input.Keyboard.Key;
  private sevenKey!: Phaser.Input.Keyboard.Key;
  private eightKey!: Phaser.Input.Keyboard.Key;
  private nineKey!: Phaser.Input.Keyboard.Key;
  private zeroKey!: Phaser.Input.Keyboard.Key;
  private qKey!: Phaser.Input.Keyboard.Key;
  private wKey!: Phaser.Input.Keyboard.Key;
  private yKey!: Phaser.Input.Keyboard.Key;
  private tKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private gKey!: Phaser.Input.Keyboard.Key;
  private enemyAttackTimer?: Phaser.Time.TimerEvent;
  private respawnTimer?: Phaser.Time.TimerEvent;
  private screenObjects: Phaser.GameObjects.GameObject[] = [];
  private combatObjects: Phaser.GameObjects.GameObject[] = [];
  private enemyVisuals: Phaser.GameObjects.GameObject[] = [];
  private shopButtons: Phaser.GameObjects.Rectangle[] = [];
  private shopCardObjects: Array<{ object: Phaser.GameObjects.GameObject & { x: number }; baseX: number }> = [];
  private shopScrollOffset = 0;
  private shopItemCount = 0;
  private shopCategory: ShopCategory = 'weapon';
  private hudText?: Phaser.GameObjects.Text;
  private enemyAttackText?: Phaser.GameObjects.Text;
  private enemyRewardText?: Phaser.GameObjects.Text;
  private potionCountText?: Phaser.GameObjects.Text;
  private strengthPotionCountText?: Phaser.GameObjects.Text;
  private weaknessPotionCountText?: Phaser.GameObjects.Text;
  private healthPotionCountText?: Phaser.GameObjects.Text;
  private defensePotionCountText?: Phaser.GameObjects.Text;
  private confusionPotionCountText?: Phaser.GameObjects.Text;
  private starElixirCountText?: Phaser.GameObjects.Text;
  private phoenixElixirCountText?: Phaser.GameObjects.Text;
  private weaponBreakDialogObjects: Phaser.GameObjects.GameObject[] = [];
  private weaponBreakDialogTimer?: Phaser.Time.TimerEvent;
  private potionSlotPanels: Phaser.GameObjects.Rectangle[] = [];
  private progressText?: Phaser.GameObjects.Text;
  private clearProgressBar?: Phaser.GameObjects.Rectangle;
  private skillButtons: Phaser.GameObjects.Arc[] = [];
  private skillButtonIcons: Phaser.GameObjects.Graphics[] = [];
  private skillCooldownRings: Phaser.GameObjects.Graphics[] = [];
  private confirmationObjects: Phaser.GameObjects.GameObject[] = [];
  private pauseOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private returnToPauseAfterShop = false;
  private returnToPauseAfterSkillTree = false;
  private returnToPauseAfterEnemyBook = false;
  private returnToPauseAfterGacha = false;
  private returnToShopAfterGacha = false;
  private gachaReturnShopCategory: ShopCategory = 'weapon';
  private debugMode = false;
  private debugPanel?: Phaser.GameObjects.Rectangle;
  private debugText?: Phaser.GameObjects.Text;
  private pausedAt?: number;
  private shopMessage?: string;
  private gachaMessage?: string;
  private pendingPurchase?: { itemIndex: number; itemKind: 'weapon' | 'equipment' | 'potion' | 'ticket' };
  private playerHpBar?: Phaser.GameObjects.Rectangle;
  private enemyHpBar?: Phaser.GameObjects.Rectangle;
  private readonly escapeListener = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    if (this.mode === 'playing') {
      this.showPause();
    } else if (this.mode === 'enemyBook') {
      this.returnFromEnemyBook();
    } else if (this.mode === 'paused') {
      this.hidePause();
    } else if (this.mode === 'skillTree') {
      this.returnFromSkillTree();
    } else if (this.mode === 'shop') {
      this.returnFromShop();
    } else if (this.mode === 'gacha') {
      this.returnFromGacha();
    } else if (this.mode === 'titles') {
      this.returnFromTitles();
    } else if (this.mode === 'gameOver' || this.mode === 'clear') {
      this.resetGame();
      this.showTitle();
    }
  };
  private readonly debugListener = (event: KeyboardEvent): void => {
    if (!event.ctrlKey || event.key.toLowerCase() !== 'd') {
      return;
    }

    event.preventDefault();
    if (event.repeat) {
      return;
    }

    this.debugMode = !this.debugMode;
    this.updateDebugOverlay();
  };

  constructor() {
    super('GameScene');
  }

  create(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('Keyboard input is required.');
    }
    this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.oneKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.twoKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.threeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.fourKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.fiveKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);
    this.sixKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX);
    this.sevenKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN);
    this.eightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT);
    this.nineKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NINE);
    this.zeroKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO);
    this.qKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.wKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.yKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
    this.tKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.eKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.gKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    keyboard.addCapture(['SPACE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO', 'Q', 'W', 'Y', 'E', 'G', 'ESC', 'LEFT', 'RIGHT']);
    window.addEventListener('keydown', this.escapeListener);
    window.addEventListener('keydown', this.debugListener);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', this.escapeListener);
      window.removeEventListener('keydown', this.debugListener);
    });
    this.showTitle();
  }

  update(): void {
    this.updateDebugOverlay();
    if (this.mode === 'title' && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.resetGame();
      this.showPlaying();
      return;
    }

    if (this.mode === 'gameOver' || this.mode === 'clear') {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        if (this.mode === 'gameOver' && this.endgameMode) {
          this.startEndgame();
        } else {
          this.resetGame();
          this.showPlaying();
        }
        return;
      }
    }

    if (this.mode === 'paused') {
      return;
    }

    if (this.mode === 'playing') {
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        this.showShop();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.gKey)) {
        this.showGacha();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.yKey)) {
        this.showTitles();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.tKey)) {
        this.showSkillTree();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.oneKey)) {
        this.useRapidSkill();
      }
      if (Phaser.Input.Keyboard.JustDown(this.twoKey)) {
        this.useSkill();
      }
      if (Phaser.Input.Keyboard.JustDown(this.threeKey)) {
        this.useMoneyPunchSkill();
      }
      if (Phaser.Input.Keyboard.JustDown(this.fourKey)) {
        this.useHealSkill();
      }
      if (Phaser.Input.Keyboard.JustDown(this.fiveKey)) {
        this.usePotion();
      }
      if (Phaser.Input.Keyboard.JustDown(this.sixKey)) {
        this.useStrengthPotion();
      }
      if (Phaser.Input.Keyboard.JustDown(this.sevenKey)) {
        this.useWeaknessPotion();
      }
      if (Phaser.Input.Keyboard.JustDown(this.eightKey)) {
        this.useHealthPotion();
      }
      if (Phaser.Input.Keyboard.JustDown(this.nineKey)) {
        this.useDefensePotion();
      }
      if (Phaser.Input.Keyboard.JustDown(this.zeroKey)) {
        this.useConfusionPotion();
      }
      if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
        this.useStarElixir();
      }
      if (Phaser.Input.Keyboard.JustDown(this.wKey)) {
        this.usePhoenixElixir();
      }
      this.updateSkillHud();
    } else if (this.mode === 'shop') {
      if (Phaser.Input.Keyboard.JustDown(this.tKey)) {
        this.showSkillTree();
      } else if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
        this.scrollShop(1);
      } else if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
        this.scrollShop(-1);
      }
    }
  }

  private resetGame(): void {
    this.stopTimers();
    this.playerHp = PLAYER_MAX_HP;
    this.playerMaxHp = PLAYER_MAX_HP;
    this.returnToPauseAfterShop = false;
    this.returnToPauseAfterSkillTree = false;
    this.returnToPauseAfterEnemyBook = false;
    this.returnToPauseAfterGacha = false;
    this.returnToShopAfterGacha = false;
    this.level = 1;
    this.skillPoints = 0;
    this.unlockedSkillIds.clear();
    this.skillLevels = [1, 0, 0, 0];
    this.defeatedCount = 0;
    this.totalMoneyEarned = 0;
    this.endgameMode = false;
    this.endgameWave = 0;
    this.enemyMaxHp = ENEMY_MAX_HP;
    this.enemyHp = this.enemyMaxHp;
    this.enemyVariantIndex = 0;
    this.discoveredEnemies.clear();
    this.isRareEnemy = Math.random() < RARE_ENEMY_CHANCE;
    this.lastSkillAt = -SKILL_COOLDOWN;
    this.lastMoneyPunchAt = -MONEY_PUNCH_COOLDOWN;
    this.lastHealSkillAt = -HEAL_SKILL_COOLDOWN;
    this.lastRapidSkillAt = -RAPID_SKILL_COOLDOWN;
    this.money = 0;
    this.potionCount = 1;
    this.strengthPotionCount = 1;
    this.weaknessPotionCount = 1;
    this.healthPotionCount = 1;
    this.defensePotionCount = 1;
    this.defensePotionActive = false;
    this.confusionPotionCount = 1;
    this.starElixirCount = 0;
    this.phoenixElixirCount = 0;
    this.starElixirAttacksRemaining = 0;
    this.enemyWeakened = false;
    this.strengthPotionAttacksRemaining = 0;
    this.vampiricAttackCount = 0;
    this.healthPotionBaseMaxHp = undefined;
    this.healthPotionTimer?.remove();
    this.healthPotionTimer = undefined;
    this.weaponIndex = 1;
    this.selectedSkillByBranch = [undefined, undefined, undefined];
    this.purchasedWeapons.clear();
    this.purchasedWeapons.add(1);
    this.weaponDurability.clear();
    this.weaponDurability.set(1, WEAPONS[1].durability);
    this.purchasedWeapons.add(1);
    this.purchasedEquipments.clear();
    this.gachaMessage = undefined;
    this.enemyAlive = true;
    this.lastAttackAt = -PLAYER_ATTACK_INTERVAL;
  }

  private showTitle(): void {
    this.mode = 'title';
    this.clearScreen();
    const panel = this.addScreenObject(this.add.rectangle(GAME_WIDTH / 2, 360, 760, 560, 0xf8f9fa));
    panel.setStrokeStyle(6, 0xf4d35e, 1);
    this.addText(GAME_WIDTH / 2, 145, '金', 76, '#f4d35e').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 235, '敵を倒して、お金を集めよう', 28, '#264653').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 300, '目標：100,000円のクリアチケットを購入する', 22, '#457b9d').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 360, '敵をクリックして攻撃', 22, '#264653').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 405, '1〜4：スキル  Esc：ポーズメニュー', 22, '#264653').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 450, '敵を倒すとお金を獲得、HPが一部回復', 20, '#457b9d').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 560, 'スペースキーで開始', 30, '#e76f51').setOrigin(0.5);
  }

  private showPlaying(): void {
    this.mode = 'playing';
    this.resumeTimers();
    this.clearScreen();
    this.drawPlayfieldBackground();
    this.drawHud(true);
    this.drawCombatants();
    this.addSkillButtons();
    this.addPotionSlot();
    const controlsText = this.addText(GAME_WIDTH / 2, 650, 'Esc:メニュー E:ショップ G:ガチャ Y:称号 T:スキル 5〜0:薬 Q/W:限定薬', 20, '#ffffff').setOrigin(0.5);
    controlsText.setStroke('#264653', 4);
    const titleLabel = this.addText(GAME_WIDTH / 2, 25, `称号  /  ${this.getPlayerTitleName(this.selectedTitleId)}`, 18, '#f4d35e').setOrigin(0.5);
    titleLabel.setStroke('#264653', 4);
    this.startEnemyAttackTimer();
  }

  private showPause(): void {
    this.clearSkillTree();
    if (this.mode === 'playing') {
      this.pausedAt = this.time.now;
    }
    this.mode = 'paused';
    this.pauseTimers();
    for (const visual of this.enemyVisuals) {
      this.tweens.killTweensOf(visual);
    }
    this.drawCombatants();
    const overlay = this.addScreenObject(this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55));
    overlay.setDepth(1000);
    overlay.setInteractive();
    this.pauseOverlayObjects.push(overlay);
    const pauseText = this.addScreenObject(this.add.text(640, 180, 'pause', {
      fontFamily: 'sans-serif',
      fontSize: '64px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1001));
    this.pauseOverlayObjects.push(pauseText);
    const shopButton = this.addScreenObject(this.add.rectangle(640, 360, 320, 72, 0x2a9d8f).setDepth(1001));
    shopButton.setInteractive({ useHandCursor: true });
    shopButton.on('pointerdown', () => {
      this.returnToPauseAfterShop = true;
      this.showShop();
    });
    this.pauseOverlayObjects.push(shopButton);
    const shopButtonText = this.addScreenObject(this.add.text(640, 360, 'ショップへ', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1001));
    this.pauseOverlayObjects.push(shopButtonText);
    const skillTreeButton = this.addScreenObject(this.add.rectangle(640, 455, 320, 72, 0x457b9d).setDepth(1001));
    skillTreeButton.setInteractive({ useHandCursor: true });
    skillTreeButton.on('pointerdown', () => this.showSkillTree(true));
    this.pauseOverlayObjects.push(skillTreeButton);
    const skillTreeButtonText = this.addScreenObject(this.add.text(640, 455, 'スキルツリー', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1001));
    this.pauseOverlayObjects.push(skillTreeButtonText);
    const enemyBookButton = this.addScreenObject(this.add.rectangle(640, 550, 320, 72, 0x6d597a).setDepth(1001));
    enemyBookButton.setInteractive({ useHandCursor: true });
    enemyBookButton.on('pointerdown', () => this.showEnemyBook(true));
    this.pauseOverlayObjects.push(enemyBookButton);
    const enemyBookButtonText = this.addScreenObject(this.add.text(640, 550, '敵図鑑', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1001));
    this.pauseOverlayObjects.push(enemyBookButtonText);
    const gachaButton = this.addScreenObject(this.add.rectangle(640, 645, 320, 64, 0xe76f51).setDepth(1001));
    gachaButton.setInteractive({ useHandCursor: true });
    gachaButton.on('pointerdown', () => {
      this.returnToPauseAfterGacha = true;
      this.showGacha();
    });
    this.pauseOverlayObjects.push(gachaButton);
    const gachaButtonText = this.addScreenObject(this.add.text(640, 645, 'ガチャへ', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1001));
    this.pauseOverlayObjects.push(gachaButtonText);
  }

  private showEnemyBook(returnToPause = false): void {
    if (this.mode === 'playing') {
      this.pausedAt = this.time.now;
    }
    this.returnToPauseAfterEnemyBook = returnToPause;
    this.clearPauseOverlay();
    this.mode = 'enemyBook';
    this.pauseTimers();
    this.clearScreen();
    const overlay = this.addScreenObject(this.add.rectangle(640, 360, 1280, 720, 0x101820, 0.96));
    overlay.setInteractive();
    this.addText(640, 30, '敵図鑑', 38, '#f4d35e').setOrigin(0.5);
    this.addText(640, 65, '敵を倒すと姿とステータスが記録される', 18, '#d9e2ec').setOrigin(0.5);

    ENEMY_VARIANTS.forEach((variant, index) => {
      const discovered = this.discoveredEnemies.has(index);
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = 160 + column * 320;
      const y = 130 + row * 142;
      const card = this.addScreenObject(this.add.rectangle(x, y, 300, 132, discovered ? 0x263746 : 0x18232d));
      card.setStrokeStyle(2, discovered ? 0x57cc99 : 0x53616f, 1);
      this.drawEnemyBookPortrait(variant, x, y - 15, discovered);
      this.addText(x, y - 51, discovered ? variant.name : '???', 20, discovered ? '#f8f9fa' : '#adb5bd').setOrigin(0.5);
      const stats = discovered
        ? `HP ${ENEMY_MAX_HP + variant.hpBonus} (+${ENEMY_HP_INCREASE}/撃破)\n攻撃 ${variant.attackPower} (+${ENEMY_ATTACK_INCREASE}/撃破)\n通常報酬 ${variant.reward}円`
        : 'HP ???   攻撃 ???\n報酬 ???';
      this.addText(x, y + 28, stats, 14, discovered ? '#d9e2ec' : '#7f8c98').setOrigin(0.5);
    });

    this.addText(640, 670, `発見 ${this.discoveredEnemies.size}/${ENEMY_VARIANTS.length}    Esc: 戻る`, 18, '#d9e2ec').setOrigin(0.5);
    const closeButton = this.addScreenObject(this.add.rectangle(1160, 670, 150, 44, 0x2a9d8f));
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.returnFromEnemyBook());
    this.addText(1160, 670, '閉じる', 18, '#ffffff').setOrigin(0.5);
  }

  private returnFromEnemyBook(): void {
    const shouldReturnToPause = this.returnToPauseAfterEnemyBook;
    this.returnToPauseAfterEnemyBook = false;
    this.clearScreen();
    this.applyPausedDuration();
    this.showPlaying();
    if (shouldReturnToPause) {
      this.showPause();
    }
  }

  private drawEnemyBookPortrait(
    variant: (typeof ENEMY_VARIANTS)[number],
    x: number,
    y: number,
    discovered: boolean,
  ): void {
    const portrait = this.addScreenObject(this.add.graphics());
    portrait.setPosition(x, y);
    const bodyColor = discovered ? variant.bodyColor : 0x0b1118;
    const headColor = discovered ? variant.headColor : 0x0b1118;

    if (variant.shape === 'slime') {
      if (variant.name === 'コウモリ') {
        portrait.fillStyle(bodyColor, 1);
        portrait.fillTriangle(-22, -3, -54, -30, -43, 20);
        portrait.fillTriangle(22, -3, 54, -30, 43, 20);
        portrait.lineStyle(3, discovered ? 0x302943 : bodyColor, 1);
        portrait.strokeTriangle(-22, -3, -54, -30, -43, 20);
        portrait.strokeTriangle(22, -3, 54, -30, 43, 20);
      }
      portrait.fillStyle(bodyColor, 1);
      portrait.fillEllipse(0, 10, 72, 48);
      portrait.lineStyle(4, discovered ? 0x264653 : bodyColor, 0.9);
      portrait.strokeEllipse(0, 10, 72, 48);
      if (discovered) {
        portrait.fillStyle(0xf8f9fa, 1);
        portrait.fillCircle(-13, 0, 5);
        portrait.fillCircle(13, 0, 5);
        portrait.fillStyle(0x212529, 1);
        portrait.fillCircle(-13, 0, 2);
        portrait.fillCircle(13, 0, 2);
      }
      if (variant.name === 'マタンゴ') {
        portrait.fillStyle(discovered ? variant.headColor : bodyColor, 1);
        portrait.fillEllipse(0, -17, 58, 24);
        portrait.lineStyle(3, discovered ? 0x59334d : bodyColor, 1);
        portrait.strokeEllipse(0, -17, 58, 24);
        portrait.fillStyle(discovered ? 0xffe7ef : bodyColor, 1);
        portrait.fillCircle(-16, -18, 3);
        portrait.fillCircle(0, -21, 3);
        portrait.fillCircle(16, -18, 3);
      }
    } else if (variant.shape === 'golem') {
      if (variant.name === 'ワイバーン' || variant.name === '古代竜') {
        const wingColor = discovered ? variant.headColor : bodyColor;
        portrait.fillStyle(wingColor, 1);
        portrait.fillTriangle(-18, -2, -56, -35, -43, 20);
        portrait.fillTriangle(18, -2, 56, -35, 43, 20);
        portrait.lineStyle(3, discovered ? 0x264653 : bodyColor, 1);
        portrait.lineBetween(-18, -2, -43, 20);
        portrait.lineBetween(-18, -2, -56, -35);
        portrait.lineBetween(18, -2, 43, 20);
        portrait.lineBetween(18, -2, 56, -35);
      }
      portrait.fillStyle(bodyColor, 1);
      portrait.fillRect(-29, -8, 58, 54);
      portrait.lineStyle(4, discovered ? 0x264653 : bodyColor, 1);
      portrait.strokeRect(-29, -8, 58, 54);
      portrait.fillStyle(headColor, 1);
      portrait.fillRect(-23, -43, 46, 34);
      portrait.lineStyle(4, discovered ? 0x264653 : headColor, 1);
      portrait.strokeRect(-23, -43, 46, 34);
      if (discovered) {
        portrait.lineStyle(3, 0x26323c, 0.9);
        portrait.lineBetween(-18, 2, -6, 12);
        portrait.lineBetween(-6, 12, -14, 24);
        portrait.lineBetween(17, 4, 8, 15);
        portrait.fillStyle(variant.name === 'アイスゴーレム' ? 0xd7f7ff : 0xf4d35e, 1);
        portrait.fillCircle(-11, -27, 4);
        portrait.fillCircle(11, -27, 4);
      }
      if (variant.name === 'アイスゴーレム') {
        portrait.fillStyle(discovered ? 0xd7f7ff : bodyColor, 1);
        portrait.fillTriangle(-18, -40, -11, -58, -5, -40);
        portrait.fillTriangle(-5, -40, 4, -63, 13, -40);
        portrait.fillTriangle(12, -40, 20, -56, 27, -40);
      } else if (variant.name === '古代竜') {
        portrait.fillStyle(discovered ? 0xf0d59b : bodyColor, 1);
        portrait.fillTriangle(-17, -39, -31, -57, -7, -42);
        portrait.fillTriangle(17, -39, 31, -57, 7, -42);
      }
    } else {
      portrait.fillStyle(bodyColor, 1);
      portrait.fillEllipse(0, 15, 48, 42);
      portrait.fillTriangle(-14, -30, -31, -52, -4, -43);
      portrait.fillTriangle(14, -30, 31, -52, 4, -43);
      portrait.fillStyle(headColor, 1);
      portrait.fillEllipse(0, -25, 48, 42);
      if (discovered) {
        portrait.fillStyle(0xf8f9fa, 1);
        portrait.fillCircle(-10, -28, 5);
        portrait.fillCircle(10, -28, 5);
        portrait.fillStyle(0x212529, 1);
        portrait.fillCircle(-10, -28, 2);
        portrait.fillCircle(10, -28, 2);
      }
      if (variant.name === '魔女') {
        portrait.fillStyle(discovered ? 0x33233f : bodyColor, 1);
        portrait.fillTriangle(-30, -43, 0, -66, 30, -43);
        portrait.fillRoundedRect(-34, -45, 68, 7, 3);
        if (discovered) {
          portrait.fillStyle(0xf4d35e, 1);
          portrait.fillCircle(0, -43, 4);
        }
      } else if (variant.name === 'デーモン') {
        portrait.fillStyle(discovered ? 0xe8d6ba : bodyColor, 1);
        portrait.fillTriangle(-17, -39, -28, -62, -6, -43);
        portrait.fillTriangle(17, -39, 28, -62, 6, -43);
      } else if (variant.name === 'スケルトン') {
        portrait.lineStyle(3, discovered ? 0xf0e8d5 : bodyColor, 1);
        for (let ribY = 8; ribY <= 25; ribY += 7) {
          portrait.beginPath();
          portrait.arc(0, ribY, 19, Math.PI, Math.PI * 2);
          portrait.strokePath();
        }
        portrait.lineBetween(0, 3, 0, 34);
      } else if (variant.name === 'ウェアウルフ') {
        portrait.fillStyle(discovered ? 0x3f3029 : bodyColor, 1);
        portrait.fillEllipse(0, -12, 31, 16);
      } else if (variant.name === 'ヴァンパイア') {
        portrait.fillStyle(discovered ? 0x561d33 : bodyColor, 1);
        portrait.fillTriangle(-17, -4, -43, 37, 0, 26);
        portrait.fillTriangle(17, -4, 43, 37, 0, 26);
        if (discovered) {
          portrait.fillStyle(0xf8f9fa, 1);
          portrait.fillTriangle(-7, -2, -4, 7, -1, -2);
          portrait.fillTriangle(7, -2, 4, 7, 1, -2);
        }
      }
    }
  }

  private clearPauseOverlay(): void {
    for (const object of this.pauseOverlayObjects) {
      this.removeScreenObject(object);
    }
    this.pauseOverlayObjects = [];
  }

  private clearSkillTree(): void {
    for (const object of this.skillTreeObjects) {
      this.removeScreenObject(object);
    }
    this.skillTreeObjects = [];
  }

  private hidePause(): void {
    this.applyPausedDuration();
    this.clearPauseOverlay();
    this.mode = 'playing';
    this.resumeTimers();
  }

  private returnFromShop(): void {
    const shouldReturnToPause = this.returnToPauseAfterShop;
    this.returnToPauseAfterShop = false;
    if (shouldReturnToPause) {
      this.applyPausedDuration();
    }
    this.showPlaying();
    if (shouldReturnToPause) {
      this.showPause();
    }
  }

  private returnFromGacha(): void {
    const shouldReturnToPause = this.returnToPauseAfterGacha;
    const shouldReturnToShop = this.returnToShopAfterGacha;
    const returnShopCategory = this.gachaReturnShopCategory;
    this.returnToPauseAfterGacha = false;
    this.returnToShopAfterGacha = false;
    if (shouldReturnToShop) {
      this.showShop(returnShopCategory);
      return;
    }
    if (shouldReturnToPause) {
      this.applyPausedDuration();
    }
    this.showPlaying();
    if (shouldReturnToPause) {
      this.showPause();
    }
  }

  private showTitles(): void {
    if (this.mode === 'playing') {
      this.pausedAt = this.time.now;
    }
    this.mode = 'titles';
    this.pauseTimers();
    this.clearScreen();
    this.addScreenObject(this.add.rectangle(640, 360, 1280, 720, 0x101820));
    this.addText(640, 52, '称号図鑑', 42, '#f4d35e').setOrigin(0.5);
    this.addText(640, 93, `装備中  /  ${this.getPlayerTitleName(this.selectedTitleId)}`, 20, '#f8f9fa').setOrigin(0.5);
    this.addText(265, 145, '称号', 16, '#57cc99');
    this.addText(690, 145, '獲得条件', 16, '#57cc99');

    const titlesPerPage = 8;
    const pageCount = Math.ceil(PLAYER_TITLES.length / titlesPerPage);
    this.titlePage = Phaser.Math.Clamp(this.titlePage, 0, pageCount - 1);
    const visibleTitles = PLAYER_TITLES.slice(this.titlePage * titlesPerPage, (this.titlePage + 1) * titlesPerPage);
    visibleTitles.forEach((title, index) => {
      const y = 184 + index * 54;
      const unlocked = this.unlockedTitleIds.has(title.id);
      const selected = this.selectedTitleId === title.id;
      const row = this.addScreenObject(this.add.rectangle(640, y, 900, 46, selected ? 0x264653 : unlocked ? 0x1d3039 : 0x18232d));
      row.setStrokeStyle(2, selected ? 0xf4d35e : unlocked ? 0x57cc99 : 0x53616f, 1);
      if (unlocked) {
        row.setInteractive({ useHandCursor: true });
        row.on('pointerdown', () => {
          this.selectedTitleId = title.id;
          this.showTitles();
        });
      }
      this.addText(230, y, unlocked ? title.name : '？？？？', 20, unlocked ? '#f8f9fa' : '#7f8c98').setOrigin(0, 0.5);
      this.addText(690, y, title.condition, 16, unlocked ? '#adb5bd' : '#667783').setOrigin(0, 0.5);
      this.addText(1060, y, selected ? '装備中' : unlocked ? '装備する' : '未獲得', 15, selected ? '#f4d35e' : unlocked ? '#57cc99' : '#667783').setOrigin(1, 0.5);
    });

    this.addText(640, 615, `${this.titlePage + 1} / ${pageCount}`, 17, '#adb5bd').setOrigin(0.5);
    if (this.titlePage > 0) {
      const previousButton = this.addScreenObject(this.add.rectangle(535, 615, 110, 38, 0x263746));
      previousButton.setInteractive({ useHandCursor: true });
      previousButton.on('pointerdown', () => {
        this.titlePage -= 1;
        this.showTitles();
      });
      this.addText(535, 615, '前へ', 16, '#ffffff').setOrigin(0.5);
    }
    if (this.titlePage < pageCount - 1) {
      const nextButton = this.addScreenObject(this.add.rectangle(745, 615, 110, 38, 0x263746));
      nextButton.setInteractive({ useHandCursor: true });
      nextButton.on('pointerdown', () => {
        this.titlePage += 1;
        this.showTitles();
      });
      this.addText(745, 615, '次へ', 16, '#ffffff').setOrigin(0.5);
    }

    const backButton = this.addScreenObject(this.add.rectangle(640, 660, 220, 48, 0x457b9d));
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.returnFromTitles());
    this.addText(640, 660, '戻る  /  ESC', 19, '#ffffff').setOrigin(0.5);
  }

  private returnFromTitles(): void {
    this.applyPausedDuration();
    this.showPlaying();
  }

  private getPlayerTitleName(titleId: PlayerTitleId): string {
    return PLAYER_TITLES.find((title) => title.id === titleId)?.name ?? PLAYER_TITLES[0].name;
  }

  private unlockPlayerTitle(titleId: PlayerTitleId): void {
    if (this.unlockedTitleIds.has(titleId)) {
      return;
    }
    this.unlockedTitleIds.add(titleId);
    if (this.mode === 'playing') {
      this.showFloatingText(`称号獲得  /  ${this.getPlayerTitleName(titleId)}`, '#f4d35e', 640);
    }
  }

  private checkPlayerTitleUnlocks(): void {
    if (this.defeatedCount >= 1) this.unlockPlayerTitle('first_blood');
    if (this.defeatedCount >= 50) this.unlockPlayerTitle('monster_hunter');
    if (this.totalMoneyEarned >= 10000) this.unlockPlayerTitle('golden_hand');
    if (this.totalMoneyEarned >= 100000) this.unlockPlayerTitle('gold_saver');
    if (this.totalMoneyEarned >= 1000000) this.unlockPlayerTitle('gold_trader');
    if (this.totalMoneyEarned >= 10000000) this.unlockPlayerTitle('gold_tycoon');
    if (this.totalMoneyEarned >= 100000000) this.unlockPlayerTitle('millionaire');
    if (this.totalMoneyEarned >= 1000000000) this.unlockPlayerTitle('billionaire');
    if (this.bestEndgameWave >= 1) this.unlockPlayerTitle('abyss_entry');
    if (this.bestEndgameWave >= 5) this.unlockPlayerTitle('abyss_walker');
    if (this.bestEndgameWave >= 10) this.unlockPlayerTitle('abyss_veteran');
    if (this.bestEndgameWave >= 20) this.unlockPlayerTitle('abyss_legend');
    if (this.bestEndgameWave >= 30) this.unlockPlayerTitle('abyss_conqueror');
    if (this.bestEndgameWave >= 50) this.unlockPlayerTitle('abyss_immortal');
    if (this.bestEndgameWave >= 100) this.unlockPlayerTitle('abyss_eternal');
    if (this.endgameBossesDefeated >= 1) this.unlockPlayerTitle('first_boss');
    if (this.endgameBossesDefeated >= 5) this.unlockPlayerTitle('boss_hunter');
    if (this.endgameBossesDefeated >= 20) this.unlockPlayerTitle('boss_legend');
  }

  private addMoney(amount: number): void {
    this.money = Math.min(MAX_MONEY, this.money + amount);
    if (this.money >= MAX_MONEY) {
      this.unlockPlayerTitle('money_limit');
    }
  }

  private showShop(category: ShopCategory = this.shopCategory): void {
    this.mode = 'shop';
    this.shopCategory = category;
    this.pauseTimers();
    this.clearScreen();
    this.shopScrollOffset = 0;
    this.drawHud(false);
    this.addText(GAME_WIDTH / 2, 70, 'ショップ', 48, '#f4d35e').setOrigin(0.5);

    const weaponTab = this.addScreenObject(this.add.rectangle(500, 135, 260, 48, category === 'weapon' ? 0x2a9d8f : 0x53616f));
    weaponTab.setInteractive({ useHandCursor: true });
    weaponTab.on('pointerdown', () => this.showShop('weapon'));
    this.addText(500, 135, '武器ショップ', 22, '#ffffff').setOrigin(0.5);
    const equipmentTab = this.addScreenObject(this.add.rectangle(780, 135, 260, 48, category === 'equipment' ? 0x2a9d8f : 0x53616f));
    equipmentTab.setInteractive({ useHandCursor: true });
    equipmentTab.on('pointerdown', () => this.showShop('equipment'));
    this.addText(780, 135, '装備ショップ', 22, '#ffffff').setOrigin(0.5);
    const potionTab = this.addScreenObject(this.add.rectangle(1060, 135, 260, 48, category === 'potion' ? 0x2a9d8f : 0x53616f));
    potionTab.setInteractive({ useHandCursor: true });
    potionTab.on('pointerdown', () => this.showShop('potion'));
    this.addText(1060, 135, 'ポーションショップ', 22, '#ffffff').setOrigin(0.5);

    if (this.shopMessage) {
      this.addText(GAME_WIDTH / 2, 178, this.shopMessage, 18, '#57cc99').setOrigin(0.5);
      this.shopMessage = undefined;
    }

    const items: ShopItem[] = category === 'weapon'
      ? [
        ...WEAPONS.slice(1)
          .map((item, index): GachaItem => ({ ...item, kind: 'weapon', itemIndex: index + 1 }))
          .filter((item) => !WEAPONS[item.itemIndex].gachaOnly),
        { name: '脱出チケット', attackPower: 0, price: CLEAR_TICKET_PRICE, kind: 'ticket', itemIndex: -1 },
        { name: '深淵の連戦チケット', attackPower: 0, price: CLEAR_TICKET_PRICE, kind: 'ticket', itemIndex: -2 },
      ]
      : category === 'equipment'
        ? EQUIPMENTS
          .map((item, itemIndex): GachaItem => ({ ...item, kind: 'equipment', itemIndex }))
          .filter((item) => !EQUIPMENTS[item.itemIndex].gachaOnly)
        : POTION_SHOP_ITEMS.map((item, itemIndex): GachaItem => ({ ...item, kind: 'potion', itemIndex }));
    const potionCounts = [
      this.potionCount,
      this.strengthPotionCount,
      this.weaknessPotionCount,
      this.healthPotionCount,
      this.defensePotionCount,
      this.confusionPotionCount,
    ];
    this.shopItemCount = items.length;
    items.forEach((item, index) => {
      const x = 180 + index * 290;
      const card = this.addScreenObject(this.add.rectangle(x, 360, 250, 330, 0xf8f9fa));
      card.setStrokeStyle(3, 0xd9e2ec, 1);
      this.registerShopObject(card, x);
      const icon = this.drawShopIcon(x, 270, index, item.kind);
      this.registerShopObject(icon, x);
      const nameY = item.kind === 'potion' ? 365 : 390;
      const name = this.addText(x, nameY, item.name, item.kind === 'ticket' ? 19 : 28, '#264653').setOrigin(0.5);
      this.registerShopObject(name, x);
      if (item.kind === 'weapon') {
        const attackDetails = this.addText(x, 427, `攻撃力: ${item.attackPower}`, 20, '#457b9d').setOrigin(0.5);
        const durabilityLabel = item.durability === null
          ? item.name === '邪剣アビス' || item.name === '聖剣エターナル' ? '無限' : 'なし'
          : `${item.durability}回`;
        const durabilityDetails = this.addText(x, 448, `耐久力: ${durabilityLabel}`, 20, '#457b9d').setOrigin(0.5);
        const priceDetails = this.addText(x, 478, `価格: ${item.price}円`, 18, '#457b9d').setOrigin(0.5);
        this.registerShopObject(attackDetails, x);
        this.registerShopObject(durabilityDetails, x);
        this.registerShopObject(priceDetails, x);
      } else {
        const detailText = item.kind === 'equipment'
          ? `最大HP +${item.hpBonus}\n価格: ${item.price}円`
          : item.kind === 'potion'
            ? `${item.effect}\n所持数: ${potionCounts[item.itemIndex]}個\n価格: ${item.price}円`
            : item.itemIndex === -2 ? `${item.price.toLocaleString('ja-JP')}円\n購入して深淵の連戦へ` : `${item.price.toLocaleString('ja-JP')}円\n購入してゲームクリア`;
          const detailFontSize = item.kind === 'potion' || item.kind === 'ticket' ? 16 : 18;
        const details = this.addText(x, 430, detailText, detailFontSize, '#457b9d').setOrigin(0.5);
        details.setAlign('center');
        this.registerShopObject(details, x);
      }
      const button = this.addScreenObject(this.add.rectangle(x, 510, 190, 52, 0x2a9d8f));
      this.registerShopObject(button, x);
      button.setInteractive({ useHandCursor: true });
      const label = this.addText(x, 510, '', 23, '#ffffff').setOrigin(0.5);
      this.registerShopObject(label, x);
      const weaponIndex = item.kind === 'weapon' ? item.itemIndex : -1;
      const equipmentIndex = item.kind === 'equipment' ? item.itemIndex : -1;
      const purchased = item.kind === 'weapon'
        ? this.purchasedWeapons.has(weaponIndex)
        : item.kind === 'equipment' && this.purchasedEquipments.has(equipmentIndex);
      const requiredWeaponIndex = item.kind === 'weapon' ? this.getRequiredWeaponIndex(weaponIndex) : undefined;
      const isLockedWeapon = requiredWeaponIndex !== undefined && !this.purchasedWeapons.has(requiredWeaponIndex);
      const canBuy = item.kind === 'ticket'
        ? this.money >= item.price
        : !purchased && !isLockedWeapon && this.money >= item.price;
      const isEquipped = item.kind === 'weapon' && purchased && weaponIndex === this.weaponIndex;
      if (item.kind === 'ticket') {
        label.setText(canBuy ? '購入' : '購入不可');
      } else if (item.kind === 'weapon' && purchased) {
        label.setText(isEquipped ? '装備中' : '装備');
      } else if (item.kind === 'equipment' && purchased) {
        label.setText('購入済み');
      } else {
        label.setText(canBuy ? '購入' : '購入不可');
      }
      button.setFillStyle(isEquipped || !canBuy && !purchased ? 0x53616f : purchased ? 0x457b9d : 0x2a9d8f);
      if (item.kind === 'weapon' && purchased && !isEquipped) {
        button.on('pointerdown', () => this.equipWeapon(weaponIndex));
      } else if (canBuy && item.kind === 'ticket') {
        button.on('pointerdown', () => this.requestPurchase(item.itemIndex, 'ticket'));
      } else if (canBuy && item.kind !== 'ticket') {
        const purchaseIndex = item.kind === 'weapon' ? weaponIndex - 1 : item.itemIndex;
        button.on('pointerdown', () => this.requestPurchase(purchaseIndex, item.kind));
      }
      this.shopButtons.push(button);
    });

    const leftButton = this.addScreenObject(this.add.rectangle(45, 360, 54, 70, 0x457b9d));
    leftButton.setInteractive({ useHandCursor: true });
    leftButton.on('pointerdown', () => this.scrollShop(1));
    this.addText(45, 360, '<', 34, '#ffffff').setOrigin(0.5);

    const rightButton = this.addScreenObject(this.add.rectangle(1235, 360, 54, 70, 0x457b9d));
    rightButton.setInteractive({ useHandCursor: true });
    rightButton.on('pointerdown', () => this.scrollShop(-1));
    this.addText(1235, 360, '>', 34, '#ffffff').setOrigin(0.5);

    this.addText(GAME_WIDTH / 2, 555, '左右キーまたは矢印ボタンで商品を確認', 16, '#457b9d').setOrigin(0.5);
    const gachaButton = this.addScreenObject(this.add.rectangle(640, 605, 360, 52, 0x2a9d8f));
    gachaButton.setInteractive({ useHandCursor: true });
    this.addText(640, 605, 'ガチャへ', 22, '#ffffff').setOrigin(0.5);
    gachaButton.on('pointerdown', () => this.showGacha(category));
    this.shopButtons.push(gachaButton);
    const backButton = this.addScreenObject(this.add.rectangle(640, 660, 240, 50, 0x457b9d));
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.returnFromShop());
    this.addText(640, 660, '戻る (ESC)', 22, '#ffffff').setOrigin(0.5);
  }

  private showGacha(category: ShopCategory = this.shopCategory): void {
    if (this.mode === 'paused') {
      this.returnToPauseAfterGacha = true;
    } else if (this.mode === 'shop') {
      this.returnToShopAfterGacha = true;
      this.gachaReturnShopCategory = this.shopCategory;
    }
    this.mode = 'gacha';
    this.shopCategory = category;
    this.pauseTimers();
    this.clearScreen();
    const backdrop = this.addScreenObject(this.add.rectangle(640, 360, 1280, 720, 0x101820));
    backdrop.setDepth(-2);
    const grid = this.addScreenObject(this.add.graphics());
    grid.setDepth(-1);
    grid.lineStyle(1, 0x315354, 0.36);
    for (let x = -720; x < 1280; x += 72) {
      grid.lineBetween(x, 0, x + 300, 720);
    }
    grid.lineStyle(2, 0x57cc99, 0.18);
    grid.lineBetween(640, 210, 640, 630);
    this.drawHud(false);

    this.addText(680, 42, 'CAPSULE LAB  /  01', 16, '#57cc99');
    this.addText(680, 70, '運命のカプセル', 40, '#f8f9fa');
    this.addText(682, 119, 'コインを入れて、次の冒険を引き当てよう。', 17, '#adb5bd');

    const categories: Array<{ key: ShopCategory; label: string; x: number }> = [
      { key: 'weapon', label: '武器ガチャ', x: 770 },
      { key: 'equipment', label: '装備ガチャ', x: 950 },
      { key: 'potion', label: 'ポーションガチャ', x: 1130 },
    ];
    for (const tab of categories) {
      const button = this.addScreenObject(this.add.rectangle(tab.x, 176, 156, 42, category === tab.key ? 0x2a9d8f : 0x263746));
      button.setStrokeStyle(2, category === tab.key ? 0xf4d35e : 0x53616f, 1);
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.showGacha(tab.key));
      this.addText(tab.x, 176, tab.label, 19, '#ffffff').setOrigin(0.5);
    }

    const candidates = this.getGachaCandidates(category);
    const totalWeight = candidates.reduce((total, item) => total + this.getGachaWeight(item), 0);
    const categoriesTitle = category === 'weapon' ? '武器' : category === 'equipment' ? '装備' : 'ポーション';
    this.addText(680, 232, `${categoriesTitle}ガチャの景品`, 24, '#f4d35e');
    this.addText(1210, 238, `${candidates.length} ITEMS`, 14, '#adb5bd').setOrigin(1, 0.5);

    const rewardLines = this.addScreenObject(this.add.graphics());
    const capsules: Phaser.GameObjects.Ellipse[] = [];
    const capsuleData = [
      { x: 265, y: 305, color: 0xe76f51, rotation: -0.3 },
      { x: 340, y: 270, color: 0xf4d35e, rotation: 0.2 },
      { x: 415, y: 310, color: 0x57cc99, rotation: 0.35 },
      { x: 300, y: 365, color: 0x457b9d, rotation: 0.3 },
      { x: 375, y: 365, color: 0xe76f51, rotation: -0.2 },
    ];
    const cabinet = this.addScreenObject(this.add.rectangle(340, 515, 400, 280, 0x1d625d));
    cabinet.setStrokeStyle(5, 0xf4d35e, 1);
    this.addScreenObject(this.add.rectangle(340, 424, 400, 14, 0xf4d35e));
    const glass = this.addScreenObject(this.add.ellipse(340, 320, 292, 224, 0x173945, 0.92));
    glass.setStrokeStyle(6, 0xf4d35e, 1);
    for (const capsule of capsuleData) {
      const shell = this.addScreenObject(this.add.ellipse(capsule.x, capsule.y, 68, 50, capsule.color));
      shell.setStrokeStyle(3, 0xf8f9fa, 1);
      shell.setRotation(capsule.rotation);
      capsules.push(shell);
      rewardLines.lineStyle(2, 0xf8f9fa, 0.72);
      rewardLines.lineBetween(capsule.x - 28, capsule.y, capsule.x + 28, capsule.y);
    }
    const glassHighlight = this.addScreenObject(this.add.graphics());
    glassHighlight.lineStyle(5, 0xf8f9fa, 0.3);
    glassHighlight.strokeEllipse(272, 292, 54, 116);
    glassHighlight.lineStyle(2, 0xf8f9fa, 0.22);
    glassHighlight.lineBetween(230, 390, 450, 390);

    const machineLabel = this.addScreenObject(this.add.rectangle(340, 486, 290, 52, 0x101820));
    machineLabel.setStrokeStyle(2, 0x57cc99, 1);
    this.addText(340, 486, 'COIN  /  CAPSULE', 18, '#57cc99').setOrigin(0.5);
    const slot = this.addScreenObject(this.add.rectangle(260, 553, 116, 34, 0x101820));
    slot.setStrokeStyle(2, 0x53616f, 1);
    this.addText(260, 553, 'COIN SLOT', 12, '#adb5bd').setOrigin(0.5);
    const leverStem = this.addScreenObject(this.add.rectangle(456, 546, 10, 58, 0xf4d35e));
    leverStem.setRotation(-0.32);
    const leverKnob = this.addScreenObject(this.add.circle(447, 514, 21, 0xe76f51));
    leverKnob.setStrokeStyle(3, 0xf8f9fa, 1);
    const price = GACHA_PRICES[category];
    const createDrawButton = (x: number, pullCount: number): void => {
      const button = this.addScreenObject(this.add.rectangle(x, 610, 126, 54, pullCount === 10 ? 0xe76f51 : 0x2a9d8f));
      button.setStrokeStyle(3, 0xf8f9fa, 1);
      button.setInteractive({ useHandCursor: true });
      const canDraw = this.money >= price * pullCount && candidates.length > 0;
      if (canDraw) {
        button.on('pointerdown', () => this.drawGacha(category, pullCount));
      } else {
        button.setFillStyle(0x53616f);
        button.setStrokeStyle(3, 0xadb5bd, 1);
        button.removeInteractive();
      }
      const priceLabel = `${(price * pullCount).toLocaleString('ja-JP')}円`;
      this.addText(x, 610, `${pullCount}回  ${priceLabel}`, 17, '#ffffff').setOrigin(0.5);
    };
    createDrawButton(270, 1);
    createDrawButton(410, 10);

    if (capsules.length > 0) {
      this.tweens.add({
        targets: capsules,
        y: '-=7',
        duration: 950,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: this.tweens.stagger(110),
      });
    }

    const columnWidth = 274;
    candidates.forEach((item, index) => {
      const column = Math.floor(index / 6);
      const row = index % 6;
      const x = 680 + column * columnWidth;
      const y = 280 + row * 55;
      const chance = totalWeight > 0 ? (100 * this.getGachaWeight(item) / totalWeight).toFixed(1) : '0.0';
      const rarityColor = item.price >= 1500 ? 0xf4d35e : item.price >= 600 ? 0xe76f51 : 0x57cc99;
      const marker = this.addScreenObject(this.add.circle(x + 5, y + 3, 5, rarityColor));
      marker.setStrokeStyle(1, 0xf8f9fa, 0.8);
      const isLimited = item.gachaOnly === true;
      this.addText(x + 20, y - 10, `${isLimited ? '【限定】' : ''}${item.name}`, 17, isLimited ? '#f4d35e' : '#f8f9fa');
      const detail = item.kind === 'weapon'
        ? `攻撃 ${item.attackPower}${item.gachaEffect === 'critical' ? '・20%で追撃' : item.gachaEffect === 'vampiric' ? '・命中時HP+12' : item.gachaEffect === 'execute' ? '・1/12で即死' : ''}  /  ${item.price}円`
        : item.kind === 'equipment'
          ? `最大HP +${item.hpBonus}${item.damageReduction ? `・被ダメージ -${item.damageReduction * 100}%` : ''}  /  ${item.price}円`
          : `${item.effect}  /  ${item.price}円`;
      this.addText(x + 20, y + 13, detail, 13, '#adb5bd');
      this.addText(x + columnWidth - 12, y - 9, `${chance}%`, 18, `#${rarityColor.toString(16).padStart(6, '0')}`).setOrigin(1, 0);
      rewardLines.lineStyle(1, 0x53616f, 0.55);
      rewardLines.lineBetween(x, y + 34, x + columnWidth - 18, y + 34);
    });

    if (candidates.length === 0) {
      this.addText(680, 290, 'このガチャの景品はありません', 21, '#adb5bd');
    }

    if (this.gachaMessage) {
      const result = this.addText(340, 680, this.gachaMessage, 19, '#f4d35e').setOrigin(0.5);
      result.setStroke('#101820', 4);
      this.gachaMessage = undefined;
    }
    const backButton = this.addScreenObject(this.add.rectangle(1150, 674, 170, 42, 0x263746));
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.returnFromGacha());
    this.addText(1150, 674, '戻る  /  ESC', 17, '#ffffff').setOrigin(0.5);
  }

  private scrollShop(direction: number): void {
    const maxOffset = -Math.max(0, this.shopItemCount - 4) * 290;
    this.shopScrollOffset = Phaser.Math.Clamp(this.shopScrollOffset + direction * 290, maxOffset, 0);
    for (const cardObject of this.shopCardObjects) {
      cardObject.object.x = cardObject.baseX + this.shopScrollOffset;
    }
  }

  private getGachaCandidates(category: ShopCategory): GachaItem[] {
    if (category === 'weapon') {
      return WEAPONS.slice(1)
        .map((item, index): GachaItem => ({ ...item, kind: 'weapon', itemIndex: index + 1 }))
        .filter((item) => {
          const requiredWeaponIndex = this.getRequiredWeaponIndex(item.itemIndex);
          return !this.purchasedWeapons.has(item.itemIndex)
            && (requiredWeaponIndex === undefined || this.purchasedWeapons.has(requiredWeaponIndex));
        });
    }
    if (category === 'equipment') {
      return EQUIPMENTS
        .map((item, itemIndex): GachaItem => ({ ...item, kind: 'equipment', itemIndex }))
        .filter((item) => !this.purchasedEquipments.has(item.itemIndex));
    }
    return POTION_GACHA_ITEMS.map((item, itemIndex): GachaItem => ({ ...item, kind: 'potion', itemIndex }));
  }

  private getGachaWeight(item: GachaItem): number {
    return 1 / (item.price * item.price);
  }

  private drawGacha(category: ShopCategory, pullCount = 1): void {
    const price = GACHA_PRICES[category];
    if (this.money < price * pullCount) {
      return;
    }

    const rewards: GachaItem[] = [];
    for (let pull = 0; pull < pullCount; pull += 1) {
      const candidates = this.getGachaCandidates(category);
      if (candidates.length === 0) {
        break;
      }
      const totalWeight = candidates.reduce((total, item) => total + this.getGachaWeight(item), 0);
      let roll = Math.random() * totalWeight;
      const reward = candidates.find((item) => {
        roll -= this.getGachaWeight(item);
        return roll < 0;
      }) ?? candidates[candidates.length - 1];
      if (!reward) {
        break;
      }
      this.money -= price;
      this.grantGachaReward(reward);
      if (reward.gachaOnly) {
        this.unlockPlayerTitle('collector');
      }
      rewards.push(reward);
    }
    if (rewards.length === 0) {
      return;
    }

    const resultPreview = rewards
      .slice(0, 2)
      .map((reward) => `${reward.gachaOnly ? '【限定】' : ''}${reward.name}`)
      .join('、');
    const extraRewards = rewards.length - Math.min(2, rewards.length);
    this.gachaMessage = `${pullCount}回中${rewards.length}回: ${resultPreview}${extraRewards > 0 ? `、ほか${extraRewards}個` : ''}`;
    this.showGacha(category);
  }

  private grantGachaReward(reward: GachaItem): void {
    if (reward.kind === 'weapon') {
      const requiredWeaponIndex = this.getRequiredWeaponIndex(reward.itemIndex);
      if (requiredWeaponIndex !== undefined) {
        this.purchasedWeapons.delete(requiredWeaponIndex);
        this.weaponDurability.delete(requiredWeaponIndex);
      }
      this.weaponIndex = reward.itemIndex;
      this.purchasedWeapons.add(reward.itemIndex);
      this.weaponDurability.set(reward.itemIndex, reward.durability);
    } else if (reward.kind === 'equipment') {
      this.purchasedEquipments.add(reward.itemIndex);
      this.playerMaxHp += reward.hpBonus;
      this.playerHp += reward.hpBonus;
    } else if (reward.itemIndex === 0) {
      this.potionCount += 1;
    } else if (reward.itemIndex === 1) {
      this.strengthPotionCount += 1;
    } else if (reward.itemIndex === 2) {
      this.weaknessPotionCount += 1;
    } else if (reward.itemIndex === 3) {
      this.healthPotionCount += 1;
    } else if (reward.itemIndex === 4) {
      this.defensePotionCount += 1;
    } else if (reward.itemIndex === 5) {
      this.confusionPotionCount += 1;
    } else if (reward.itemIndex === 6) {
      this.starElixirCount += 1;
    } else {
      this.phoenixElixirCount += 1;
    }
  }

  private purchase(itemIndex: number, itemKind: 'weapon' | 'equipment' | 'potion' | 'ticket'): void {
    if (itemKind === 'weapon') {
      const weaponIndex = itemIndex + 1;
      const weapon = WEAPONS[weaponIndex];
      const requiredWeaponIndex = this.getRequiredWeaponIndex(weaponIndex);
      if (
        this.purchasedWeapons.has(weaponIndex)
        || this.money < weapon.price
        || (requiredWeaponIndex !== undefined && !this.purchasedWeapons.has(requiredWeaponIndex))
      ) {
        return;
      }
      this.money -= weapon.price;
      if (requiredWeaponIndex !== undefined) {
        this.purchasedWeapons.delete(requiredWeaponIndex);
        this.weaponDurability.delete(requiredWeaponIndex);
      }
      this.weaponIndex = weaponIndex;
      this.purchasedWeapons.add(weaponIndex);
      this.weaponDurability.set(weaponIndex, weapon.durability);
      this.showPlaying();
      return;
    }

    if (itemKind === 'equipment') {
      const equipmentIndex = itemIndex;
      const equipment = EQUIPMENTS[equipmentIndex];
      if (this.purchasedEquipments.has(equipmentIndex) || this.money < equipment.price) {
        return;
      }
      this.money -= equipment.price;
      this.purchasedEquipments.add(equipmentIndex);
      this.playerMaxHp += equipment.hpBonus;
      this.playerHp += equipment.hpBonus;
      this.showPlaying();
      this.showFloatingText(`HP +${equipment.hpBonus}`, '#57cc99', 400);
      return;
    }

    if (itemKind === 'potion') {
      const potionPrices = [POTION_PRICE, STRENGTH_POTION_PRICE, WEAKNESS_POTION_PRICE, HEALTH_POTION_PRICE, DEFENSE_POTION_PRICE, CONFUSION_POTION_PRICE];
      const price = potionPrices[itemIndex] ?? POTION_PRICE;
      if (this.money < price) {
        return;
      }
      this.money -= price;
      if (itemIndex === 0) {
        this.potionCount += 1;
      } else if (itemIndex === 1) {
        this.strengthPotionCount += 1;
      } else if (itemIndex === 2) {
        this.weaknessPotionCount += 1;
      } else if (itemIndex === 3) {
        this.healthPotionCount += 1;
      } else if (itemIndex === 4) {
        this.defensePotionCount += 1;
      } else {
        this.confusionPotionCount += 1;
      }
      this.showShop('potion');
      return;
    }

    if (itemIndex === -2 && this.money >= CLEAR_TICKET_PRICE) {
      this.money -= CLEAR_TICKET_PRICE;
      this.startEndgame();
      return;
    }
    if (itemIndex === -1 && this.money >= CLEAR_TICKET_PRICE) {
      this.money -= CLEAR_TICKET_PRICE;
      this.showClear();
    }
  }

  private requestPurchase(itemIndex: number, itemKind: 'weapon' | 'equipment' | 'potion' | 'ticket'): void {
    if (this.confirmationObjects.length > 0) {
      return;
    }
    this.pendingPurchase = { itemIndex, itemKind };
    for (const button of this.shopButtons) {
      if (button.input) {
        button.input.enabled = false;
      }
    }
    const panel = this.addScreenObject(this.add.rectangle(640, 360, 520, 220, 0x264653));
    const message = this.addText(640, 305, 'この商品を購入しますか？', 26, '#ffffff').setOrigin(0.5);
    const yes = this.addScreenObject(this.add.rectangle(555, 410, 140, 52, 0x2a9d8f));
    yes.setInteractive({ useHandCursor: true });
    yes.on('pointerdown', () => this.confirmPurchase());
    const no = this.addScreenObject(this.add.rectangle(725, 410, 140, 52, 0xe76f51));
    no.setInteractive({ useHandCursor: true });
    no.on('pointerdown', () => this.cancelPurchase());
    const yesText = this.addText(555, 410, '購入する', 20, '#ffffff').setOrigin(0.5);
    const noText = this.addText(725, 410, 'やめる', 20, '#ffffff').setOrigin(0.5);
    this.confirmationObjects = [panel, message, yes, no, yesText, noText];
  }

  private confirmPurchase(): void {
    const purchase = this.pendingPurchase;
    this.cancelPurchase();
    if (purchase) {
      this.purchase(purchase.itemIndex, purchase.itemKind);
    }
  }

  private cancelPurchase(): void {
    for (const object of this.confirmationObjects) {
      object.destroy();
      const index = this.screenObjects.indexOf(object);
      if (index >= 0) {
        this.screenObjects.splice(index, 1);
      }
    }
    this.confirmationObjects = [];
    this.pauseOverlayObjects = [];
    this.clearSkillTree();
    this.pendingPurchase = undefined;
    for (const button of this.shopButtons) {
      if (button.input) {
        button.input.enabled = true;
      }
    }
  }

  private equipWeapon(weaponIndex: number): void {
    if (!this.purchasedWeapons.has(weaponIndex)) {
      return;
    }
    this.weaponIndex = weaponIndex;
    this.weaponDurability.set(weaponIndex, this.weaponDurability.get(weaponIndex) ?? WEAPONS[weaponIndex].durability);
    this.showPlaying();
  }

  private getRequiredWeaponIndex(weaponIndex: number): number | undefined {
    const weaponName = WEAPONS[weaponIndex].name;
    if (weaponName === '業火の剣') {
      return WEAPONS.findIndex((weapon) => weapon.name === '炎の剣');
    }
    if (weaponName === '天雷の剣') {
      return WEAPONS.findIndex((weapon) => weapon.name === '雷鳴の剣');
    }
    return undefined;
  }

  private attack(interval: number): void {
    if (!this.enemyAlive || this.time.now - this.lastAttackAt < Math.min(interval, this.getPlayerAttackInterval())) {
      return;
    }
    this.lastAttackAt = this.time.now;
    this.playAttackEffect();
    const attackDamage = this.getAttackDamage(this.getPlayerAttackPower());
    this.applyDamage(attackDamage, '#f4d35e');
    this.applyWeaponEffects(true, attackDamage);
    if (this.selectedSkillByBranch.includes(6) && Math.random() < 0.1 && this.enemyAlive) {
      this.applyDamage(attackDamage, '#f4d35e');
    }
    if (this.selectedSkillByBranch.includes(5)) {
      this.vampiricAttackCount += 1;
      if (this.vampiricAttackCount >= 5) {
        this.vampiricAttackCount = 0;
        const recovery = Math.min(3, this.playerMaxHp - this.playerHp);
        this.playerHp += recovery;
        if (recovery > 0) {
          this.showFloatingText(`HP +${recovery}`, '#57cc99', 400);
          this.updateHud();
        }
      }
    }
    this.consumeWeaponDurability();
  }

  private useSkill(): void {
    if (!this.enemyAlive || this.skillLevels[1] <= 0 || this.time.now - this.lastSkillAt < SKILL_COOLDOWN) {
      return;
    }
    this.lastSkillAt = this.time.now;
    this.playGoldStrikeEffect();
    const attackDamage = this.getAttackDamage(this.getPlayerAttackPower() * (SKILL_DAMAGE_MULTIPLIER + (this.skillLevels[1] - 1) * 0.5));
    this.applyDamage(attackDamage, '#f4d35e');
    this.applyWeaponEffects(false, attackDamage);
  }

  private useMoneyPunchSkill(): void {
    if (!this.enemyAlive || this.skillLevels[2] <= 0 || this.time.now - this.lastMoneyPunchAt < MONEY_PUNCH_COOLDOWN) {
      return;
    }
    this.lastMoneyPunchAt = this.time.now;
    this.playMoneyPunchEffect();
    this.moneyPunchTimer = this.time.delayedCall(350, () => {
      this.moneyPunchTimer = undefined;
      if (this.mode === 'playing' && this.enemyAlive) {
        const attackDamage = this.getAttackDamage(this.getPlayerAttackPower() * (7 + (this.skillLevels[2] - 1)));
        this.applyDamage(attackDamage, '#57cc99');
        this.applyWeaponEffects(false, attackDamage);
      }
    });
  }

  private useHealSkill(): void {
    if (this.skillLevels[3] <= 0 || this.time.now - this.lastHealSkillAt < HEAL_SKILL_COOLDOWN) {
      return;
    }
    const recovery = this.playerMaxHp - this.playerHp;
    if (recovery <= 0) {
      return;
    }
    this.lastHealSkillAt = this.time.now;
    this.playerHp = this.playerMaxHp;
    this.playHealEffect(recovery);
    this.updateHud();
  }

  private usePotion(): void {
    if (this.potionCount <= 0 || this.playerHp >= this.playerMaxHp) {
      return;
    }
    const recovery = this.playerMaxHp - this.playerHp;
    this.potionCount -= 1;
    this.playerHp = this.playerMaxHp;
    this.playHealEffect(recovery);
    this.showFloatingText('ポーション使用', '#57cc99', 1085);
    this.updateHud();
  }

  private useStrengthPotion(): void {
    if (this.strengthPotionCount <= 0) {
      return;
    }
    this.strengthPotionCount -= 1;
    this.strengthPotionAttacksRemaining = 5;
    this.playPotionEffect('strength');
    this.showFloatingText('5回攻撃力アップ', '#f4d35e', 1175);
    this.updateHud();
  }

  private useWeaknessPotion(): void {
    if (this.weaknessPotionCount <= 0 || !this.enemyAlive) {
      return;
    }
    const damage = Math.max(1, Math.floor(this.enemyHp * 0.25));
    this.weaknessPotionCount -= 1;
    this.playPotionEffect('weakness');
    this.applyDamage(damage, '#cdb4db');
    this.showFloatingText('敵のHP -25%', '#cdb4db', 640);
  }

  private useHealthPotion(): void {
    if (this.healthPotionCount <= 0) {
      return;
    }
    this.healthPotionCount -= 1;
    if (this.healthPotionBaseMaxHp === undefined) {
      this.healthPotionBaseMaxHp = this.playerMaxHp;
      this.playerMaxHp *= 1.5;
      this.playerHp *= 1.5;
    }
    this.healthPotionTimer?.remove();
    this.healthPotionTimer = this.time.delayedCall(5 * 60 * 1000, () => {
      if (this.healthPotionBaseMaxHp !== undefined) {
        this.playerMaxHp = this.healthPotionBaseMaxHp;
        this.playerHp = Math.min(this.playerHp, this.playerMaxHp);
        this.healthPotionBaseMaxHp = undefined;
        this.updateHud();
      }
      this.healthPotionTimer = undefined;
    });
    this.playPotionEffect('health');
    this.showFloatingText('最大HP 1.5倍（5分）', '#57cc99', 1215);
    this.updateHud();
  }

  private useDefensePotion(): void {
    if (this.defensePotionCount <= 0 || this.defensePotionActive) {
      return;
    }
    this.defensePotionCount -= 1;
    this.defensePotionActive = true;
    this.playPotionEffect('defense');
    this.showFloatingText('受けるダメージ 1/2', '#457b9d', 1230);
    this.updateHud();
  }

  private useConfusionPotion(): void {
    if (this.confusionPotionCount <= 0 || this.enemyWeakened) {
      return;
    }
    this.confusionPotionCount -= 1;
    this.enemyWeakened = true;
    this.playPotionEffect('confusion');
    this.showFloatingText('敵の攻撃力が半減', '#cdb4db', 640);
    this.updateHud();
  }

  private useStarElixir(): void {
    if (this.starElixirCount <= 0) {
      return;
    }
    this.starElixirCount -= 1;
    this.starElixirAttacksRemaining = 3;
    this.playPotionEffect('strength');
    this.showFloatingText('次の3回攻撃が2.5倍', '#f4d35e', 640);
    this.updateHud();
  }

  private usePhoenixElixir(): void {
    if (this.phoenixElixirCount <= 0 || (this.playerHp >= this.playerMaxHp && !this.enemyAlive)) {
      return;
    }
    this.phoenixElixirCount -= 1;
    const recovery = this.playerMaxHp - this.playerHp;
    this.playerHp = this.playerMaxHp;
    const damage = this.enemyAlive ? Math.max(1, Math.floor(this.enemyMaxHp * 0.35)) : 0;
    this.playPotionEffect('health');
    if (damage > 0) {
      this.applyDamage(damage, '#e76f51');
    }
    this.showFloatingText(`HP +${recovery}  敵に${damage}ダメージ`, '#f4d35e', 640);
    this.updateHud();
  }

  private playPotionEffect(type: 'strength' | 'weakness' | 'health' | 'defense' | 'confusion'): void {
    const effect = this.addScreenObject(this.add.graphics());
    effect.setDepth(EFFECT_DEPTH);
    const color = type === 'strength'
      ? 0xf4d35e
      : type === 'weakness' || type === 'confusion'
        ? 0xcdb4db
        : type === 'defense'
          ? 0x457b9d
          : 0x57cc99;
        effect.setPosition(640, 390);

    if (type === 'strength') {
      effect.lineStyle(6, color, 1);
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2;
        effect.lineBetween(Math.cos(angle) * 24, Math.sin(angle) * 24, Math.cos(angle) * 68, Math.sin(angle) * 68);
      }
      effect.strokeCircle(0, 0, 20);
    } else if (type === 'weakness') {
      effect.lineStyle(6, color, 0.9);
      effect.strokeCircle(0, 0, 38);
      effect.lineStyle(3, 0xffffff, 0.85);
      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * Math.PI * 2;
        effect.lineBetween(Math.cos(angle) * 14, Math.sin(angle) * 14, Math.cos(angle) * 68, Math.sin(angle) * 68);
      }
    } else if (type === 'health') {
      effect.lineStyle(8, color, 0.9);
      effect.strokeCircle(0, 0, 38);
      effect.lineStyle(4, 0xffffff, 0.9);
      effect.strokeCircle(0, 0, 20);
      effect.lineBetween(-12, 0, 12, 0);
      effect.lineBetween(0, -12, 0, 12);
    } else if (type === 'defense') {
      effect.lineStyle(7, color, 1);
      effect.beginPath();
      effect.moveTo(0, -66);
      effect.lineTo(48, -42);
      effect.lineTo(40, 20);
      effect.lineTo(0, 62);
      effect.lineTo(-40, 20);
      effect.lineTo(-48, -42);
      effect.closePath();
      effect.strokePath();
      effect.lineStyle(4, 0xffffff, 0.9);
      effect.lineBetween(-19, 0, -4, 16);
      effect.lineBetween(-4, 16, 24, -18);
    } else {
      effect.lineStyle(6, color, 0.9);
      effect.beginPath();
      effect.arc(0, 0, 24, 0, Math.PI * 1.5);
      effect.strokePath();
      effect.beginPath();
      effect.arc(0, 0, 48, Math.PI, Math.PI * 2.5);
      effect.strokePath();
      effect.fillStyle(0xffffff, 1);
      effect.fillCircle(-10, -4, 5);
      effect.fillCircle(10, 4, 5);
    }

    this.tweens.add({
      targets: effect,
      scaleX: 1.65,
      scaleY: 1.65,
      angle: type === 'confusion' ? 180 : 0,
      alpha: 0,
      duration: 550,
      ease: 'Cubic.easeOut',
      onComplete: () => this.removeScreenObject(effect),
    });
  }

  private getPlayerAttackPower(): number {
    const baseAttackPower = WEAPONS[this.weaponIndex].attackPower;
    const weaponPower = WEAPONS[this.weaponIndex].name === '破砕の剣' ? baseAttackPower * 1.25 : baseAttackPower;
    return weaponPower + this.getSelectedSkillAttackBonus();
  }

  private getPlayerAttackInterval(): number {
    return this.getSelectedSkillId(1) === 4 ? Math.max(50, Math.floor(PLAYER_ATTACK_INTERVAL * 0.75)) : PLAYER_ATTACK_INTERVAL;
  }

  private getSelectedSkillId(branch: number): number | undefined {
    return this.selectedSkillByBranch[branch];
  }

  private getSelectedSkillAttackBonus(): number {
    return this.selectedSkillByBranch.reduce<number>((sum, id) => sum + (id === 1 ? 5 : id === 9 ? 10 : 0), 0);
  }

  private getSelectedSkillMaxHpBonus(): number {
    return (this.selectedSkillByBranch.includes(0) ? 50 : 0)
      + (this.selectedSkillByBranch.includes(9) ? 50 : 0);
  }

  private getEnemyRewardMultiplier(): number {
    let multiplier = 1;
    if (this.selectedSkillByBranch.includes(2)) multiplier *= 1.25;
    if (this.selectedSkillByBranch.includes(7)) multiplier *= 1.10;
    return multiplier;
  }

  private getAttackDamage(baseDamage: number): number {
    const elixirMultiplier = this.starElixirAttacksRemaining > 0 ? 2.5 : 1;
    const damage = baseDamage * this.getStrengthPotionMultiplier() * elixirMultiplier;
    if (this.strengthPotionAttacksRemaining > 0) {
      this.strengthPotionAttacksRemaining -= 1;
    }
    if (this.starElixirAttacksRemaining > 0) {
      this.starElixirAttacksRemaining -= 1;
    }
    return damage;
  }

  private applyWeaponEffects(isNormalAttack: boolean, attackDamage: number): void {
    const weapon = WEAPONS[this.weaponIndex];
    const weaponName = weapon.name;
    if (weaponName === '邪剣アビス') {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 5);
      this.showFloatingText('HP +5', '#57cc99', 400);
    }
    if (weapon.gachaEffect === 'vampiric') {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 12);
      this.showFloatingText('HP +12', '#57cc99', 400);
    }
    if (!isNormalAttack || !this.enemyAlive) {
      return;
    }
    if (weapon.gachaEffect === 'critical' && Math.random() < 0.2) {
      this.applyDamage(attackDamage, '#f4d35e');
    } else if (weapon.gachaEffect === 'execute' && Math.random() < 1 / 12) {
      this.applyDamage(this.enemyHp, '#f8f9fa');
    } else if (weaponName === '神速の剣' && Math.random() < 1 / 3) {
      this.applyDamage(attackDamage * 2, '#f4d35e');
    } else if (weaponName === '雷鳴の剣' && Math.random() < 1 / 10) {
      this.applyDamage(150, '#a8dadc');
    } else if (weaponName === '天雷の剣' && Math.random() < 1 / 5) {
      this.applyDamage(200, '#f4d35e');
    } else if (weaponName === '聖剣エターナル' && Math.random() < 1 / 5) {
      this.applyDamage(this.enemyHp, '#f8f9fa');
    }
    if (weaponName === '炎の剣') {
      this.startDamageOverTime(10);
    } else if (weaponName === '業火の剣') {
      this.startDamageOverTime(30);
    }
  }

  private startDamageOverTime(damage: number): void {
    if (this.damageOverTimeTimer || !this.enemyAlive) {
      return;
    }
    this.damageOverTimeTicksRemaining = 2;
    this.damageOverTimeTimer = this.time.addEvent({
      delay: 1000,
      repeat: 1,
      callback: () => {
        if (this.mode === 'playing' && this.enemyAlive) {
          this.applyDamage(damage, '#e76f51');
        }
        this.damageOverTimeTicksRemaining -= 1;
        if (this.damageOverTimeTicksRemaining <= 0) {
          this.damageOverTimeTimer = undefined;
        }
      },
    });
  }

  private consumeWeaponDurability(): void {
    const weapon = WEAPONS[this.weaponIndex];
    if (weapon.durability === null) {
      return;
    }
    const remaining = (this.weaponDurability.get(this.weaponIndex) ?? weapon.durability) - 1;
    this.weaponDurability.set(this.weaponIndex, remaining);
    if (remaining <= 0) {
      this.breakWeapon();
    }
  }

  private breakWeapon(): void {
    const brokenWeapon = WEAPONS[this.weaponIndex];
    this.purchasedWeapons.delete(this.weaponIndex);
    this.weaponDurability.delete(this.weaponIndex);
    this.weaponIndex = 0;
    this.showWeaponBreakDialog(brokenWeapon.name);
    this.updateHud();
  }

  private showWeaponBreakDialog(weaponName: string): void {
    this.weaponBreakDialogTimer?.remove();
    for (const object of this.weaponBreakDialogObjects) {
      this.removeScreenObject(object);
    }
    const panel = this.addScreenObject(this.add.rectangle(640, 220, 520, 70, 0x264653));
    panel.setDepth(1000);
    const message = this.addText(640, 220, `${weaponName}が壊れた`, 28, '#ffffff').setOrigin(0.5);
    message.setDepth(1001);
    this.weaponBreakDialogObjects = [panel, message];
    this.weaponBreakDialogTimer = this.time.delayedCall(1500, () => {
      for (const object of this.weaponBreakDialogObjects) {
        this.removeScreenObject(object);
      }
      this.weaponBreakDialogObjects = [];
      this.weaponBreakDialogTimer = undefined;
    });
  }

  private getStrengthPotionMultiplier(): number {
    if (this.strengthPotionAttacksRemaining <= 0) {
      return 1;
    }
    return 1 + (6 - this.strengthPotionAttacksRemaining) * 0.2;
  }

  private useRapidSkill(): void {
    if (!this.enemyAlive || this.time.now - this.lastRapidSkillAt < RAPID_SKILL_COOLDOWN) {
      return;
    }
    this.lastRapidSkillAt = this.time.now;
    this.playRapidEffect();
    const attackDamage = this.getAttackDamage(this.getPlayerAttackPower() * 5);
    this.applyDamage(attackDamage, '#ffadad');
    this.applyWeaponEffects(false, attackDamage);
  }

  private applyDamage(amount: number, color: string): void {
    const damage = Math.min(this.enemyHp, amount);
    this.enemyHp -= damage;
    this.showDamageText(damage, color);
    this.updateHud();
    if (this.enemyHp === 0) {
      this.defeatEnemy();
    }
  }

  private showDamageText(damage: number, color: string): void {
    this.showFloatingText(`-${damage}`, color, 640);
  }

  private showFloatingText(message: string, color: string, x: number): void {
    const damageText = this.addScreenObject(this.add.text(x, 330, message, {
      fontFamily: 'sans-serif',
      fontSize: '38px',
      color,
      stroke: '#264653',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(EFFECT_DEPTH));
    this.tweens.add({
      targets: damageText,
      y: '-=55',
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => this.removeScreenObject(damageText),
    });
  }

  private defeatEnemy(): void {
    this.enemyAlive = false;
    this.discoveredEnemies.add(this.enemyVariantIndex);
    this.stopDamageOverTime();
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + ENEMY_DEFEAT_HEAL + (this.selectedSkillByBranch.includes(3) ? 20 : 0));
    const reward = this.getEnemyReward();
    this.addMoney(reward);
    this.totalMoneyEarned += reward;
    this.showFloatingText(`+${reward}円`, '#f4d35e', 640);
    this.defeatedCount += 1;
    if (this.isEndgameBoss()) {
      this.endgameBossesDefeated += 1;
    }
    if (this.defeatedCount % KILLS_PER_LEVEL === 0 && this.level < 3) {
      this.level += 1;
      this.skillPoints += 1;
      this.showLevelUpEffect();
      this.showFloatingText('スキルポイント +1', '#57cc99', 400);
      this.addMoney(100);
      this.totalMoneyEarned += 100;
      this.playerMaxHp += 20;
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 20);
      this.showLevelUpEffect();
      this.showFloatingText('+100円  攻撃力+20  最大HP+20', '#f4d35e', 640);
    }
    this.checkPlayerTitleUnlocks();
    this.updateHud();
    this.playDefeatEffect();
    this.respawnTimer = this.time.delayedCall(
      Phaser.Math.Between(ENEMY_RESPAWN_MIN, ENEMY_RESPAWN_MAX),
      () => {
        if (this.mode !== 'playing') {
          return;
        }
        this.enemyAlive = true;
        if (this.endgameMode) {
          this.endgameWave += 1;
          this.bestEndgameWave = Math.max(this.bestEndgameWave, this.endgameWave);
          this.setupEndgameWave();
        } else {
          this.chooseNextEnemyVariant();
          this.enemyMaxHp = ENEMY_MAX_HP
            + this.defeatedCount * ENEMY_HP_INCREASE
            + ENEMY_VARIANTS[this.enemyVariantIndex].hpBonus;
          this.enemyHp = this.enemyMaxHp;
          this.isRareEnemy = Math.random() < RARE_ENEMY_CHANCE;
        }
        this.drawCombatants();
        this.updateHud();
      },
    );
  }

  private startEnemyAttackTimer(): void {
    if (this.enemyAttackTimer) {
      return;
    }
    this.enemyAttackTimer = this.time.addEvent({
      delay: ENEMY_ATTACK_INTERVAL,
      loop: true,
      callback: () => this.enemyAttack(),
    });
  }

  private enemyAttack(): void {
    if (this.mode !== 'playing' || !this.enemyAlive) {
      return;
    }
    const incomingDamage = this.getEnemyAttackPower();
    const equipmentDamage = Math.floor(incomingDamage * (1 - this.getEquipmentDamageReduction()));
    const damage = Math.max(1, this.defensePotionActive ? Math.floor(equipmentDamage / 2) : equipmentDamage);
    this.playerHp = Math.max(0, this.playerHp - damage);
    this.cameras.main.flash(120, 230, 80, 80);
    this.tweens.add({
      targets: this.enemyVisuals,
      x: '+=14',
      duration: 70,
      yoyo: true,
      repeat: 1,
    });
    this.updateHud();
    if (this.playerHp === 0) {
      this.showGameOver();
    }
  }

  private showGameOver(): void {
    this.mode = 'gameOver';
    this.stopTimers();
    this.clearScreen();
    this.addScreenObject(this.add.rectangle(640, 360, 1280, 720, 0x000000, 1));
    const topWarning = this.addScreenObject(this.add.rectangle(640, 112, 1280, 8, 0xe63946, 0));
    const bottomWarning = this.addScreenObject(this.add.rectangle(640, 608, 1280, 8, 0xe63946, 0));
    const panel = this.addScreenObject(this.add.rectangle(640, 300, 700, 230, 0x0b1118, 0));
    panel.setStrokeStyle(5, 0xe63946, 0);
    const title = this.addText(GAME_WIDTH / 2, 240, this.endgameMode ? '深淵で力尽きた' : 'ゲームオーバー', 60, '#e63946').setOrigin(0.5);
    title.setAlpha(0);
    const restartText = this.addText(GAME_WIDTH / 2, 390, this.endgameMode ? 'スペースキーで深淵に再挑戦' : 'スペースキーでリスタート', 28, '#ffffff').setOrigin(0.5);
    restartText.setAlpha(0);
    if (this.endgameMode) {
      const recordText = this.addText(GAME_WIDTH / 2, 345, `今回の到達: 第${this.endgameWave}戦  /  最高記録: 第${this.bestEndgameWave}戦`, 22, '#f4d35e').setOrigin(0.5);
      recordText.setAlpha(0);
      this.tweens.add({ targets: recordText, alpha: 1, duration: 450, delay: 700 });
    }
    const exitText = this.addText(GAME_WIDTH / 2, 440, 'Escキーで終了', 24, '#d9e2ec').setOrigin(0.5);
    exitText.setAlpha(0);
    this.cameras.main.shake(350, 0.012);
    this.cameras.main.flash(280, 130, 20, 20);
    this.tweens.add({ targets: [topWarning, bottomWarning], alpha: 0.9, duration: 350, delay: 120, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: panel, alpha: 0.98, duration: 450, delay: 180, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: panel,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 700,
      delay: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: [topWarning, bottomWarning],
      alpha: 0.3,
      duration: 650,
      delay: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: title,
      y: 280,
      alpha: 1,
      duration: 650,
      delay: 250,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 900,
      delay: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({ targets: restartText, alpha: 1, duration: 450, delay: 850 });
    this.tweens.add({ targets: exitText, alpha: 1, duration: 450, delay: 1050 });
  }

  private showClear(): void {
    this.unlockPlayerTitle('golden_king');
    this.mode = 'clear';
    this.stopTimers();
    this.clearScreen();
    this.addText(GAME_WIDTH / 2, 280, 'ゲームクリア', 60, '#f4d35e').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 390, 'スペースキーでリスタート', 28, '#264653').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 440, 'Escキーで終了', 24, '#264653').setOrigin(0.5);
  }

  private startEndgame(): void {
    this.stopTimers();
    this.endgameMode = true;
    this.endgameWave = 1;
    this.bestEndgameWave = Math.max(this.bestEndgameWave, this.endgameWave);
    this.playerHp = this.playerMaxHp;
    this.setupEndgameWave();
    this.showPlaying();
    this.showFloatingText('深淵の連戦、開始', '#f4d35e', 640);
  }

  private setupEndgameWave(): void {
    const regularVariantCount = ENEMY_VARIANTS.length - 1;
    const isBossWave = this.isEndgameBoss();
    this.enemyVariantIndex = isBossWave
      ? ENEMY_VARIANTS.length - 1
      : (this.endgameWave - 1) % regularVariantCount;
    const variant = ENEMY_VARIANTS[this.enemyVariantIndex];
    const baseHp = ENEMY_MAX_HP + this.defeatedCount * ENEMY_HP_INCREASE + variant.hpBonus;
    const waveMultiplier = 1 + (this.endgameWave - 1) * 0.12;
    this.enemyMaxHp = Math.round(baseHp * waveMultiplier * (isBossWave ? 3 : 1));
    this.enemyHp = this.enemyMaxHp;
    this.enemyAlive = true;
    this.isRareEnemy = isBossWave;
    this.checkPlayerTitleUnlocks();
  }

  private isEndgameBoss(): boolean {
    return this.endgameMode && this.endgameWave > 0 && this.endgameWave % 5 === 0;
  }

  private drawHud(showHpBars: boolean): void {
    if (showHpBars) {
      const playerHpLabel = this.addText(36, 24, 'プレイヤーHP', 22, '#ffffff');
      playerHpLabel.setStroke('#264653', 4);
      this.playerHpBar = this.addHpBar(36, 58, 300, 0x2a9d8f);
      const enemyHpLabel = this.addText(900, 24, '敵HP', 22, '#ffffff');
      enemyHpLabel.setStroke('#264653', 4);
      this.enemyHpBar = this.addHpBar(900, 58, 300, 0xe76f51);
      this.enemyAttackText = this.addText(900, 105, '', 22, '#ffffff');
      this.enemyAttackText.setStroke('#264653', 4);
      this.enemyRewardText = this.addText(900, 135, '', 18, '#ffffff');
      this.enemyRewardText.setStroke('#264653', 3);
    }
    this.hudText = this.addText(36, showHpBars ? 105 : 24, '', 22, showHpBars ? '#ffffff' : '#264653');
    this.hudText.setStroke(showHpBars ? '#264653' : '#f8f9fa', 4);
    if (showHpBars) {
      this.progressText = this.addText(36, 225, '', 18, '#ffffff');
      this.progressText.setStroke('#264653', 3);
      const clearLabel = this.addText(900, 165, 'クリア進行度', 18, '#ffffff');
      clearLabel.setStroke('#264653', 3);
      this.clearProgressBar = this.addHpBar(900, 190, 300, 0xf4d35e);
      this.clearProgressBar.setSize(0, 12);
    }
    this.updateHud();
  }

  private drawPlayfieldBackground(): void {
    const grass = this.addScreenObject(this.add.rectangle(640, 360, 1280, 720, 0x78b159));
    grass.setOrigin(0.5, 0.5);

    const grassDetails = this.addScreenObject(this.add.graphics());
    grassDetails.lineStyle(3, 0x5f9447, 0.65);
    for (let x = 20; x < 1280; x += 55) {
      for (let y = 150 + ((x / 55) % 2) * 25; y < 690; y += 95) {
        grassDetails.lineBetween(x, y, x + 8, y - 16);
        grassDetails.lineBetween(x + 8, y - 16, x + 16, y);
      }
    }

    const whiteBattlefield = this.addScreenObject(this.add.rectangle(640, 390, 420, 360, 0xffffff));
    whiteBattlefield.setOrigin(0.5, 0.5);
    whiteBattlefield.setStrokeStyle(5, 0xd9e2ec, 1);
  }

  private updateHud(): void {
    this.hudText?.setText([
      `レベル: ${this.level}  撃破数: ${this.defeatedCount}  SP: ${this.skillPoints}`,
      `所持金: ${this.money.toLocaleString('ja-JP')}円`,
      `装備中: ${WEAPONS[this.weaponIndex].gachaOnly ? '【限定】' : ''}${WEAPONS[this.weaponIndex].name} (攻撃力 ${this.getPlayerAttackPower()})`,
      `スキル: ${this.getSelectedSkillNames()}`,
    ]);
    this.progressText?.setText(this.endgameMode
      ? `深淵 第${this.endgameWave}戦${this.isEndgameBoss() ? '  /  BOSS' : ''}`
      : `次のレベルまで: ${KILLS_PER_LEVEL - (this.defeatedCount % KILLS_PER_LEVEL)}体`);
    this.playerHpBar?.setSize(300 * (this.playerHp / this.playerMaxHp), 24);
    this.enemyHpBar?.setSize(300 * (this.enemyHp / this.enemyMaxHp), 24);
    this.enemyAttackText?.setText(`敵攻撃力: ${this.getEnemyAttackPower()}`);
    this.enemyRewardText?.setText(`撃破報酬: ${this.getEnemyReward()}円`);
    this.potionCountText?.setText(`× ${this.potionCount}`);
    this.strengthPotionCountText?.setText(`× ${this.strengthPotionCount}`);
    this.weaknessPotionCountText?.setText(`× ${this.weaknessPotionCount}`);
    this.healthPotionCountText?.setText(`× ${this.healthPotionCount}`);
    this.defensePotionCountText?.setText(`× ${this.defensePotionCount}`);
    this.confusionPotionCountText?.setText(`× ${this.confusionPotionCount}`);
    this.starElixirCountText?.setText(`× ${this.starElixirCount}`);
    this.phoenixElixirCountText?.setText(`× ${this.phoenixElixirCount}`);
    this.clearProgressBar?.setSize(300 * Math.min(1, this.money / CLEAR_TICKET_PRICE), 12);
    this.potionSlotPanels[0]?.setFillStyle(this.potionCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[1]?.setFillStyle(this.strengthPotionCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[2]?.setFillStyle(this.weaknessPotionCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[3]?.setFillStyle(this.healthPotionCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[4]?.setFillStyle(this.defensePotionCount > 0 && !this.defensePotionActive ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[5]?.setFillStyle(this.confusionPotionCount > 0 && !this.enemyWeakened ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[6]?.setFillStyle(this.starElixirCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[7]?.setFillStyle(this.phoenixElixirCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.updateSkillHud();
  }

  private getEnemyAttackPower(): number {
    const variant = ENEMY_VARIANTS[this.enemyVariantIndex];
    const baseAttackPower = variant.attackPower + this.defeatedCount * ENEMY_ATTACK_INCREASE;
    const waveMultiplier = this.endgameMode ? 1 + (this.endgameWave - 1) * 0.07 : 1;
    const bossMultiplier = this.isEndgameBoss() ? 1.8 : 1;
    const attackPower = Math.ceil(baseAttackPower * waveMultiplier * bossMultiplier);
    const skillReduced = this.selectedSkillByBranch.includes(8) ? Math.max(1, Math.floor(attackPower * 0.9)) : attackPower;
    return this.enemyWeakened ? Math.max(1, Math.floor(skillReduced / 2)) : skillReduced;
  }

  private getEquipmentDamageReduction(): number {
    return Array.from(this.purchasedEquipments).reduce(
      (total, equipmentIndex) => total + (EQUIPMENTS[equipmentIndex].damageReduction ?? 0),
      0,
    );
  }

  private getEnemyReward(): number {
    const variant = ENEMY_VARIANTS[this.enemyVariantIndex];
    const rareMultiplier = this.isRareEnemy ? RARE_ENEMY_REWARD_MULTIPLIER : 1;
    const endgameMultiplier = this.endgameMode ? 1 + this.endgameWave * 0.1 : 1;
    return Math.round(variant.reward * this.getEnemyRewardMultiplier() * rareMultiplier * endgameMultiplier);
  }

  private updateSkillHud(): void {
    this.updateSkillButtons();
  }

  private addSkillButtons(): void {
    const skills = [
      { x: 150, y: 310, action: () => this.useRapidSkill() },
      { x: 150, y: 440, action: () => this.useSkill() },
      { x: 150, y: 570, action: () => this.useMoneyPunchSkill() },
      { x: 1130, y: 400, action: () => this.useHealSkill() },
    ];
    for (const skill of skills) {
      const button = this.addScreenObject(this.add.circle(skill.x, skill.y, 54, 0x457b9d));
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', skill.action);
      this.skillButtons.push(button);
      const icon = this.drawSkillIcon(skill.x, skill.y, this.skillButtons.length - 1);
      icon.setScale(1.2);
      this.skillButtonIcons.push(icon);
      const ring = this.addScreenObject(this.add.graphics());
      ring.setPosition(skill.x, skill.y);
      this.skillCooldownRings.push(ring);
    }
    this.updateSkillButtons();
  }

  private addPotionSlot(): void {
    const slots = [
      { x: 920, name: '回復', count: this.potionCount, color: 0xe76f51, action: () => this.usePotion() },
      { x: 965, name: '力', count: this.strengthPotionCount, color: 0xf4d35e, action: () => this.useStrengthPotion() },
      { x: 1010, name: '弱体', count: this.weaknessPotionCount, color: 0xcdb4db, action: () => this.useWeaknessPotion() },
      { x: 1055, name: '体力', count: this.healthPotionCount, color: 0x57cc99, action: () => this.useHealthPotion() },
      { x: 1100, name: '守り', count: this.defensePotionCount, color: 0x457b9d, action: () => this.useDefensePotion() },
      { x: 1145, name: '混乱', count: this.confusionPotionCount, color: 0x6d597a, action: () => this.useConfusionPotion() },
      { x: 1190, name: '星詠み', count: this.starElixirCount, color: 0xf4d35e, action: () => this.useStarElixir() },
      { x: 1235, name: '不死鳥', count: this.phoenixElixirCount, color: 0xe76f51, action: () => this.usePhoenixElixir() },
    ];
    for (const slot of slots) {
      const panel = this.addScreenObject(this.add.rectangle(slot.x, 555, 43, 100, 0xf8f9fa));
      panel.setStrokeStyle(3, 0xd9e2ec, 1);
      panel.setInteractive({ useHandCursor: true });
      panel.on('pointerdown', slot.action);
      this.potionSlotPanels.push(panel);
      const icon = this.addScreenObject(this.add.graphics());
      icon.setPosition(slot.x, 550);
      icon.fillStyle(slot.color, 1);
      icon.fillRoundedRect(-11, -16, 22, 32, 5);
      icon.fillStyle(0x8d99ae, 1);
      icon.fillRect(-6, -24, 12, 8);
      icon.lineStyle(2, 0x264653, 1);
      icon.strokeRoundedRect(-11, -16, 22, 32, 5);
      icon.strokeRect(-6, -24, 12, 8);
      this.addText(slot.x, 518, slot.name, 13, '#264653').setOrigin(0.5);
      const countText = this.addText(slot.x, 583, `× ${slot.count}`, 15, '#457b9d').setOrigin(0.5);
      if (slot.name === '回復') {
        this.potionCountText = countText;
      } else if (slot.name === '力') {
        this.strengthPotionCountText = countText;
      } else if (slot.name === '弱体') {
        this.weaknessPotionCountText = countText;
      } else if (slot.name === '体力') {
        this.healthPotionCountText = countText;
      } else if (slot.name === '守り') {
        this.defensePotionCountText = countText;
      } else if (slot.name === '混乱') {
        this.confusionPotionCountText = countText;
      } else if (slot.name === '星詠み') {
        this.starElixirCountText = countText;
      } else {
        this.phoenixElixirCountText = countText;
      }
    }
  }

  private updateSkillButtons(): void {
    if (this.skillButtons.length !== 4 || this.skillButtonIcons.length !== 4) {
      return;
    }
    const available = [
      this.skillLevels[0] > 0 && this.getSkillRemaining(this.lastRapidSkillAt, RAPID_SKILL_COOLDOWN) === 0,
      this.skillLevels[1] > 0 && this.getSkillRemaining(this.lastSkillAt, SKILL_COOLDOWN) === 0,
      this.skillLevels[2] > 0 && this.getSkillRemaining(this.lastMoneyPunchAt, MONEY_PUNCH_COOLDOWN) === 0,
      this.skillLevels[3] > 0 && this.getSkillRemaining(this.lastHealSkillAt, HEAL_SKILL_COOLDOWN) === 0,
    ];
    for (let index = 0; index < this.skillButtons.length; index += 1) {
      this.skillButtons[index].setFillStyle(available[index] ? 0x2a9d8f : 0x53616f);
      this.skillButtonIcons[index].setAlpha(available[index] ? 1 : 0.45);
      const cooldowns = [
        this.getSkillRemaining(this.lastRapidSkillAt, RAPID_SKILL_COOLDOWN) / RAPID_SKILL_COOLDOWN,
        this.getSkillRemaining(this.lastSkillAt, SKILL_COOLDOWN) / SKILL_COOLDOWN,
        this.getSkillRemaining(this.lastMoneyPunchAt, MONEY_PUNCH_COOLDOWN) / MONEY_PUNCH_COOLDOWN,
        this.getSkillRemaining(this.lastHealSkillAt, HEAL_SKILL_COOLDOWN) / HEAL_SKILL_COOLDOWN,
      ];
      const ring = this.skillCooldownRings[index];
      ring.clear();
      if (cooldowns[index] > 0) {
        ring.lineStyle(7, 0x264653, 1);
        ring.beginPath();
        ring.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + cooldowns[index] * Math.PI * 2, false);
        ring.strokePath();
        ring.lineStyle(4, 0xffffff, 1);
        ring.beginPath();
        ring.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + cooldowns[index] * Math.PI * 2, false);
        ring.strokePath();
      }
    }
  }

  private drawSkillIcon(x: number, y: number, skillIndex: number): Phaser.GameObjects.Graphics {
    const icon = this.addScreenObject(this.add.graphics());
    icon.setPosition(x, y);
    if (skillIndex === 0) {
      icon.lineStyle(6, 0xffffff, 1);
      for (let index = 0; index < 3; index += 1) {
        icon.lineBetween(-18, -28 + index * 14, 18, 8 + index * 14);
      }
    } else if (skillIndex === 1) {
      this.drawAxeShape(icon);
    } else if (skillIndex === 2) {
      icon.fillStyle(0x57cc99, 1);
      icon.fillRect(-25, -16, 50, 32);
      icon.lineStyle(3, 0xffffff, 1);
      icon.strokeRect(-25, -16, 50, 32);
      icon.lineBetween(-12, -10, -12, 10);
      icon.lineBetween(8, -10, 8, 10);
    } else {
      icon.fillStyle(0x57cc99, 1);
      icon.fillRect(-10, -28, 20, 56);
      icon.fillRect(-28, -10, 56, 20);
      icon.lineStyle(3, 0xffffff, 1);
      icon.strokeRect(-10, -28, 20, 56);
      icon.strokeRect(-28, -10, 56, 20);
    }
    return icon;
  }

  private drawAxeShape(graphics: Phaser.GameObjects.Graphics): void {
    graphics.lineStyle(10, 0x8d5524, 1);
    graphics.lineBetween(-22, 28, 8, -25);
    graphics.fillStyle(0xf4d35e, 1);
    graphics.fillTriangle(2, -30, 42, -22, 22, 12);
    graphics.lineStyle(3, 0xfff3b0, 1);
    graphics.strokeTriangle(2, -30, 42, -22, 22, 12);
  }

  private drawAxeGraphic(x: number, y: number, scale: number): Phaser.GameObjects.Graphics {
    const axe = this.addScreenObject(this.add.graphics());
    axe.setPosition(x, y);
    axe.setScale(scale);
    axe.setDepth(EFFECT_DEPTH);
    this.drawAxeShape(axe);
    return axe;
  }

  private getSkillRemaining(lastUsedAt: number, cooldown: number): number {
    return Math.max(0, cooldown - (this.time.now - lastUsedAt));
  }

  private applyPausedDuration(): void {
    if (this.pausedAt === undefined) {
      return;
    }
    const pausedDuration = this.time.now - this.pausedAt;
    this.lastAttackAt += pausedDuration;
    this.lastSkillAt += pausedDuration;
    this.lastMoneyPunchAt += pausedDuration;
    this.lastHealSkillAt += pausedDuration;
    this.lastRapidSkillAt += pausedDuration;
    this.pausedAt = undefined;
  }

  private addHpBar(x: number, y: number, width: number, color: number): Phaser.GameObjects.Rectangle {
    const background = this.addScreenObject(this.add.rectangle(x, y, width, 24, 0x334155));
    background.setOrigin(0, 0);
    const bar = this.addScreenObject(this.add.rectangle(x, y, width, 24, color));
    bar.setOrigin(0, 0);
    return bar;
  }

  private playAttackEffect(): void {
    const slash = this.addScreenObject(this.add.graphics());
    slash.setDepth(EFFECT_DEPTH);
    slash.lineStyle(10, 0xf4d35e, 1);
    slash.beginPath();
    slash.moveTo(500, 300);
    slash.lineTo(720, 440);
    slash.moveTo(540, 270);
    slash.lineTo(760, 410);
    slash.strokePath();
    this.tweens.add({
      targets: slash,
      x: 50,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => this.removeScreenObject(slash),
    });
  }

  private playRapidEffect(): void {
    this.playSkillLabel('連撃！', '#ffadad');
    for (let index = 0; index < 3; index += 1) {
      const slash = this.addScreenObject(this.add.graphics());
      slash.setPosition(640, 370);
      slash.setDepth(EFFECT_DEPTH);
      slash.lineStyle(12, 0xffadad, 1);
      slash.beginPath();
      slash.moveTo(-130, -80 + index * 55);
      slash.lineTo(100, 40 + index * 55);
      slash.strokePath();
      this.tweens.add({
        targets: slash,
        x: '+=130',
        alpha: 0,
        duration: 220,
        delay: index * 70,
        ease: 'Cubic.easeOut',
        onComplete: () => this.removeScreenObject(slash),
      });
    }
  }

  private playGoldStrikeEffect(): void {
    this.playSkillLabel('金の一撃！', '#f4d35e');
    const axe = this.drawAxeGraphic(280, 370, 1.25);
    this.tweens.add({
      targets: axe,
      x: 640,
      angle: 720,
      duration: 450,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.removeScreenObject(axe);
        const impact = this.addScreenObject(this.add.graphics());
        impact.setPosition(640, 370);
        impact.setDepth(EFFECT_DEPTH);
        impact.lineStyle(8, 0xf4d35e, 1);
        impact.strokeCircle(0, 0, 45);
        this.tweens.add({
          targets: impact,
          scaleX: 1.8,
          scaleY: 1.8,
          alpha: 0,
          duration: 220,
          onComplete: () => this.removeScreenObject(impact),
        });
      },
    });
  }

  private playMoneyPunchEffect(): void {
    this.playSkillLabel('札束パンチ！', '#57cc99');
    for (let index = 0; index < 5; index += 1) {
      const bill = this.addScreenObject(this.add.rectangle(300, 370 + (index - 2) * 35, 90, 48, 0x57cc99));
      bill.setDepth(EFFECT_DEPTH);
      bill.setStrokeStyle(4, 0x1b7f5a, 1);
      bill.setAngle(-15 + index * 8);
      this.tweens.add({
        targets: bill,
        x: 640 + index * 12,
        y: 370 + (index - 2) * 12,
        angle: 360 + index * 30,
        alpha: 0,
        duration: 500,
        delay: index * 45,
        ease: 'Back.easeIn',
        onComplete: () => this.removeScreenObject(bill),
      });
    }
  }

  private playHealEffect(recovery: number): void {
    const glow = this.addScreenObject(this.add.graphics());
    glow.setPosition(640, 390);
    glow.setDepth(EFFECT_DEPTH);
    glow.fillStyle(0x57cc99, 0.25);
    glow.fillCircle(0, 0, 85);
    glow.lineStyle(8, 0x57cc99, 1);
    glow.strokeCircle(0, 0, 85);
    this.showFloatingText(`HP +${recovery}`, '#57cc99', 640);
    this.tweens.add({
      targets: glow,
      scaleX: 1.7,
      scaleY: 1.7,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => this.removeScreenObject(glow),
    });
  }

  private playSkillLabel(label: string, color: string): void {
    const skillLabel = this.addScreenObject(this.add.text(640, 190, label, {
      fontFamily: 'sans-serif',
      fontSize: '44px',
      color,
      stroke: '#264653',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(EFFECT_DEPTH));
    this.tweens.add({
      targets: skillLabel,
      y: '-=40',
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => this.removeScreenObject(skillLabel),
    });
  }

  private showLevelUpEffect(): void {
    const levelLabel = this.addScreenObject(this.add.text(640, 120, `レベル${this.level}！`, {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      color: '#f4d35e',
      stroke: '#264653',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(EFFECT_DEPTH));
    this.tweens.add({
      targets: levelLabel,
      y: '-=50',
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => this.removeScreenObject(levelLabel),
    });
  }

  private playDefeatEffect(): void {
    const defeatText = this.addScreenObject(this.add.text(640, 350, '撃破！', {
      fontFamily: 'sans-serif',
      fontSize: '42px',
      color: '#f4d35e',
      stroke: '#3d405b',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(EFFECT_DEPTH));
    this.tweens.add({
      targets: this.enemyVisuals,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeIn',
    });
    this.tweens.add({
      targets: defeatText,
      y: '-=60',
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.removeScreenObject(defeatText);
        if (this.mode === 'playing') {
          this.drawCombatants();
        }
      },
    });
  }

  private getSelectedSkillNames(): string {
    const names = this.selectedSkillByBranch.map((id) => id === undefined ? 'なし' : this.getSkillTreeData()[id].name);
    return names.join(' / ');
  }

  private getSkillTreeData(): Array<{ id: number; branch: number; name: string; description: string }> {
    return [
      { id: 0, branch: 0, name: '生命強化', description: '最大HP +50' },
      { id: 1, branch: 0, name: '剛力', description: '攻撃力 +5' },
      { id: 2, branch: 0, name: '強欲', description: '報酬 +25%' },
      { id: 3, branch: 0, name: '再生', description: '敵撃破回復 +20' },
      { id: 4, branch: 1, name: '俊足', description: '通常攻撃間隔 -25%' },
      { id: 5, branch: 1, name: '吸血', description: '通常攻撃5回ごとにHP +3' },
      { id: 6, branch: 1, name: '会心', description: '10%でダメージ2倍' },
      { id: 7, branch: 2, name: '幸運', description: '撃破報酬 +10%' },
      { id: 8, branch: 2, name: '鉄壁', description: '敵攻撃力 -10%' },
      { id: 9, branch: 2, name: '王者', description: '攻撃力 +10 / 最大HP +50' },
    ];
  }

  private showSkillTree(returnToPause = false): void {
    if (this.mode === 'playing') {
      this.pausedAt = this.time.now;
    }
    this.returnToPauseAfterSkillTree = returnToPause || this.returnToPauseAfterShop;
    this.returnToPauseAfterShop = false;
    this.clearPauseOverlay();
    this.mode = 'skillTree';
    this.pauseTimers();
    this.clearScreen();
    const panel = this.addScreenObject(this.add.rectangle(640, 360, 1180, 650, 0xf8f9fa));
    panel.setStrokeStyle(5, 0x2a9d8f, 1);
    this.addText(640, 55, 'スキルツリー', 44, '#264653').setOrigin(0.5);
    this.addText(640, 92, '各枝から1個を装備。未開放スキルはSP 1で開放できます。', 18, '#457b9d').setOrigin(0.5);

    const data = this.getSkillTreeData();
    const branchX = [250, 640, 1030];
    const groups = [
      data.filter((skill) => skill.branch === 0),
      data.filter((skill) => skill.branch === 1),
      data.filter((skill) => skill.branch === 2),
    ];

    groups.forEach((group, branch) => {
      this.addText(branchX[branch], 165, `枝 ${branch + 1}`, 24, '#2a9d8f').setOrigin(0.5);
      group.forEach((skill, index) => {
        const y = 230 + index * 90;
        const selected = this.selectedSkillByBranch[branch] === skill.id;
        const unlocked = this.unlockedSkillIds.has(skill.id);
        const button = this.addScreenObject(this.add.rectangle(
          branchX[branch],
          y,
          300,
          78,
          selected ? 0x2a9d8f : unlocked ? 0xffffff : 0xe9ecef,
        ));
        button.setStrokeStyle(3, selected ? 0xf4d35e : unlocked ? 0xd9e2ec : 0xadb5bd, 1);
        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.selectSkillTreeSkill(skill.id));
        this.skillTreeObjects.push(button);
        const title = this.addText(branchX[branch], y - 17, skill.name, 21, selected ? '#ffffff' : '#264653').setOrigin(0.5);
        const detail = unlocked
          ? skill.description
          : this.skillPoints > 0 ? 'クリックして開放（SP 1）' : '未開放（レベルアップでSP獲得）';
        const desc = this.addText(branchX[branch], y + 16, detail, 15, selected ? '#ffffff' : '#457b9d').setOrigin(0.5);
        this.skillTreeObjects.push(title, desc);
      });
    });

    this.addText(640, 122, `未使用スキルポイント: ${this.skillPoints}　開放済みスキルは自由に切替可能`, 18, '#264653').setOrigin(0.5);
    this.addText(640, 558, '技の開放（各SP 1）', 20, '#264653').setOrigin(0.5);
    TECHNIQUE_NAMES.forEach((name, index) => {
      const x = 190 + index * 300;
      const unlocked = this.skillLevels[index] > 0;
      const button = this.addScreenObject(this.add.rectangle(
        x,
        595,
        260,
        48,
        unlocked ? 0x2a9d8f : this.skillPoints > 0 ? 0x457b9d : 0xadb5bd,
      ));
      button.setInteractive({ useHandCursor: !unlocked && this.skillPoints > 0 });
      button.on('pointerdown', () => this.unlockTechnique(index));
      this.skillTreeObjects.push(button);
      const label = unlocked ? '開放済み' : this.skillPoints > 0 ? 'SP 1で開放' : 'SP不足';
      const text = this.addText(x, 595, `${name}: ${label}`, 17, '#ffffff').setOrigin(0.5);
      this.skillTreeObjects.push(text);
    });
    const back = this.addScreenObject(this.add.rectangle(640, 645, 260, 50, 0x457b9d));
    back.setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.returnFromSkillTree());
    this.addText(640, 645, '戻る (ESC)', 22, '#ffffff').setOrigin(0.5);
  }

  private returnFromSkillTree(): void {
    const shouldReturnToPause = this.returnToPauseAfterSkillTree;
    this.returnToPauseAfterSkillTree = false;
    this.clearScreen();
    this.applyPausedDuration();
    this.showPlaying();
    if (shouldReturnToPause) {
      this.showPause();
    }
  }

  private unlockTechnique(techniqueIndex: number): void {
    if (this.skillLevels[techniqueIndex] !== 0 || this.skillPoints <= 0) {
      return;
    }
    this.skillPoints -= 1;
    this.skillLevels[techniqueIndex] = 1;
    this.showSkillTree(this.returnToPauseAfterSkillTree);
  }

  private selectSkillTreeSkill(skillId: number): void {
    const skill = this.getSkillTreeData()[skillId];
    if (!skill) {
      return;
    }
    if (!this.unlockedSkillIds.has(skillId)) {
      if (this.skillPoints <= 0) {
        this.showFloatingText('スキルポイント不足：レベルアップで獲得', '#e76f51', 640);
        return;
      }
      this.skillPoints -= 1;
      this.unlockedSkillIds.add(skillId);
    }
    const previous = this.selectedSkillByBranch[skill.branch];
    const previousMaxHpBonus = this.getSelectedSkillMaxHpBonus();
    this.selectedSkillByBranch[skill.branch] = skillId;
    if (previous !== skillId && (previous === 5 || skillId === 5)) {
      this.vampiricAttackCount = 0;
    }
    const maxHpBonusChange = this.getSelectedSkillMaxHpBonus() - previousMaxHpBonus;

    if (maxHpBonusChange !== 0) {
      if (this.healthPotionBaseMaxHp !== undefined) {
        this.healthPotionBaseMaxHp += maxHpBonusChange;
        this.playerMaxHp = this.healthPotionBaseMaxHp * 1.5;
      } else {
        this.playerMaxHp += maxHpBonusChange;
      }
    }
    if (skillId === 3 && previous !== 3) this.showFloatingText('撃破回復 +20', '#57cc99', 640);

    this.playerHp = Math.min(this.playerHp, this.playerMaxHp);
    this.showSkillTree(this.returnToPauseAfterSkillTree);
  }

  private drawShopIcon(x: number, y: number, itemIndex: number, itemKind: 'weapon' | 'equipment' | 'potion' | 'ticket'): Phaser.GameObjects.Graphics {
    const icon = this.addScreenObject(this.add.graphics());
    icon.setPosition(x, y);
    if (itemKind === 'ticket') {
      icon.fillStyle(0xf4d35e, 1);
      icon.fillRoundedRect(-42, -28, 84, 56, 8);
      icon.lineStyle(4, 0x9a6b00, 1);
      icon.strokeRoundedRect(-42, -28, 84, 56, 8);
      icon.lineStyle(2, 0x9a6b00, 0.9);
      icon.lineBetween(-18, -22, -18, 22);
      icon.lineBetween(18, -22, 18, 22);
      icon.fillStyle(0x264653, 1);
      icon.fillCircle(0, 0, 12);
      icon.fillStyle(0xf4d35e, 1);
      icon.fillTriangle(6, 0, -3, -7, -3, 7);
      icon.fillStyle(0x9a6b00, 1);
      icon.fillRect(-12, 15, 24, 3);
      icon.fillRect(-8, -18, 16, 3);
      return icon;
    }

    if (itemKind === 'equipment') {
      icon.lineStyle(4, 0x264653, 1);
      if (itemIndex === 0 || itemIndex === 4) {
        const armorColor = itemIndex === 4 ? 0x6d597a : 0x457b9d;
        icon.fillStyle(armorColor, 1);
        icon.fillRoundedRect(-38, -34, 76, 68, 14);
        icon.strokeRoundedRect(-38, -34, 76, 68, 14);
        icon.lineBetween(0, -32, 0, 32);
        icon.lineBetween(-30, -8, 30, -8);
        icon.fillStyle(0xf4d35e, 1);
        icon.fillCircle(0, 8, itemIndex === 4 ? 10 : 7);
      } else if (itemIndex === 1) {
        icon.fillStyle(0x8d99ae, 1);
        icon.fillTriangle(0, -44, -38, -10, 0, 44);
        icon.fillTriangle(0, -44, 38, -10, 0, 44);
        icon.strokeTriangle(0, -44, -38, -10, -30, 30);
        icon.strokeTriangle(0, -44, 38, -10, 30, 30);
        icon.fillStyle(0xf4d35e, 1);
        icon.fillCircle(0, 0, 10);
      } else if (itemIndex === 2) {
        icon.fillStyle(0xf4d35e, 1);
        icon.fillCircle(0, 0, 28);
        icon.lineStyle(4, 0x9a6b00, 1);
        icon.strokeCircle(0, 0, 28);
        icon.fillStyle(0x57cc99, 1);
        icon.fillCircle(0, 0, 11);
        icon.fillStyle(0xf8f9fa, 1);
        icon.fillCircle(-4, -4, 4);
      } else if (itemIndex === 3) {
        icon.fillStyle(0xe76f51, 1);
        icon.fillTriangle(0, -44, -42, 36, 42, 36);
        icon.strokeTriangle(0, -44, -42, 36, 42, 36);
        icon.lineStyle(5, 0xf4d35e, 1);
        icon.lineBetween(-30, 18, 30, 18);
        icon.lineStyle(4, 0x264653, 1);
        icon.lineBetween(0, -34, 0, 30);
      } else {
        icon.fillStyle(0xf4d35e, 1);
        icon.fillRect(-38, -28, 76, 14);
        icon.fillRect(-28, -42, 14, 14);
        icon.fillRect(-4, -42, 14, 14);
        icon.fillRect(20, -42, 14, 14);
        icon.lineStyle(4, 0x9a6b00, 1);
        icon.strokeRect(-38, -28, 76, 14);
        icon.lineBetween(-21, -42, -21, -28);
        icon.lineBetween(3, -42, 3, -28);
        icon.lineBetween(27, -42, 27, -28);
        icon.fillStyle(0x57cc99, 1);
        icon.fillCircle(0, 12, 12);
      }
      return icon;
    }

    if (itemKind === 'potion') {
      const potionColors = [0xe76f51, 0xf4d35e, 0xcdb4db, 0x57cc99, 0x457b9d, 0x6d597a];
      icon.fillStyle(potionColors[itemIndex] ?? 0xe76f51, 1);
      icon.fillRoundedRect(-24, -32, 48, 64, 8);
      icon.fillStyle(0x8d99ae, 1);
      icon.fillRect(-14, -44, 28, 12);
      icon.lineStyle(4, 0x264653, 1);
      icon.strokeRoundedRect(-24, -32, 48, 64, 8);
      icon.strokeRect(-14, -44, 28, 12);
      return icon;
    }

    const bladeColors = [0xd9e2ec, 0xa8dadc, 0xf4d35e, 0xffadad, 0xcdb4db];
    icon.fillStyle(bladeColors[itemIndex] ?? 0xd9e2ec, 1);
    icon.fillTriangle(-9, -32, 9, -32, 0, 20);
    icon.fillStyle(0x8d5524, 1);
    icon.fillRect(-5, 18, 10, 24);
    icon.fillStyle(0xe9c46a, 1);
    icon.fillRect(-20, 12, 40, 7);
    return icon;
  }

  private drawCombatants(): void {
    this.clearCombatants();
    if (this.enemyAlive) {
      const variant = ENEMY_VARIANTS[this.enemyVariantIndex];
      this.addEnemyDecoration(this.add.ellipse(640, 495, 205, 28, 0x264653, 0.35)).setDepth(1);
      if (variant.shape === 'slime') {
        this.drawSlimeEnemy(variant);
      } else if (variant.shape === 'golem') {
        this.drawGolemEnemy(variant);
      } else {
        this.drawGoblinEnemy(variant);
      }
      const displayName = this.isEndgameBoss()
        ? `★ 深淵の主・${variant.name} ★`
        : this.endgameMode ? `深淵 第${this.endgameWave}戦・${variant.name}` : this.isRareEnemy ? `★ 金色${variant.name} ★` : variant.name;
      const enemyName = this.addText(640, 520, displayName, 26, this.isRareEnemy ? '#f4d35e' : '#ffffff').setOrigin(0.5);
      enemyName.setStroke('#264653', 4);
      this.addCombatObject(enemyName);
    } else {
      const respawnText = this.addText(640, 400, '敵は再出現待ち', 24, '#ffffff').setOrigin(0.5);
      respawnText.setStroke('#264653', 4);
      this.addCombatObject(respawnText);
    }
  }

  private drawSlimeEnemy(variant: (typeof ENEMY_VARIANTS)[number]): void {
    const bodyColor = this.isRareEnemy ? 0xf4d35e : variant.bodyColor;
    const accentColor = this.isRareEnemy ? 0xffd166 : variant.headColor;
    if (variant.name === 'コウモリ') {
      const wings = this.addEnemyDecoration(this.add.graphics());
      wings.setPosition(640, 390);
      wings.fillStyle(variant.bodyColor, 1);
      wings.fillTriangle(-48, -20, -138, -92, -112, 54);
      wings.fillTriangle(48, -20, 138, -92, 112, 54);
      wings.lineStyle(5, 0x302943, 1);
      wings.lineBetween(-48, -20, -112, 54);
      wings.lineBetween(-48, -20, -138, -92);
      wings.lineBetween(48, -20, 112, 54);
      wings.lineBetween(48, -20, 138, -92);
      wings.setDepth(2);
    }

    const body = this.addEnemyVisual(this.add.ellipse(640, 390, 220, 190, bodyColor));
    body.setStrokeStyle(8, 0x264653, 0.85);
    body.setDepth(3);
    this.addEnemyDecoration(this.add.ellipse(600, 345, 64, 30, 0xffffff, 0.32)).setDepth(4);
    this.addEnemyDecoration(this.add.ellipse(610, 373, 28, 34, 0xf8f9fa)).setDepth(5);
    this.addEnemyDecoration(this.add.ellipse(670, 373, 28, 34, 0xf8f9fa)).setDepth(5);
    this.addEnemyDecoration(this.add.circle(615, 376, 7, 0x212529)).setDepth(6);
    this.addEnemyDecoration(this.add.circle(675, 376, 7, 0x212529)).setDepth(6);

    const face = this.addEnemyDecoration(this.add.graphics());
    face.setPosition(640, 390);
    face.lineStyle(5, 0x264653, 1);
    face.beginPath();
    face.arc(0, 12, 20, 0.2, Math.PI - 0.2);
    face.strokePath();
    face.setDepth(6);

    if (variant.name === 'マタンゴ') {
      const cap = this.addEnemyDecoration(this.add.ellipse(640, 326, 168, 76, accentColor));
      cap.setStrokeStyle(7, 0x59334d, 1);
      cap.setDepth(7);
      for (const [x, y] of [[590, 320], [640, 305], [690, 320], [640, 337]]) {
        this.addEnemyDecoration(this.add.circle(x, y, 8, 0xffe7ef)).setDepth(8);
      }
    }
  }

  private drawGolemEnemy(variant: (typeof ENEMY_VARIANTS)[number]): void {
    const bodyColor = this.isRareEnemy ? 0xf4d35e : variant.bodyColor;
    const accentColor = this.isRareEnemy ? 0xffd166 : variant.headColor;
    if (variant.name === 'ワイバーン' || variant.name === '古代竜') {
      const wings = this.addEnemyDecoration(this.add.graphics());
      wings.setPosition(640, 380);
      wings.fillStyle(variant.name === '古代竜' ? 0x765126 : 0x245740, 1);
      wings.fillTriangle(-55, -12, -185, -128, -135, 70);
      wings.fillTriangle(55, -12, 185, -128, 135, 70);
      wings.lineStyle(8, 0x264653, 1);
      wings.lineBetween(-55, -12, -185, -128);
      wings.lineBetween(-55, -12, -135, 70);
      wings.lineBetween(55, -12, 185, -128);
      wings.lineBetween(55, -12, 135, 70);
      wings.setDepth(1);
    }

    const leftArm = this.addEnemyDecoration(this.add.rectangle(520, 390, 66, 150, bodyColor));
    leftArm.setAngle(-14);
    leftArm.setStrokeStyle(7, 0x264653, 1);
    leftArm.setDepth(2);
    const rightArm = this.addEnemyDecoration(this.add.rectangle(760, 390, 66, 150, bodyColor));
    rightArm.setAngle(14);
    rightArm.setStrokeStyle(7, 0x264653, 1);
    rightArm.setDepth(2);
    const torso = this.addEnemyVisual(this.add.rectangle(640, 410, 190, 190, bodyColor));
    torso.setStrokeStyle(9, 0x264653, 1);
    torso.setDepth(3);
    const head = this.addEnemyVisual(this.add.rectangle(640, 275, 166, 112, accentColor));
    head.setStrokeStyle(8, 0x264653, 1);
    head.setDepth(4);
    this.addEnemyDecoration(this.add.rectangle(640, 365, 102, 24, 0x495057)).setDepth(5);
    this.addEnemyDecoration(this.add.circle(606, 275, 13, this.isRareEnemy ? 0x7a3100 : 0xff5448)).setDepth(6);
    this.addEnemyDecoration(this.add.circle(674, 275, 13, this.isRareEnemy ? 0x7a3100 : 0xff5448)).setDepth(6);

    const cracks = this.addEnemyDecoration(this.add.graphics());
    cracks.setPosition(640, 410);
    cracks.lineStyle(5, 0x26323c, 0.85);
    cracks.lineBetween(-64, -62, -42, -31);
    cracks.lineBetween(-42, -31, -58, -2);
    cracks.lineBetween(58, -54, 36, -24);
    cracks.lineBetween(36, -24, 56, 4);
    cracks.lineBetween(-10, 30, 8, 58);
    cracks.setDepth(6);

    if (variant.name === 'アイスゴーレム') {
      const crystals = this.addEnemyDecoration(this.add.graphics());
      crystals.setPosition(640, 270);
      crystals.fillStyle(0xd7f7ff, 1);
      crystals.fillTriangle(-52, -45, -33, -104, -15, -45);
      crystals.fillTriangle(-12, -48, 8, -120, 28, -48);
      crystals.fillTriangle(29, -45, 51, -96, 68, -45);
      crystals.lineStyle(4, 0x438da8, 1);
      crystals.strokeTriangle(-52, -45, -33, -104, -15, -45);
      crystals.strokeTriangle(-12, -48, 8, -120, 28, -48);
      crystals.strokeTriangle(29, -45, 51, -96, 68, -45);
      crystals.setDepth(5);
    } else if (variant.name === '古代竜') {
      const horns = this.addEnemyDecoration(this.add.graphics());
      horns.setPosition(640, 275);
      horns.fillStyle(0xf0d59b, 1);
      horns.fillTriangle(-55, -38, -78, -92, -25, -48);
      horns.fillTriangle(55, -38, 78, -92, 25, -48);
      horns.setDepth(5);
    }
  }

  private drawGoblinEnemy(variant: (typeof ENEMY_VARIANTS)[number]): void {
    const bodyColor = this.isRareEnemy ? 0xf4d35e : variant.bodyColor;
    const headColor = this.isRareEnemy ? 0xffd166 : variant.headColor;
    if (variant.name === 'ヴァンパイア') {
      const cape = this.addEnemyDecoration(this.add.graphics());
      cape.setPosition(640, 390);
      cape.fillStyle(0x561d33, 1);
      cape.fillTriangle(-62, -25, -150, 128, 0, 88);
      cape.fillTriangle(62, -25, 150, 128, 0, 88);
      cape.lineStyle(5, 0x291522, 1);
      cape.lineBetween(-62, -25, -150, 128);
      cape.lineBetween(62, -25, 150, 128);
      cape.setDepth(1);
    }

    const body = this.addEnemyVisual(this.add.ellipse(640, 405, 170, 205, bodyColor));
    body.setStrokeStyle(8, 0x264653, 1);
    body.setDepth(2);
    const leftEar = this.addEnemyVisual(this.add.triangle(565, 285, -34, -60, 0, -24, 28, -58, bodyColor));
    leftEar.setStrokeStyle(5, 0x264653, 1);
    leftEar.setDepth(3);
    const rightEar = this.addEnemyVisual(this.add.triangle(715, 285, -28, -58, 0, -24, 34, -60, bodyColor));
    rightEar.setStrokeStyle(5, 0x264653, 1);
    rightEar.setDepth(3);
    const head = this.addEnemyVisual(this.add.ellipse(640, 295, 170, 145, headColor));
    head.setStrokeStyle(8, 0x264653, 1);
    head.setDepth(4);
    this.addEnemyDecoration(this.add.ellipse(610, 267, 44, 9, 0xffffff, 0.25)).setDepth(5);

    const eyes = this.addEnemyDecoration(this.add.graphics());
    eyes.setPosition(640, 295);
    eyes.fillStyle(0xf8f9fa, 1);
    eyes.fillEllipse(-30, -3, 38, 28);
    eyes.fillEllipse(30, -3, 38, 28);
    eyes.fillStyle(this.isRareEnemy ? 0x7a3100 : 0x212529, 1);
    eyes.fillCircle(-25, -2, 8);
    eyes.fillCircle(25, -2, 8);
    eyes.setDepth(6);
    this.addEnemyDecoration(this.add.ellipse(640, 356, 70, 24, 0x212529)).setDepth(6);

    const details = this.addEnemyDecoration(this.add.graphics());
    details.setPosition(640, 390);
    details.fillStyle(0x495057, 1);
    details.fillRoundedRect(-66, -5, 132, 38, 8);
    details.lineStyle(4, 0x26323c, 1);
    details.lineBetween(-75, -13, -48, -25);
    details.lineBetween(-45, -25, -18, -13);
    details.lineBetween(-15, -13, 12, -25);
    details.lineBetween(15, -25, 42, -13);
    details.lineBetween(45, -13, 72, -25);
    details.fillStyle(0xf4d35e, 1);
    details.fillRect(-10, 2, 20, 22);
    details.setDepth(7);

    if (variant.name === '魔女') {
      const hat = this.addEnemyDecoration(this.add.graphics());
      hat.setPosition(640, 246);
      hat.fillStyle(0x33233f, 1);
      hat.fillTriangle(-84, -7, 0, -113, 84, -7);
      hat.fillStyle(0xf4d35e, 1);
      hat.fillRoundedRect(-92, -12, 184, 18, 8);
      hat.fillCircle(0, -28, 12);
      hat.setDepth(8);
    } else if (variant.name === 'デーモン') {
      const horns = this.addEnemyDecoration(this.add.graphics());
      horns.setPosition(640, 258);
      horns.fillStyle(0xe8d6ba, 1);
      horns.fillTriangle(-48, -24, -80, -94, -16, -38);
      horns.fillTriangle(48, -24, 80, -94, 16, -38);
      horns.setDepth(8);
    } else if (variant.name === 'スケルトン') {
      const ribs = this.addEnemyDecoration(this.add.graphics());
      ribs.setPosition(640, 390);
      ribs.lineStyle(6, 0xf0e8d5, 1);
      for (let y = 5; y <= 53; y += 16) {
        ribs.beginPath();
        ribs.arc(0, y, 48, Math.PI, Math.PI * 2);
        ribs.strokePath();
      }
      ribs.lineBetween(0, -5, 0, 67);
      ribs.setDepth(8);
    } else if (variant.name === 'ウェアウルフ') {
      const muzzle = this.addEnemyDecoration(this.add.ellipse(640, 324, 82, 42, 0x3f3029));
      muzzle.setStrokeStyle(4, 0x264653, 1);
      muzzle.setDepth(7);
    } else if (variant.name === 'ヴァンパイア') {
      const fangs = this.addEnemyDecoration(this.add.graphics());
      fangs.setPosition(640, 350);
      fangs.fillStyle(0xf8f9fa, 1);
      fangs.fillTriangle(-25, -2, -14, 25, -4, -2);
      fangs.fillTriangle(25, -2, 14, 25, 4, -2);
      fangs.setDepth(8);
    }
  }

  private addEnemyDecoration<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.enemyVisuals.push(object);
    return this.addCombatObject(object);
  }

  private chooseNextEnemyVariant(): void {
    const unlockedVariantCount = Math.min(
      ENEMY_VARIANTS.length,
      Math.floor(this.defeatedCount / KILLS_PER_LEVEL) + 1,
    );
    if (unlockedVariantCount === 1) {
      this.enemyVariantIndex = 0;
      return;
    }

    const offset = Phaser.Math.Between(1, unlockedVariantCount - 1);
    this.enemyVariantIndex = (this.enemyVariantIndex + offset) % unlockedVariantCount;
  }

  private addEnemyVisual<T extends Phaser.GameObjects.Shape>(object: T): T {
    object.setInteractive({ useHandCursor: true });
    object.on('pointerdown', () => this.attack(0));
    this.enemyVisuals.push(object);
    return this.addCombatObject(object);
  }

  private clearCombatants(): void {
    for (const object of this.combatObjects) {
      object.destroy();
      const index = this.screenObjects.indexOf(object);
      if (index >= 0) {
        this.screenObjects.splice(index, 1);
      }
    }
    this.combatObjects = [];
    this.enemyVisuals = [];
  }

  private addCombatObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.combatObjects.push(object);
    return this.addScreenObject(object);
  }

  private resumeTimers(): void {
    this.tweens.resumeAll();
    if (this.enemyAttackTimer) {
      this.enemyAttackTimer.paused = false;
    }
    if (this.respawnTimer) {
      this.respawnTimer.paused = false;
    }
    if (this.healthPotionTimer) {
      this.healthPotionTimer.paused = false;
    }
    if (this.damageOverTimeTimer) {
      this.damageOverTimeTimer.paused = false;
    }
    if (this.moneyPunchTimer) {
      this.moneyPunchTimer.paused = false;
    }
  }

  private pauseTimers(): void {
    this.tweens.pauseAll();
    if (this.enemyAttackTimer) {
      this.enemyAttackTimer.paused = true;
    }
    if (this.respawnTimer) {
      this.respawnTimer.paused = true;
    }
    if (this.healthPotionTimer) {
      this.healthPotionTimer.paused = true;
    }
    if (this.damageOverTimeTimer) {
      this.damageOverTimeTimer.paused = true;
    }
    if (this.moneyPunchTimer) {
      this.moneyPunchTimer.paused = true;
    }
  }

  private stopEnemyAttackTimer(): void {
    this.enemyAttackTimer?.remove();
    this.enemyAttackTimer = undefined;
  }

  private stopTimers(): void {
    this.stopEnemyAttackTimer();
    this.respawnTimer?.remove();
    this.respawnTimer = undefined;
    this.healthPotionTimer?.remove();
    this.healthPotionTimer = undefined;
    this.moneyPunchTimer?.remove();
    this.moneyPunchTimer = undefined;
    this.stopDamageOverTime();
  }

  private stopDamageOverTime(): void {
    this.damageOverTimeTimer?.remove();
    this.damageOverTimeTimer = undefined;
    this.damageOverTimeTicksRemaining = 0;
  }

  private clearScreen(): void {
    this.tweens.killAll();
    this.weaponBreakDialogTimer?.remove();
    this.weaponBreakDialogTimer = undefined;
    this.weaponBreakDialogObjects = [];
    for (const object of this.screenObjects) {
      object.destroy();
    }
    this.screenObjects = [];
    this.combatObjects = [];
    this.enemyVisuals = [];
    this.shopButtons = [];
    this.shopCardObjects = [];
    this.hudText = undefined;
    this.skillButtons = [];
    this.skillButtonIcons = [];
    this.skillCooldownRings = [];
    this.pauseOverlayObjects = [];
    this.skillTreeObjects = [];
    this.confirmationObjects = [];
    this.pendingPurchase = undefined;
    this.playerHpBar = undefined;
    this.enemyHpBar = undefined;
    this.enemyRewardText = undefined;
    this.progressText = undefined;
    this.clearProgressBar = undefined;
    this.enemyAttackText = undefined;
    this.potionCountText = undefined;
    this.strengthPotionCountText = undefined;
    this.weaknessPotionCountText = undefined;
    this.healthPotionCountText = undefined;
    this.defensePotionCountText = undefined;
    this.confusionPotionCountText = undefined;
    this.starElixirCountText = undefined;
    this.phoenixElixirCountText = undefined;
    this.potionSlotPanels = [];
    this.skillTreeObjects = [];
    this.debugPanel = undefined;
    this.debugText = undefined;
  }

  private updateDebugOverlay(): void {
    if (!this.debugMode) {
      if (this.debugPanel) this.removeScreenObject(this.debugPanel);
      if (this.debugText) this.removeScreenObject(this.debugText);
      this.debugPanel = undefined;
      this.debugText = undefined;
      return;
    }

    if (!this.debugPanel || !this.debugText) {
      this.debugPanel = this.addScreenObject(this.add.rectangle(880, 205, 390, 220, 0x0b1118, 0.94));
      this.debugPanel.setOrigin(0, 0);
      this.debugPanel.setDepth(2000);
      this.debugText = this.addScreenObject(this.add.text(895, 220, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#d9e2ec',
      }));
      this.debugText.setDepth(2001);
    }

    const enemy = ENEMY_VARIANTS[this.enemyVariantIndex];
    this.debugText.setText([
      `DEBUG  ${this.mode}`,
      `Player HP: ${this.playerHp} / ${this.playerMaxHp}`,
      `Enemy: ${this.isRareEnemy ? 'Rare ' : ''}${enemy.name}`,
      `Enemy HP: ${this.enemyHp} / ${this.enemyMaxHp}  alive=${this.enemyAlive}`,
      `Enemy attack/reward: ${this.getEnemyAttackPower()} / ${this.getEnemyReward()}`,
      `Defeated: ${this.defeatedCount}  Money: ${this.money}`,
      `Weapon: ${WEAPONS[this.weaponIndex].name}`,
      `Skills: ${this.getSelectedSkillNames()}`,
    ]);
  }

  private addText(x: number, y: number, text: string, fontSize: number, color: string): Phaser.GameObjects.Text {
    return this.addScreenObject(this.add.text(x, y, text, {
      fontFamily: 'sans-serif',
      fontSize: `${fontSize}px`,
      color,
    }));
  }

  private addScreenObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.screenObjects.push(object);
    return object;
  }

  private registerShopObject(object: Phaser.GameObjects.GameObject & { x: number }, baseX: number): void {
    this.shopCardObjects.push({ object, baseX });
  }

  private removeScreenObject(object: Phaser.GameObjects.GameObject): void {
    const index = this.screenObjects.indexOf(object);
    if (index >= 0) {
      this.screenObjects.splice(index, 1);
    }
    object.destroy();
  }
}