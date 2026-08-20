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
  AUTO_ATTACK_INTERVAL,
  AUTO_MODE_HOLD_DURATION,
  GAME_WIDTH,
  KILLS_PER_LEVEL,
  MONEY_PUNCH_COOLDOWN,
  PLAYER_ATTACK_INTERVAL,
  PLAYER_MAX_HP,
  RAPID_SKILL_COOLDOWN,
  SKILL_COOLDOWN,
  SKILL_DAMAGE_MULTIPLIER,
  WEAPONS,
} from '../game/constants';

type GameMode = 'title' | 'playing' | 'shop' | 'gameOver' | 'clear';

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
  private weaponIndex = 0;
  private purchasedWeapons = new Set<number>();
  private purchasedEquipments = new Set<number>();
  private enemyAlive = true;
  private lastAttackAt = -PLAYER_ATTACK_INTERVAL;
  private autoMode = false;
  private spaceHoldStartedAt?: number;
  private lastSkillAt = -SKILL_COOLDOWN;
  private lastMoneyPunchAt = -MONEY_PUNCH_COOLDOWN;
  private lastRapidSkillAt = -RAPID_SKILL_COOLDOWN;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private oneKey!: Phaser.Input.Keyboard.Key;
  private twoKey!: Phaser.Input.Keyboard.Key;
  private threeKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private enemyAttackTimer?: Phaser.Time.TimerEvent;
  private respawnTimer?: Phaser.Time.TimerEvent;
  private screenObjects: Phaser.GameObjects.GameObject[] = [];
  private combatObjects: Phaser.GameObjects.GameObject[] = [];
  private enemyVisuals: Phaser.GameObjects.GameObject[] = [];
  private shopButtons: Phaser.GameObjects.Rectangle[] = [];
  private shopCardObjects: Array<{ object: Phaser.GameObjects.GameObject & { x: number }; baseX: number }> = [];
  private shopScrollOffset = 0;
  private shopItemCount = 0;
  private hudText?: Phaser.GameObjects.Text;
  private autoModeText?: Phaser.GameObjects.Text;
  private enemyAttackText?: Phaser.GameObjects.Text;
  private skillButtons: Phaser.GameObjects.Arc[] = [];
  private skillButtonIcons: Phaser.GameObjects.Graphics[] = [];
  private playerHpBar?: Phaser.GameObjects.Rectangle;
  private enemyHpBar?: Phaser.GameObjects.Rectangle;

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
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.eKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    keyboard.addCapture(['SPACE', 'ONE', 'TWO', 'THREE', 'E', 'ESC', 'LEFT', 'RIGHT']);
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
      if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this.resetGame();
        this.showTitle();
        return;
      }
    }

    if (this.mode === 'playing') {
      if (this.autoMode) {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
          this.autoMode = false;
          this.updateAutoModeText();
        }
      } else {
        if (this.spaceKey.isDown && this.spaceHoldStartedAt === undefined) {
          this.spaceHoldStartedAt = this.time.now;
        }
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
          this.spaceHoldStartedAt = this.time.now;
        }
        if (this.spaceKey.isDown && this.spaceHoldStartedAt !== undefined && this.time.now - this.spaceHoldStartedAt >= AUTO_MODE_HOLD_DURATION) {
          this.autoMode = true;
          this.spaceHoldStartedAt = undefined;
          this.updateAutoModeText();
        }
        if (this.spaceKey.isUp) {
          this.spaceHoldStartedAt = undefined;
        }
      }
      if (this.autoMode) {
        this.attack(AUTO_ATTACK_INTERVAL);
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
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        this.showShop();
      }
      this.updateSkillHud();
    } else if (this.mode === 'shop') {
      if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this.showPlaying();
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
    this.level = 1;
    this.defeatedCount = 0;
    this.enemyMaxHp = ENEMY_MAX_HP;
    this.enemyHp = this.enemyMaxHp;
    this.enemyVariantIndex = 0;
    this.lastSkillAt = -SKILL_COOLDOWN;
    this.lastMoneyPunchAt = -MONEY_PUNCH_COOLDOWN;
    this.lastRapidSkillAt = -RAPID_SKILL_COOLDOWN;
    this.autoMode = false;
    this.spaceHoldStartedAt = undefined;
    this.money = 0;
    this.weaponIndex = 0;
    this.purchasedWeapons.clear();
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
    const controlsText = this.addText(GAME_WIDTH / 2, 650, 'SPACE: 自動モード切替    E: ショップ', 24, '#ffffff').setOrigin(0.5);
    controlsText.setStroke('#264653', 4);
    this.autoModeText = this.addText(GAME_WIDTH / 2, 590, '', 24, '#ffffff').setOrigin(0.5);
    this.autoModeText.setStroke('#264653', 4);
    this.updateAutoModeText();
    this.startEnemyAttackTimer();
  }

  private showShop(): void {
    this.mode = 'shop';
    this.pauseTimers();
    this.clearScreen();
    this.shopScrollOffset = 0;
    this.drawHud(false);
    this.addText(GAME_WIDTH / 2, 80, 'ショップ', 48, '#f4d35e').setOrigin(0.5);

    const items = [
      ...WEAPONS.slice(1).map((item) => ({ ...item, kind: 'weapon' as const })),
      ...EQUIPMENTS.map((item) => ({ ...item, kind: 'equipment' as const, attackPower: 0 })),
      { name: 'クリアチケット', attackPower: 0, price: CLEAR_TICKET_PRICE, kind: 'ticket' as const },
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
      const detailText = item.kind === 'equipment'
        ? `最大HP +${item.hpBonus}\n${item.price}円`
        : item.kind === 'ticket'
          ? `${item.price}円でゲームクリア`
          : `攻撃力: ${item.attackPower}\n${item.price}円`;
      const details = this.addText(x, 430, detailText, 20, '#457b9d').setOrigin(0.5);
      this.registerShopObject(details, x);
      const button = this.addScreenObject(this.add.rectangle(x, 510, 190, 52, 0x2a9d8f));
      this.registerShopObject(button, x);
      button.setInteractive({ useHandCursor: true });
      const label = this.addText(x, 510, '', 23, '#ffffff').setOrigin(0.5);
      this.registerShopObject(label, x);
      const weaponIndex = item.kind === 'weapon' ? index + 1 : -1;
      const equipmentIndex = item.kind === 'equipment' ? index - (WEAPONS.length - 1) : -1;
      const purchased = item.kind === 'weapon'
        ? this.purchasedWeapons.has(weaponIndex)
        : item.kind === 'equipment' && this.purchasedEquipments.has(equipmentIndex);
      const canBuy = this.money >= item.price;
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
        button.on('pointerdown', () => this.purchase(index, item.kind));
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
    backButton.on('pointerdown', () => this.showPlaying());
    this.addText(640, 660, '戻る (ESC)', 22, '#ffffff').setOrigin(0.5);
  }

  private scrollShop(direction: number): void {
    const maxOffset = -Math.max(0, this.shopItemCount - 4) * 290;
    this.shopScrollOffset = Phaser.Math.Clamp(this.shopScrollOffset + direction * 290, maxOffset, 0);
    for (const cardObject of this.shopCardObjects) {
      cardObject.object.x = cardObject.baseX + this.shopScrollOffset;
    }
  }

  private purchase(itemIndex: number, itemKind: 'weapon' | 'equipment' | 'ticket'): void {
    if (itemKind === 'weapon') {
      const weaponIndex = itemIndex + 1;
      const weapon = WEAPONS[weaponIndex];
      if (this.purchasedWeapons.has(weaponIndex) || this.money < weapon.price) {
        return;
      }
      this.money -= weapon.price;
      this.weaponIndex = weaponIndex;
      this.purchasedWeapons.add(weaponIndex);
      this.showPlaying();
      return;
    }

    if (itemKind === 'equipment') {
      const equipmentIndex = itemIndex - (WEAPONS.length - 1);
      const equipment = EQUIPMENTS[equipmentIndex];
      if (this.purchasedEquipments.has(equipmentIndex) || this.money < equipment.price) {
        return;
      }
      this.money -= equipment.price;
      this.purchasedEquipments.add(equipmentIndex);
      this.playerMaxHp += equipment.hpBonus;
      this.playerHp += equipment.hpBonus;
      this.showPlaying();
      return;
    }

    if (this.money >= CLEAR_TICKET_PRICE) {
      this.money -= CLEAR_TICKET_PRICE;
      this.showClear();
    }
  }

  private equipWeapon(weaponIndex: number): void {
    if (!this.purchasedWeapons.has(weaponIndex)) {
      return;
    }
    this.weaponIndex = weaponIndex;
    this.showPlaying();
  }

  private attack(interval: number): void {
    if (!this.enemyAlive || this.time.now - this.lastAttackAt < interval) {
      return;
    }
    this.lastAttackAt = this.time.now;
    this.playAttackEffect();
    this.applyDamage(WEAPONS[this.weaponIndex].attackPower, '#f4d35e');
  }

  private useSkill(): void {
    if (!this.enemyAlive || this.level < 2 || this.time.now - this.lastSkillAt < SKILL_COOLDOWN) {
      return;
    }
    this.lastSkillAt = this.time.now;
    this.playGoldStrikeEffect();
    this.applyDamage(WEAPONS[this.weaponIndex].attackPower * SKILL_DAMAGE_MULTIPLIER, '#f4d35e');
  }

  private useMoneyPunchSkill(): void {
    if (!this.enemyAlive || this.level < 3 || this.time.now - this.lastMoneyPunchAt < MONEY_PUNCH_COOLDOWN) {
      return;
    }
    this.lastMoneyPunchAt = this.time.now;
    this.playMoneyPunchEffect();
    this.time.delayedCall(350, () => {
      if (this.mode === 'playing' && this.enemyAlive) {
        this.applyDamage(WEAPONS[this.weaponIndex].attackPower * 7, '#57cc99');
      }
    });
  }

  private useRapidSkill(): void {
    if (!this.enemyAlive || this.time.now - this.lastRapidSkillAt < RAPID_SKILL_COOLDOWN) {
      return;
    }
    this.lastRapidSkillAt = this.time.now;
    this.playRapidEffect();
    this.applyDamage(WEAPONS[this.weaponIndex].attackPower * 5, '#ffadad');
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
    const damageText = this.addScreenObject(this.add.text(640, 330, `-${damage}`, {
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
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + ENEMY_DEFEAT_HEAL);
    this.money += this.getEnemyReward();
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
    this.stopEnemyAttackTimer();
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
    this.playerHp = Math.max(0, this.playerHp - this.getEnemyAttackPower());
    this.updateHud();
    if (this.playerHp === 0) {
      this.showGameOver();
    }
  }

  private showGameOver(): void {
    this.mode = 'gameOver';
    this.stopTimers();
    this.clearScreen();
    this.addText(GAME_WIDTH / 2, 280, 'ゲームオーバー', 60, '#e63946').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 390, 'スペースキーでリスタート', 28, '#264653').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 440, 'Escキーで終了', 24, '#264653').setOrigin(0.5);
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
      this.addText(36, 24, 'プレイヤーHP', 22, '#ffffff');
      this.playerHpBar = this.addHpBar(36, 58, 300, 0x2a9d8f);
      this.addText(900, 24, '敵HP', 22, '#ffffff');
      this.enemyHpBar = this.addHpBar(900, 58, 300, 0xe76f51);
      this.enemyAttackText = this.addText(900, 105, '', 22, '#264653');
    }
    this.hudText = this.addText(36, showHpBars ? 105 : 24, '', 22, '#264653');
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
      `装備中: ${WEAPONS[this.weaponIndex].name} (攻撃力 ${WEAPONS[this.weaponIndex].attackPower})`,
    ]);
    this.playerHpBar?.setSize(300 * (this.playerHp / this.playerMaxHp), 24);
    this.enemyHpBar?.setSize(300 * (this.enemyHp / this.enemyMaxHp), 24);
    this.enemyAttackText?.setText(`敵攻撃力: ${this.getEnemyAttackPower()}`);
    this.updateSkillHud();
  }

  private getEnemyAttackPower(): number {
    const variant = ENEMY_VARIANTS[this.enemyVariantIndex];
    return variant.attackPower + this.defeatedCount * ENEMY_ATTACK_INCREASE;
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
    ];
    for (const skill of skills) {
      const button = this.addScreenObject(this.add.circle(skill.x, skill.y, 54, 0x457b9d));
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', skill.action);
      this.skillButtons.push(button);
      const icon = this.drawSkillIcon(skill.x, skill.y, this.skillButtons.length - 1);
      icon.setScale(1.2);
      this.skillButtonIcons.push(icon);
    }
    this.updateSkillButtons();
  }

  private updateSkillButtons(): void {
    if (this.skillButtons.length !== 3 || this.skillButtonIcons.length !== 3) {
      return;
    }
    const available = [
      this.getSkillRemaining(this.lastRapidSkillAt, RAPID_SKILL_COOLDOWN) === 0,
      this.level >= 2 && this.getSkillRemaining(this.lastSkillAt, SKILL_COOLDOWN) === 0,
      this.level >= 3 && this.getSkillRemaining(this.lastMoneyPunchAt, MONEY_PUNCH_COOLDOWN) === 0,
    ];
    for (let index = 0; index < this.skillButtons.length; index += 1) {
      this.skillButtons[index].setFillStyle(available[index] ? 0x2a9d8f : 0x53616f);
      this.skillButtonIcons[index].setAlpha(available[index] ? 1 : 0.45);
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
    } else {
      icon.fillStyle(0x57cc99, 1);
      icon.fillRect(-25, -16, 50, 32);
      icon.lineStyle(3, 0xffffff, 1);
      icon.strokeRect(-25, -16, 50, 32);
      icon.lineBetween(-12, -10, -12, 10);
      icon.lineBetween(8, -10, 8, 10);
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

  private updateAutoModeText(): void {
    this.autoModeText?.setText(`自動モード：${this.autoMode ? 'ON' : 'OFF'}`);
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

  private drawShopIcon(x: number, y: number, itemIndex: number, itemKind: 'weapon' | 'equipment' | 'ticket'): Phaser.GameObjects.Graphics {
    const icon = this.addScreenObject(this.add.graphics());
    icon.setPosition(x, y);
    if (itemKind === 'ticket') {
      icon.fillStyle(0xf4d35e, 1);
      icon.fillRoundedRect(-34, -24, 68, 48, 8);
      icon.lineStyle(3, 0x9a6b00, 1);
      icon.strokeRoundedRect(-34, -24, 68, 48, 8);
      icon.fillStyle(0x9a6b00, 1);
      icon.fillCircle(0, 0, 8);
      return icon;
    }

    if (itemKind === 'equipment') {
      icon.fillStyle(0x457b9d, 1);
      icon.fillRoundedRect(-32, -40, 64, 80, 12);
      icon.lineStyle(5, 0x264653, 1);
      icon.strokeRoundedRect(-32, -40, 64, 80, 12);
      icon.fillStyle(0xf4d35e, 1);
      icon.fillCircle(0, 0, 14);
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
        this.enemyVisuals.push(this.addEnemyVisual(this.add.rectangle(640, 400, 170, 180, variant.bodyColor)));
        this.enemyVisuals.push(this.addEnemyVisual(this.add.circle(640, 280, 55, variant.headColor)));
      }
      this.addCombatObject(this.addText(640, 520, variant.name, 26, '#264653').setOrigin(0.5));
    } else {
      this.addCombatObject(this.addText(640, 400, '敵は再出現待ち', 24, '#ffadad').setOrigin(0.5));
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
    if (this.respawnTimer) {
      this.respawnTimer.paused = false;
    }
  }

  private pauseTimers(): void {
    if (this.enemyAttackTimer) {
      this.enemyAttackTimer.paused = true;
    }
    if (this.respawnTimer) {
      this.respawnTimer.paused = true;
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
  }

  private clearScreen(): void {
    this.tweens.killAll();
    for (const object of this.screenObjects) {
      object.destroy();
    }
    this.screenObjects = [];
    this.combatObjects = [];
    this.enemyVisuals = [];
    this.shopButtons = [];
    this.shopCardObjects = [];
    this.hudText = undefined;
    this.autoModeText = undefined;
    this.skillButtons = [];
    this.skillButtonIcons = [];
    this.playerHpBar = undefined;
    this.enemyHpBar = undefined;
    this.enemyAttackText = undefined;
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