import Phaser from 'phaser';
import { TEX_KEY, ANIM_KEY, PLAYER_ANIM_WALK_FPS, ENEMY_ANIM_WALK_FPS, FLYER_ANIM_FPS, BOMB_TICK_FPS } from '../config/gameConfig';

export function registerAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists(ANIM_KEY.playerIdle)) return; // 冪等チェック

  scene.anims.create({
    key: ANIM_KEY.playerIdle,
    frames: [
      { key: TEX_KEY.playerSheet, frame: 'idle' },
      { key: TEX_KEY.playerSheet, frame: 'idle_b' },
    ],
    frameRate: 3,
    repeat: -1
  });
  scene.anims.create({
    key: ANIM_KEY.playerWalk,
    frames: [
      { key: TEX_KEY.playerSheet, frame: 'walk1' },
      { key: TEX_KEY.playerSheet, frame: 'walk3' },
      { key: TEX_KEY.playerSheet, frame: 'walk2' },
      { key: TEX_KEY.playerSheet, frame: 'walk3' },
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
    key: ANIM_KEY.winderWalk,
    frames: [
      { key: TEX_KEY.enemySheet, frame: 'enemy_walk1' },
      { key: TEX_KEY.enemySheet, frame: 'enemy_walk2' },
      { key: TEX_KEY.enemySheet, frame: 'enemy_walk3' },
      { key: TEX_KEY.enemySheet, frame: 'enemy_walk2' },
    ],
    frameRate: ENEMY_ANIM_WALK_FPS,
    repeat: -1
  });
  scene.anims.create({
    key: ANIM_KEY.flyerFly,
    frames: [
      { key: TEX_KEY.flyerSheet, frame: 'flyer1' },
      { key: TEX_KEY.flyerSheet, frame: 'flyer2' },
    ],
    frameRate: FLYER_ANIM_FPS,
    repeat: -1
  });
  scene.anims.create({
    key: ANIM_KEY.bombIdle,
    frames: [{ key: TEX_KEY.bombSheet, frame: 'bomb_idle' }],
    frameRate: 1,
    repeat: 0
  });
  scene.anims.create({
    key: ANIM_KEY.bombTick,
    frames: [
      { key: TEX_KEY.bombSheet, frame: 'bomb_idle' },
      { key: TEX_KEY.bombSheet, frame: 'bomb_tick' },
    ],
    frameRate: BOMB_TICK_FPS,
    repeat: -1
  });
}
