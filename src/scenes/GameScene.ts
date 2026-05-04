import Phaser from 'phaser';

const PLAYER_SPEED = 200;
const JUMP_VELOCITY = -450;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const ground = this.physics.add.staticGroup();
    for (let x = 0; x < 960; x += 64) {
      ground.create(x + 32, 540 - 16, 'ground');
    }

    this.player = this.physics.add.sprite(100, 400, 'player');
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, ground);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input plugin is not available');
    }
    this.cursors = this.input.keyboard.createCursorKeys();

    this.add
      .text(16, 16, '←/→: 移動  Space: ジャンプ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#ffffff'
      })
      .setScrollFactor(0);
  }

  update(): void {
    const onGround = this.player.body?.blocked.down ?? false;

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-PLAYER_SPEED);
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(PLAYER_SPEED);
    } else {
      this.player.setVelocityX(0);
    }

    if ((this.cursors.space?.isDown || this.cursors.up?.isDown) && onGround) {
      this.player.setVelocityY(JUMP_VELOCITY);
    }
  }
}
