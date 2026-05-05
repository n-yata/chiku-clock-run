import Phaser from 'phaser';
import { TEX_KEY, ANIM_KEY, PLAYER_ANIM_WALK_FPS, ENEMY_ANIM_WALK_FPS } from '../config/gameConfig';

export function registerAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists(ANIM_KEY.playerIdle)) return; // 冪等チェック

  scene.anims.create({
    key: ANIM_KEY.playerIdle,
    frames: [{ key: TEX_KEY.playerSheet, frame: 'idle' }],
    frameRate: 1,
    repeat: -1
  });
  scene.anims.create({
    key: ANIM_KEY.playerWalk,
    frames: [
      { key: TEX_KEY.playerSheet, frame: 'walk1' },
      { key: TEX_KEY.playerSheet, frame: 'walk2' }
    ],
    frameRate: PLAYER_ANIM_WALK_FPS,
    repeat: -1
  });
  scene.anims.create({
    key: ANIM_KEY.playerJump,
    frames: [{ key: TEX_KEY.playerSheet, frame: 'jump' }],
    frameRate: 1,
    repeat: 0
  });
  scene.anims.create({
    key: ANIM_KEY.enemyWalk,
    frames: [
      { key: TEX_KEY.enemySheet, frame: 'enemy_walk1' },
      { key: TEX_KEY.enemySheet, frame: 'enemy_walk2' }
    ],
    frameRate: ENEMY_ANIM_WALK_FPS,
    repeat: -1
  });
}
