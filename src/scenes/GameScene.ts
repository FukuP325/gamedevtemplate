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
  ENEMY_VARIANTS,
  EQUIPMENTS,
  HEAL_SKILL_COOLDOWN,
  GAME_WIDTH,
  KILLS_PER_LEVEL,
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

type GameMode = 'title' | 'playing' | 'paused' | 'shop' | 'gameOver' | 'clear';
type ShopCategory = 'weapon' | 'equipment' | 'potion';

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'title';
  private playerHp = PLAYER_MAX_HP;
  private playerMaxHp = PLAYER_MAX_HP;
  private level = 1;
  private defeatedCount = 0;
  private enemyMaxHp = ENEMY_MAX_HP;
  private enemyHp = ENEMY_MAX_HP;
  private enemyVariantIndex = 0;
  private money = 0;
  private moneyPunchTimer?: Phaser.Time.TimerEvent;
  private potionCount = 1;
  private strengthPotionCount = 1;
  private weaknessPotionCount = 1;
  private healthPotionCount = 1;
  private defensePotionCount = 1;
  private defensePotionActive = false;
  private confusionPotionCount = 1;
  private enemyConfused = false;
  private strengthPotionAttacksRemaining = 0;
  private healthPotionBaseMaxHp?: number;
  private healthPotionTimer?: Phaser.Time.TimerEvent;
  private damageOverTimeTimer?: Phaser.Time.TimerEvent;
  private damageOverTimeTicksRemaining = 0;
  private weaponIndex = 0;
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
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
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
  private pausedAt?: number;
  private pendingPurchase?: { itemIndex: number; itemKind: 'weapon' | 'equipment' | 'potion' | 'ticket' };
  private playerHpBar?: Phaser.GameObjects.Rectangle;
  private enemyHpBar?: Phaser.GameObjects.Rectangle;
  private readonly escapeListener = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    if (this.mode === 'playing') {
      this.showPause();
    } else if (this.mode === 'paused') {
      this.hidePause();
    } else if (this.mode === 'shop') {
      this.returnFromShop();
    } else if (this.mode === 'gameOver' || this.mode === 'clear') {
      this.resetGame();
      this.showTitle();
    }
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
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.eKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    keyboard.addCapture(['SPACE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'E', 'ESC', 'LEFT', 'RIGHT']);
    window.addEventListener('keydown', this.escapeListener);
    this.events.once('shutdown', () => window.removeEventListener('keydown', this.escapeListener));
    this.showTitle();
  }

  update(): void {
    if (this.mode === 'title' && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.resetGame();
      this.showPlaying();
      return;
    }

    if (this.mode === 'gameOver' || this.mode === 'clear') {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.resetGame();
        this.showPlaying();
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
      this.updateSkillHud();
    } else if (this.mode === 'shop') {
      if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
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
    this.level = 1;
    this.defeatedCount = 0;
    this.enemyMaxHp = ENEMY_MAX_HP;
    this.enemyHp = this.enemyMaxHp;
    this.enemyVariantIndex = 0;
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
    this.enemyConfused = false;
    this.strengthPotionAttacksRemaining = 0;
    this.healthPotionBaseMaxHp = undefined;
    this.healthPotionTimer?.remove();
    this.healthPotionTimer = undefined;
    this.weaponIndex = 1;
    this.purchasedWeapons.clear();
    this.purchasedWeapons.add(1);
    this.weaponDurability.clear();
    this.weaponDurability.set(1, WEAPONS[1].durability);
    this.purchasedWeapons.add(1);
    this.purchasedEquipments.clear();
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
    this.addText(GAME_WIDTH / 2, 300, '目標：10,000円のクリアチケットを購入する', 22, '#457b9d').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 360, 'SPACEキーを1秒長押し：自動モード', 22, '#264653').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 405, '1 / 2 / 3：スキル　　E：ショップ', 22, '#264653').setOrigin(0.5);
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
    const controlsText = this.addText(GAME_WIDTH / 2, 650, 'E: ショップ    5: ポーション', 24, '#ffffff').setOrigin(0.5);
    controlsText.setStroke('#264653', 4);
    this.startEnemyAttackTimer();
  }

  private showPause(): void {
    if (this.mode === 'playing') {
      this.pausedAt = this.time.now;
    }
    this.mode = 'paused';
    this.pauseTimers();
    const overlay = this.addScreenObject(this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55));
    overlay.setInteractive();
    this.pauseOverlayObjects.push(overlay);
    const pauseText = this.addScreenObject(this.add.text(640, 180, 'pause', {
      fontFamily: 'sans-serif',
      fontSize: '64px',
      color: '#ffffff',
    }).setOrigin(0.5));
    this.pauseOverlayObjects.push(pauseText);
    const shopButton = this.addScreenObject(this.add.rectangle(640, 360, 320, 72, 0x2a9d8f));
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
    }).setOrigin(0.5));
    this.pauseOverlayObjects.push(shopButtonText);
  }

  private hidePause(): void {
    this.applyPausedDuration();
    for (const object of this.pauseOverlayObjects) {
      const index = this.screenObjects.indexOf(object);
      if (index >= 0) {
        this.screenObjects.splice(index, 1);
      }
      object.destroy();
    }
    this.pauseOverlayObjects = [];
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

    const items = category === 'weapon'
      ? [
        ...WEAPONS.slice(1).map((item) => ({ ...item, kind: 'weapon' as const })),
        { name: '脱出チケット', attackPower: 0, price: CLEAR_TICKET_PRICE, kind: 'ticket' as const },
      ]
      : category === 'equipment'
        ? EQUIPMENTS.map((item) => ({ ...item, kind: 'equipment' as const, attackPower: 0 }))
        : [
          { name: '回復ポーション', effect: 'HPを全回復', attackPower: 0, price: POTION_PRICE, kind: 'potion' as const },
          { name: '力のポーション', effect: '攻撃力をだんだん上げる', attackPower: 0, price: STRENGTH_POTION_PRICE, kind: 'potion' as const },
          { name: '弱体化ポーション', effect: '敵のHPを下げる', attackPower: 0, price: WEAKNESS_POTION_PRICE, kind: 'potion' as const },
          { name: '体力のポーション', effect: 'HPを1.5倍にする（5分）', attackPower: 0, price: HEALTH_POTION_PRICE, kind: 'potion' as const },
          { name: '守りのポーション', effect: '防御力を上げる', attackPower: 0, price: DEFENSE_POTION_PRICE, kind: 'potion' as const },
          { name: '混乱のポーション', effect: '敵を混乱させる', attackPower: 0, price: CONFUSION_POTION_PRICE, kind: 'potion' as const },
        ];
    this.shopItemCount = items.length;
    items.forEach((item, index) => {
      const x = 180 + index * 290;
      const card = this.addScreenObject(this.add.rectangle(x, 360, 250, 330, 0xf8f9fa));
      card.setStrokeStyle(3, 0xd9e2ec, 1);
      this.registerShopObject(card, x);
      const icon = this.drawShopIcon(x, 270, index, item.kind);
      this.registerShopObject(icon, x);
      const name = this.addText(x, 390, item.name, 28, '#264653').setOrigin(0.5);
      this.registerShopObject(name, x);
      if (item.kind === 'weapon') {
        const attackDetails = this.addText(x, 427, `攻撃力: ${item.attackPower}`, 20, '#457b9d').setOrigin(0.5);
        const durabilityLabel = item.durability === null
          ? item.name === '邪剣アビス' || item.name === '聖剣エターナル' ? '無限' : 'なし'
          : `${item.durability}回`;
        const durabilityDetails = this.addText(x, 448, `耐久力: ${durabilityLabel}`, 20, '#457b9d').setOrigin(0.5);
        const priceDetails = this.addText(x, 468, `${item.price}円`, 20, '#457b9d').setOrigin(0.5);
        this.registerShopObject(attackDetails, x);
        this.registerShopObject(durabilityDetails, x);
        this.registerShopObject(priceDetails, x);
      } else {
        const detailText = item.kind === 'equipment'
          ? `最大HP +${item.hpBonus}\n${item.price}円`
          : item.kind === 'potion'
            ? `${item.effect}\n${item.price}円`
            : `${item.price}円でゲームクリア`;
        const details = this.addText(x, 430, detailText, 20, '#457b9d').setOrigin(0.5);
        details.setAlign('center');
        this.registerShopObject(details, x);
      }
      const button = this.addScreenObject(this.add.rectangle(x, 510, 190, 52, 0x2a9d8f));
      this.registerShopObject(button, x);
      button.setInteractive({ useHandCursor: true });
      const label = this.addText(x, 510, '', 23, '#ffffff').setOrigin(0.5);
      this.registerShopObject(label, x);
      const weaponIndex = item.kind === 'weapon' ? index + 1 : -1;
      const equipmentIndex = item.kind === 'equipment' ? index : -1;
      const purchased = item.kind === 'weapon'
        ? this.purchasedWeapons.has(weaponIndex)
        : item.kind === 'equipment' && this.purchasedEquipments.has(equipmentIndex);
      const requiredWeaponIndex = item.kind === 'weapon' ? this.getRequiredWeaponIndex(weaponIndex) : undefined;
      const canBuy = this.money >= item.price && (requiredWeaponIndex === undefined || this.purchasedWeapons.has(requiredWeaponIndex));
      const isEquipped = item.kind === 'weapon' && purchased && weaponIndex === this.weaponIndex;
      label.setText(purchased ? (isEquipped ? '装備中' : item.kind === 'weapon' ? '装備済み' : '購入済み') : canBuy ? '購入' : '購入不可');
      if (purchased) {
        button.setFillStyle(isEquipped ? 0x53616f : 0x457b9d);
        if (item.kind === 'weapon' && !isEquipped) {
          button.on('pointerdown', () => this.equipWeapon(weaponIndex));
        }
      } else if (!canBuy) {
        button.setFillStyle(0x53616f);
      } else {
        button.on('pointerdown', () => this.requestPurchase(index, item.kind));
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

    this.addText(GAME_WIDTH / 2, 585, '左右キーまたは矢印ボタンで商品をスクロール', 20, '#457b9d').setOrigin(0.5);
    const backButton = this.addScreenObject(this.add.rectangle(640, 660, 240, 50, 0x457b9d));
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.returnFromShop());
    this.addText(640, 660, '戻る (ESC)', 22, '#ffffff').setOrigin(0.5);
  }

  private scrollShop(direction: number): void {
    const maxOffset = -Math.max(0, this.shopItemCount - 4) * 290;
    this.shopScrollOffset = Phaser.Math.Clamp(this.shopScrollOffset + direction * 290, maxOffset, 0);
    for (const cardObject of this.shopCardObjects) {
      cardObject.object.x = cardObject.baseX + this.shopScrollOffset;
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

    if (this.money >= CLEAR_TICKET_PRICE) {
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
    if (!this.enemyAlive || this.time.now - this.lastAttackAt < interval) {
      return;
    }
    this.lastAttackAt = this.time.now;
    this.playAttackEffect();
    const attackDamage = this.getAttackDamage(this.getPlayerAttackPower());
    this.applyDamage(attackDamage, '#f4d35e');
    this.applyWeaponEffects(true, attackDamage);
    this.consumeWeaponDurability();
  }

  private useSkill(): void {
    if (!this.enemyAlive || this.level < 2 || this.time.now - this.lastSkillAt < SKILL_COOLDOWN) {
      return;
    }
    this.lastSkillAt = this.time.now;
    this.playGoldStrikeEffect();
    const attackDamage = this.getAttackDamage(this.getPlayerAttackPower() * SKILL_DAMAGE_MULTIPLIER);
    this.applyDamage(attackDamage, '#f4d35e');
    this.applyWeaponEffects(false, attackDamage);
    this.consumeWeaponDurability();
  }

  private useMoneyPunchSkill(): void {
    if (!this.enemyAlive || this.level < 3 || this.time.now - this.lastMoneyPunchAt < MONEY_PUNCH_COOLDOWN) {
      return;
    }
    this.lastMoneyPunchAt = this.time.now;
    this.playMoneyPunchEffect();
    this.moneyPunchTimer = this.time.delayedCall(350, () => {
      this.moneyPunchTimer = undefined;
      if (this.mode === 'playing' && this.enemyAlive) {
        const attackDamage = this.getAttackDamage(this.getPlayerAttackPower() * 7);
        this.applyDamage(attackDamage, '#57cc99');
        this.applyWeaponEffects(false, attackDamage);
        this.consumeWeaponDurability();
      }
    });
  }

  private useHealSkill(): void {
    if (this.level < 2 || this.time.now - this.lastHealSkillAt < HEAL_SKILL_COOLDOWN) {
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
    this.showFloatingText('5回攻撃力アップ', '#f4d35e', 1175);
    this.updateHud();
  }

  private useWeaknessPotion(): void {
    if (this.weaknessPotionCount <= 0 || !this.enemyAlive) {
      return;
    }
    const damage = Math.max(1, Math.floor(this.enemyHp * 0.25));
    this.weaknessPotionCount -= 1;
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
    this.showFloatingText('最大HP 1.5倍（5分）', '#57cc99', 1215);
    this.updateHud();
  }

  private useDefensePotion(): void {
    if (this.defensePotionCount <= 0 || this.defensePotionActive) {
      return;
    }
    this.defensePotionCount -= 1;
    this.defensePotionActive = true;
    this.showFloatingText('敵の攻撃力 1/2', '#457b9d', 1230);
    this.updateHud();
  }

  private useConfusionPotion(): void {
    if (this.confusionPotionCount <= 0 || this.enemyConfused) {
      return;
    }
    this.confusionPotionCount -= 1;
    this.enemyConfused = true;
    this.showFloatingText('敵が混乱した', '#cdb4db', 640);
    this.updateHud();
  }

  private getPlayerAttackPower(): number {
    const baseAttackPower = WEAPONS[this.weaponIndex].attackPower;
    return WEAPONS[this.weaponIndex].name === '破砕の剣' ? baseAttackPower * 1.25 : baseAttackPower;
  }

  private getAttackDamage(baseDamage: number): number {
    const damage = baseDamage * this.getStrengthPotionMultiplier();
    if (this.strengthPotionAttacksRemaining > 0) {
      this.strengthPotionAttacksRemaining -= 1;
    }
    return damage;
  }

  private applyWeaponEffects(isNormalAttack: boolean, attackDamage: number): void {
    const weaponName = WEAPONS[this.weaponIndex].name;
    if (weaponName === '邪剣アビス') {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 5);
      this.showFloatingText('HP +5', '#57cc99', 400);
    }
    if (!isNormalAttack || !this.enemyAlive) {
      return;
    }
    if (weaponName === '神速の剣' && Math.random() < 1 / 3) {
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
    this.damageOverTimeTicksRemaining = 10;
    this.damageOverTimeTimer = this.time.addEvent({
      delay: 1000,
      repeat: 9,
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
    this.consumeWeaponDurability();
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
    }).setOrigin(0.5));
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
    this.stopDamageOverTime();
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + ENEMY_DEFEAT_HEAL);
    const reward = this.getEnemyReward();
    this.money += reward;
    this.showFloatingText(`+${reward}円`, '#f4d35e', 640);
    this.defeatedCount += 1;
    if (this.defeatedCount % KILLS_PER_LEVEL === 0 && this.level < 3) {
      this.level += 1;
      this.showLevelUpEffect();
    }
    this.enemyMaxHp += ENEMY_HP_INCREASE;
    this.updateHud();
    this.playDefeatEffect();
    this.respawnTimer = this.time.delayedCall(
      Phaser.Math.Between(ENEMY_RESPAWN_MIN, ENEMY_RESPAWN_MAX),
      () => {
        if (this.mode !== 'playing') {
          return;
        }
        this.enemyHp = this.enemyMaxHp;
        this.enemyAlive = true;
        this.chooseNextEnemyVariant();
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
    if (this.enemyConfused && Math.random() < 0.5) {
      this.showFloatingText('攻撃 miss', '#cdb4db', 640);
      return;
    }
    this.playerHp = Math.max(0, this.playerHp - this.getEnemyAttackPower());
    this.cameras.main.flash(120, 230, 80, 80);
    this.tweens.add({
      targets: this.enemyVisuals,
      x: '+=14',
      duration: 70,
      yoyo: true,
      repeat: 2,
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
    const title = this.addText(GAME_WIDTH / 2, 240, 'ゲームオーバー', 60, '#e63946').setOrigin(0.5);
    title.setAlpha(0);
    const restartText = this.addText(GAME_WIDTH / 2, 390, 'スペースキーでリスタート', 28, '#ffffff').setOrigin(0.5);
    restartText.setAlpha(0);
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
    this.mode = 'clear';
    this.stopTimers();
    this.clearScreen();
    this.addText(GAME_WIDTH / 2, 280, 'ゲームクリア', 60, '#f4d35e').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 390, 'スペースキーでリスタート', 28, '#264653').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 440, 'Escキーで終了', 24, '#264653').setOrigin(0.5);
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
      this.progressText = this.addText(36, 195, '', 18, '#ffffff');
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
      `レベル: ${this.level}  撃破数: ${this.defeatedCount}`,
      `所持金: ${this.money}円`,
      `装備中: ${WEAPONS[this.weaponIndex].name} (攻撃力 ${this.getPlayerAttackPower()})`,
    ]);
    this.progressText?.setText(`次のレベルまで: ${KILLS_PER_LEVEL - (this.defeatedCount % KILLS_PER_LEVEL)}体`);
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
    this.clearProgressBar?.setSize(300 * Math.min(1, this.money / CLEAR_TICKET_PRICE), 12);
    this.potionSlotPanels[0]?.setFillStyle(this.potionCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[1]?.setFillStyle(this.strengthPotionCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[2]?.setFillStyle(this.weaknessPotionCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[3]?.setFillStyle(this.healthPotionCount > 0 ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[4]?.setFillStyle(this.defensePotionCount > 0 && !this.defensePotionActive ? 0xf8f9fa : 0xadb5bd);
    this.potionSlotPanels[5]?.setFillStyle(this.confusionPotionCount > 0 && !this.enemyConfused ? 0xf8f9fa : 0xadb5bd);
    this.updateSkillHud();
  }

  private getEnemyAttackPower(): number {
    const variant = ENEMY_VARIANTS[this.enemyVariantIndex];
    const attackPower = variant.attackPower + this.defeatedCount * ENEMY_ATTACK_INCREASE;
    return this.defensePotionActive ? Math.max(1, Math.floor(attackPower / 2)) : attackPower;
  }

  private getEnemyReward(): number {
    const variant = ENEMY_VARIANTS[this.enemyVariantIndex];
    return variant.reward;
  }

  private updateSkillHud(): void {
    this.updateSkillButtons();
  }

  private addSkillButtons(): void {
    const skills = [
      { x: 150, y: 270, action: () => this.useRapidSkill() },
      { x: 150, y: 400, action: () => this.useSkill() },
      { x: 150, y: 530, action: () => this.useMoneyPunchSkill() },
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
      { x: 930, name: '回復', count: this.potionCount, color: 0xe76f51, action: () => this.usePotion() },
      { x: 990, name: '力', count: this.strengthPotionCount, color: 0xf4d35e, action: () => this.useStrengthPotion() },
      { x: 1050, name: '弱体', count: this.weaknessPotionCount, color: 0xcdb4db, action: () => this.useWeaknessPotion() },
      { x: 1110, name: '体力', count: this.healthPotionCount, color: 0x57cc99, action: () => this.useHealthPotion() },
      { x: 1170, name: '守り', count: this.defensePotionCount, color: 0x457b9d, action: () => this.useDefensePotion() },
      { x: 1230, name: '混乱', count: this.confusionPotionCount, color: 0x6d597a, action: () => this.useConfusionPotion() },
    ];
    for (const slot of slots) {
      const panel = this.addScreenObject(this.add.rectangle(slot.x, 555, 55, 100, 0xf8f9fa));
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
      this.addText(slot.x, 518, slot.name, 16, '#264653').setOrigin(0.5);
      const countText = this.addText(slot.x, 583, `× ${slot.count}`, 18, '#457b9d').setOrigin(0.5);
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
      } else {
        this.confusionPotionCountText = countText;
      }
    }
  }

  private updateSkillButtons(): void {
    if (this.skillButtons.length !== 4 || this.skillButtonIcons.length !== 4) {
      return;
    }
    const available = [
      this.getSkillRemaining(this.lastRapidSkillAt, RAPID_SKILL_COOLDOWN) === 0,
      this.level >= 2 && this.getSkillRemaining(this.lastSkillAt, SKILL_COOLDOWN) === 0,
      this.level >= 3 && this.getSkillRemaining(this.lastMoneyPunchAt, MONEY_PUNCH_COOLDOWN) === 0,
      this.level >= 2 && this.getSkillRemaining(this.lastHealSkillAt, HEAL_SKILL_COOLDOWN) === 0,
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
    glow.setPosition(640, 370);
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
    }).setOrigin(0.5));
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
    }).setOrigin(0.5));
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
    }).setOrigin(0.5));
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
      if (variant.shape === 'slime') {
        this.enemyVisuals.push(this.addEnemyVisual(this.add.ellipse(640, 390, 220, 190, variant.bodyColor)));
        this.enemyVisuals.push(this.addCombatObject(this.add.circle(610, 370, 14, variant.headColor)));
        this.enemyVisuals.push(this.addCombatObject(this.add.circle(670, 370, 14, variant.headColor)));
      } else if (variant.shape === 'golem') {
        this.enemyVisuals.push(this.addEnemyVisual(this.add.rectangle(640, 410, 220, 210, variant.bodyColor)));
        this.enemyVisuals.push(this.addEnemyVisual(this.add.rectangle(640, 270, 180, 100, variant.headColor)));
        this.enemyVisuals.push(this.addCombatObject(this.add.circle(610, 270, 12, 0x212529)));
        this.enemyVisuals.push(this.addCombatObject(this.add.circle(670, 270, 12, 0x212529)));
      } else {
        const goblinBody = this.addEnemyVisual(this.add.ellipse(640, 405, 170, 205, variant.bodyColor));
        const goblinHead = this.addEnemyVisual(this.add.ellipse(640, 295, 170, 145, variant.headColor));
        const leftEar = this.addEnemyVisual(this.add.triangle(565, 285, 530, 225, 565, 255, 595, 225, variant.bodyColor));
        const rightEar = this.addEnemyVisual(this.add.triangle(715, 285, 685, 225, 715, 255, 750, 225, variant.bodyColor));
        const leftEarInner = this.addEnemyVisual(this.add.triangle(565, 267, 548, 240, 565, 252, 582, 240, 0xffadad));
        const rightEarInner = this.addEnemyVisual(this.add.triangle(715, 267, 698, 240, 715, 252, 732, 240, 0xffadad));
        const leftEye = this.addEnemyVisual(this.add.ellipse(610, 290, 34, 26, 0xf8f9fa));
        const rightEye = this.addEnemyVisual(this.add.ellipse(670, 290, 34, 26, 0xf8f9fa));
        const leftPupil = this.addEnemyVisual(this.add.circle(615, 292, 8, 0x212529));
        const rightPupil = this.addEnemyVisual(this.add.circle(665, 292, 8, 0x212529));
        const nose = this.addEnemyVisual(this.add.triangle(640, 305, 625, 330, 655, 330, 640, 290, 0xe9c46a));
        const mouth = this.addEnemyVisual(this.add.rectangle(640, 355, 72, 24, 0x212529));
        const toothLeft = this.addEnemyVisual(this.add.triangle(630, 356, 620, 350, 640, 350, 630, 365, 0xf8f9fa));
        const toothRight = this.addEnemyVisual(this.add.triangle(650, 356, 640, 350, 660, 350, 650, 365, 0xf8f9fa));
        const shoulderArmor = this.addEnemyVisual(this.add.rectangle(640, 385, 120, 36, 0x495057));
        const belt = this.addEnemyVisual(this.add.rectangle(640, 450, 125, 18, 0x6d597a));
        const beltBuckle = this.addEnemyVisual(this.add.rectangle(640, 450, 18, 18, 0xf4d35e));
        goblinBody.setDepth(2);
        leftEar.setDepth(3);
        rightEar.setDepth(3);
        leftEarInner.setDepth(4);
        rightEarInner.setDepth(4);
        goblinHead.setDepth(5);
        shoulderArmor.setDepth(6);
        belt.setDepth(6);
        beltBuckle.setDepth(7);
        leftEye.setDepth(8);
        rightEye.setDepth(8);
        leftPupil.setDepth(9);
        rightPupil.setDepth(9);
        nose.setDepth(9);
        mouth.setDepth(9);
        toothLeft.setDepth(10);
        toothRight.setDepth(10);
        this.enemyVisuals.push(
          goblinBody,
          goblinHead,
          leftEar,
          rightEar,
          leftEarInner,
          rightEarInner,
          leftEye,
          rightEye,
          leftPupil,
          rightPupil,
          nose,
          mouth,
          toothLeft,
          toothRight,
          shoulderArmor,
          belt,
          beltBuckle,
        );
      }
      const enemyName = this.addText(640, 520, variant.name, 26, '#ffffff').setOrigin(0.5);
      enemyName.setStroke('#264653', 4);
      this.addCombatObject(enemyName);
    } else {
      const respawnText = this.addText(640, 400, '敵は再出現待ち', 24, '#ffffff').setOrigin(0.5);
      respawnText.setStroke('#264653', 4);
      this.addCombatObject(respawnText);
    }
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
    this.potionSlotPanels = [];
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