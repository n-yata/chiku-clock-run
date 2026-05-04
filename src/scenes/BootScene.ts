import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const g = this.add.graphics();
    g.fillStyle(0xff3b30, 1);
    g.fillRect(0, 0, 32, 48);
    g.generateTexture('player', 32, 48);
    g.clear();

    g.fillStyle(0x8b4513, 1);
    g.fillRect(0, 0, 64, 32);
    g.generateTexture('ground', 64, 32);
    g.destroy();
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
