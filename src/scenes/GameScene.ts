import Phaser from 'phaser';
import {
  CLEAR_TICKET_PRICE,
  ENEMY_ATTACK_INTERVAL,
  ENEMY_DEFEAT_HEAL,
  ENEMY_HP_INCREASE,
  ENEMY_MAX_HP,
  ENEMY_RESPAWN_MAX,
  ENEMY_RESPAWN_MIN,
  ENEMY_REWARD,
  ENEMY_VARIANTS,
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
  private level = 1;
  private defeatedCount = 0;
  private enemyMaxHp = ENEMY_MAX_HP;
  private enemyHp = ENEMY_MAX_HP;
  private enemyVariantIndex = 0;
  private money = 0;
  private weaponIndex = 0;
  private purchasedWeapons = new Set<number>();
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
  private hudText?: Phaser.GameObjects.Text;
  private skillText?: Phaser.GameObjects.Text;
  private autoModeText?: Phaser.GameObjects.Text;
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
    this.enemyAlive = true;
    this.lastAttackAt = -PLAYER_ATTACK_INTERVAL;
  }

  private showTitle(): void {
    this.mode = 'title';
    this.clearScreen();
    this.addText(GAME_WIDTH / 2, 220, '金', 64, '#f4d35e').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 560, 'スペースキーで開始', 28, '#264653').setOrigin(0.5);
    this.addText(GAME_WIDTH / 2, 410, '敵を倒してお金を稼ごう', 24, '#a8dadc').setOrigin(0.5);
  }

  private showPlaying(): void {
    this.mode = 'playing';
    this.resumeTimers();
    this.clearScreen();
    this.drawPlayfieldBackground();
    this.drawHud(true);
    this.drawCombatants();
    this.addText(GAME_WIDTH / 2, 650, 'SPACE: 自動モード切替    1/2/3: スキル    E: ショップ', 22, '#264653').setOrigin(0.5);
    this.autoModeText = this.addText(36, 680, '', 20, '#264653');
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
      ...WEAPONS.slice(1),
      { name: 'クリアチケット', attackPower: 0, price: CLEAR_TICKET_PRICE },
    ];
    items.forEach((item, index) => {
      const x = 180 + index * 290;
      const card = this.addScreenObject(this.add.rectangle(x, 360, 250, 330, 0xf8f9fa));
      card.setStrokeStyle(3, 0xd9e2ec, 1);
      this.registerShopObject(card, x);
      const icon = this.drawWeaponIcon(x, 270, index);
      this.registerShopObject(icon, x);
      const name = this.addText(x, 390, item.name, 28, '#264653').setOrigin(0.5);
      this.registerShopObject(name, x);
      const details = this.addText(x, 430, `攻撃力: ${item.attackPower}\n${item.price}円`, 20, '#457b9d').setOrigin(0.5);
      this.registerShopObject(details, x);
      const button = this.addScreenObject(this.add.rectangle(x, 510, 190, 52, 0x2a9d8f));
      this.registerShopObject(button, x);
      button.setInteractive({ useHandCursor: true });
      const label = this.addText(x, 510, '', 23, '#ffffff').setOrigin(0.5);
      this.registerShopObject(label, x);
      const purchased = index < WEAPONS.length - 1 && this.purchasedWeapons.has(index + 1);
      const canBuy = this.money >= item.price;
      const isEquipped = purchased && index + 1 === this.weaponIndex;
      label.setText(purchased ? (isEquipped ? '装備中' : '装備') : canBuy ? '購入' : '購入不可');
      if (purchased) {
        button.setFillStyle(isEquipped ? 0x53616f : 0x457b9d);
        if (!isEquipped) {
          button.on('pointerdown', () => this.equipWeapon(index + 1));
        }
      } else if (!canBuy) {
        button.setFillStyle(0x53616f);
      } else {
        button.on('pointerdown', () => this.purchase(index));
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
    const maxOffset = -((6 - 4) * 290);
    this.shopScrollOffset = Phaser.Math.Clamp(this.shopScrollOffset + direction * 290, maxOffset, 0);
    for (const cardObject of this.shopCardObjects) {
      cardObject.object.x = cardObject.baseX + this.shopScrollOffset;
    }
  }

  private purchase(itemIndex: number): void {
    if (itemIndex < WEAPONS.length - 1) {
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
    this.enemyHp = Math.max(0, this.enemyHp - WEAPONS[this.weaponIndex].attackPower);
    this.updateHud();
    if (this.enemyHp === 0) {
      this.defeatEnemy();
    }
  }

  private useSkill(): void {
    if (!this.enemyAlive || this.level < 2 || this.time.now - this.lastSkillAt < SKILL_COOLDOWN) {
      return;
    }
    this.lastSkillAt = this.time.now;
    this.playGoldStrikeEffect();
    this.enemyHp = Math.max(0, this.enemyHp - WEAPONS[this.weaponIndex].attackPower * SKILL_DAMAGE_MULTIPLIER);
    this.updateHud();
    if (this.enemyHp === 0) {
      this.defeatEnemy();
    }
  }

  private useMoneyPunchSkill(): void {
    if (!this.enemyAlive || this.level < 3 || this.time.now - this.lastMoneyPunchAt < MONEY_PUNCH_COOLDOWN) {
      return;
    }
    this.lastMoneyPunchAt = this.time.now;
    this.playMoneyPunchEffect();
    this.enemyHp = Math.max(0, this.enemyHp - WEAPONS[this.weaponIndex].attackPower * 7);
    this.updateHud();
    if (this.enemyHp === 0) {
      this.defeatEnemy();
    }
  }

  private useRapidSkill(): void {
    if (!this.enemyAlive || this.time.now - this.lastRapidSkillAt < RAPID_SKILL_COOLDOWN) {
      return;
    }
    this.lastRapidSkillAt = this.time.now;
    this.playRapidEffect();
    this.enemyHp = Math.max(0, this.enemyHp - WEAPONS[this.weaponIndex].attackPower * 5);
    this.updateHud();
    if (this.enemyHp === 0) {
      this.defeatEnemy();
    }
  }

  private defeatEnemy(): void {
    this.enemyAlive = false;
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + ENEMY_DEFEAT_HEAL);
    this.money += ENEMY_REWARD;
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
    const variant = ENEMY_VARIANTS[this.enemyVariantIndex];
    this.playerHp = Math.max(0, this.playerHp - variant.attackPower);
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
    }
    this.hudText = this.addText(36, showHpBars ? 105 : 24, '', 22, '#264653');
    if (showHpBars) {
      this.skillText = this.addText(36, 205, '', 20, '#264653');
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
      `装備中: ${WEAPONS[this.weaponIndex].name} (攻撃力 ${WEAPONS[this.weaponIndex].attackPower})`,
    ]);
    this.playerHpBar?.setSize(300 * (this.playerHp / PLAYER_MAX_HP), 24);
    this.enemyHpBar?.setSize(300 * (this.enemyHp / this.enemyMaxHp), 24);
    this.updateSkillHud();
  }

  private updateSkillHud(): void {
    if (!this.skillText) {
      return;
    }
    const skillLines = [this.getSkillCooldownText('1: 連撃', this.lastRapidSkillAt, RAPID_SKILL_COOLDOWN)];
    skillLines.push(this.level >= 2 ? this.getSkillCooldownText('2: 金の一撃', this.lastSkillAt, SKILL_COOLDOWN) : '2: 金の一撃 (レベル2で解放)');
    skillLines.push(this.level >= 3 ? this.getSkillCooldownText('3: 札束パンチ', this.lastMoneyPunchAt, MONEY_PUNCH_COOLDOWN) : '3: 札束パンチ (レベル3で解放)');
    this.skillText.setText(skillLines);
  }

  private updateAutoModeText(): void {
    this.autoModeText?.setText(`自動モード：${this.autoMode ? 'ON' : 'OFF'}`);
  }

  private getSkillCooldownText(name: string, lastUsedAt: number, cooldown: number): string {
    const remaining = Math.max(0, cooldown - (this.time.now - lastUsedAt));
    return remaining === 0 ? `${name} 使用可能` : `${name} あと ${(remaining / 1000).toFixed(1)}秒`;
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
    const burst = this.addScreenObject(this.add.graphics());
    burst.setPosition(640, 370);
    burst.fillStyle(0xf4d35e, 0.3);
    burst.fillCircle(0, 0, 90);
    burst.lineStyle(10, 0xf4d35e, 1);
    burst.strokeCircle(0, 0, 90);
    burst.lineStyle(5, 0xfff3b0, 1);
    burst.strokeCircle(0, 0, 125);
    this.playSkillLabel('金の一撃！', '#f4d35e');
    this.tweens.add({
      targets: burst,
      scaleX: 1.5,
      scaleY: 1.5,
      angle: 180,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => this.removeScreenObject(burst),
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

  private drawWeaponIcon(x: number, y: number, itemIndex: number): Phaser.GameObjects.Graphics {
    const icon = this.addScreenObject(this.add.graphics());
    icon.setPosition(x, y);
    if (itemIndex === WEAPONS.length - 1) {
      icon.fillStyle(0xf4d35e, 1);
      icon.fillRoundedRect(-34, -24, 68, 48, 8);
      icon.lineStyle(3, 0x9a6b00, 1);
      icon.strokeRoundedRect(-34, -24, 68, 48, 8);
      icon.fillStyle(0x9a6b00, 1);
      icon.fillCircle(0, 0, 8);
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
    const offset = Phaser.Math.Between(1, ENEMY_VARIANTS.length - 1);
    this.enemyVariantIndex = (this.enemyVariantIndex + offset) % ENEMY_VARIANTS.length;
  }

  private addEnemyVisual<T extends Phaser.GameObjects.Shape>(object: T): T {
    object.setInteractive({ useHandCursor: true });
    object.on('pointerdown', () => this.attack(PLAYER_ATTACK_INTERVAL));
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
    this.skillText = undefined;
    this.autoModeText = undefined;
    this.playerHpBar = undefined;
    this.enemyHpBar = undefined;
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