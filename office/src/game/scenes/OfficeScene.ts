import Phaser from "phaser";
import { getCollisionRects } from "../layout/officeLayout";
import { normalizeVelocity } from "../input/playerMovement";

const WORLD_WIDTH = 768;
const WORLD_HEIGHT = 384;
const PLAYER_SPEED = 120;
const PLAYER_TEXTURE_KEY = "office-player";

export class OfficeScene extends Phaser.Scene {
  public cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  public interactKey?: Phaser.Input.Keyboard.Key;

  public onInteractAgent?: (agentId: string | null) => void;

  private player?: Phaser.Physics.Arcade.Sprite;

  private obstacleZones: Phaser.GameObjects.Zone[] = [];

  constructor() {
    super("office");
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#121826");

    this.drawOfficeShell();
    this.createPlayerTexture();
    this.createCollisionGeometry();

    this.player = this.physics.add.sprite(64, 192, PLAYER_TEXTURE_KEY);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);

    for (const zone of this.obstacleZones) {
      this.physics.add.collider(this.player, zone);
    }

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.interactKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
  }

  update() {
    if (!this.player || !this.cursors) {
      return;
    }

    const direction = {
      x: Number(this.cursors.left?.isDown) * -1 + Number(this.cursors.right?.isDown),
      y: Number(this.cursors.up?.isDown) * -1 + Number(this.cursors.down?.isDown),
    };

    const velocity = normalizeVelocity(direction, PLAYER_SPEED);
    this.player.setVelocity(velocity.x, velocity.y);
  }

  private drawOfficeShell() {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x152033);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, WORLD_WIDTH, 96, 0x1e2d3d);
    this.add.rectangle(384, 96, 768, 8, 0x24364a).setAlpha(0.8);

    const deskBankStyle = { fillColor: 0x3d4c66, strokeColor: 0x8aa0c6 };
    this.add.rectangle(548, 112, 320, 42, deskBankStyle.fillColor)
      .setStrokeStyle(2, deskBankStyle.strokeColor)
      .setAlpha(0.94);
    this.add.rectangle(548, 272, 320, 42, deskBankStyle.fillColor)
      .setStrokeStyle(2, deskBankStyle.strokeColor)
      .setAlpha(0.94);

    this.add.rectangle(92, 96, 36, 44, 0x75b9ff).setStrokeStyle(2, 0xbad9ff);
    this.add.rectangle(92, 74, 26, 16, 0xe8f2ff);
    this.add.rectangle(92, 124, 18, 12, 0xf3bf6b);

    this.add.rectangle(108, 288, 104, 38, 0x8a5b4c).setStrokeStyle(2, 0xc38a72);
    this.add.rectangle(88, 274, 18, 64, 0x5e4034);
    this.add.rectangle(132, 276, 18, 60, 0x5e4034);
    this.add.rectangle(72, 308, 16, 10, 0x5e4034);
    this.add.rectangle(148, 308, 16, 10, 0x5e4034);

    this.add.rectangle(236, 124, 88, 56, 0x27374d).setStrokeStyle(2, 0x6c7e97);
    this.add.rectangle(222, 96, 12, 52, 0x6c7e97);
    this.add.rectangle(250, 96, 12, 52, 0x6c7e97);
    this.add.rectangle(274, 96, 12, 52, 0x6c7e97);
    this.add.rectangle(248, 138, 60, 8, 0x91a4bd);

    this.add.text(30, 24, "Paperclip Office", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      color: "#f8f4ea",
    });
    this.add.text(24, 354, "Arrow keys move. E is reserved for future interactions.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#cfd8e6",
    });
    this.add.text(530, 62, "Desk bank", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#eef3fb",
    });
    this.add.text(64, 140, "Water cooler", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#eef3fb",
    });
    this.add.text(78, 244, "Couch", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#eef3fb",
    });
    this.add.text(220, 68, "Chat nook", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#eef3fb",
    });
  }

  private createPlayerTexture() {
    if (this.textures.exists(PLAYER_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xf3bf6b, 1);
    graphics.fillCircle(14, 14, 12);
    graphics.fillStyle(0x101826, 1);
    graphics.fillCircle(14, 11, 5);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(11, 10, 1);
    graphics.fillCircle(17, 10, 1);
    graphics.generateTexture(PLAYER_TEXTURE_KEY, 28, 28);
    graphics.destroy();
  }

  private createCollisionGeometry() {
    const collisionRects = getCollisionRects();

    this.obstacleZones = collisionRects.map((rect) => {
      const zone = this.add.zone(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        rect.width,
        rect.height,
      );
      this.physics.add.existing(zone, true);
      zone.setVisible(false);
      return zone;
    });
  }
}
