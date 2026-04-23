import Phaser from "phaser";
import { AgentActor } from "../actors/AgentActor";
import { TalkBubble } from "../actors/TalkBubble";
import {
  getCollisionRects,
  getClosestOfficeNode,
  getFloorPatches,
  getOfficeHotspots,
  getOfficeLabels,
  getRouteForZones,
  getOfficeProps,
  getSpawnPoint,
  OFFICE_PIXEL_SCALE,
  OFFICE_TILE_SIZE,
  OFFICE_WORLD_HEIGHT,
  OFFICE_WORLD_WIDTH,
} from "../layout/officeLayout";
import { normalizeVelocity } from "../input/playerMovement";
import type { OfficeAgentView } from "@/types/office";

const PLAYER_SPEED = 156;
const PLAYER_SPRINT_MULTIPLIER = 1.65;
const INTERACT_DISTANCE = 78;
const PLAYER_TEXTURE_KEY = "office-char-5";

type FacingDirection = "up" | "down" | "left" | "right";

interface OfficeMovementKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

type InteractTarget =
  | {
      kind: "agent";
      actor: AgentActor;
      distance: number;
      prompt: string;
    }
  | {
      kind: "hotspot";
      hotspotId: string;
      x: number;
      y: number;
      distance: number;
      prompt: string;
    };

function getIdleFrame(direction: FacingDirection) {
  if (direction === "up") {
    return 8;
  }

  if (direction === "left" || direction === "right") {
    return 15;
  }

  return 1;
}

function getDirectionFromVelocity(x: number, y: number, fallback: FacingDirection): FacingDirection {
  if (x === 0 && y === 0) {
    return fallback;
  }

  if (Math.abs(x) > Math.abs(y)) {
    return x < 0 ? "left" : "right";
  }

  return y < 0 ? "up" : "down";
}

export class OfficeScene extends Phaser.Scene {
  public isReady = false;

  public cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  public moveKeys?: OfficeMovementKeys;

  public interactKey?: Phaser.Input.Keyboard.Key;

  public sprintKey?: Phaser.Input.Keyboard.Key;

  public onInteractAgent?: (agentId: string | null) => void;

  public onInteractHotspot?: (hotspotId: string) => void;

  private readonly agents = new Map<string, AgentActor>();

  private talkBubble: TalkBubble | null = null;

  private player?: Phaser.Physics.Arcade.Sprite;

  private playerShadow?: Phaser.GameObjects.Ellipse;

  private obstacleZones: Phaser.GameObjects.Zone[] = [];

  private interactPrompt?: Phaser.GameObjects.Container;

  private interactPromptText?: Phaser.GameObjects.Text;

  private playerFacing: FacingDirection = "down";

  private controlsLocked = false;

  private scriptedMovement = false;

  constructor() {
    super("office");
  }

  preload() {
    this.load.spritesheet("office-char-0", "/assets/pixel-agents/characters/char_0.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet("office-char-1", "/assets/pixel-agents/characters/char_1.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet("office-char-2", "/assets/pixel-agents/characters/char_2.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet("office-char-3", "/assets/pixel-agents/characters/char_3.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet("office-char-4", "/assets/pixel-agents/characters/char_4.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet("office-char-5", "/assets/pixel-agents/characters/char_5.png", {
      frameWidth: 16,
      frameHeight: 32,
    });

    this.load.image("office-floor-slate", "/assets/pixel-agents/floors/floor_2.png");
    this.load.image("office-floor-grid", "/assets/pixel-agents/floors/floor_1.png");
    this.load.image("office-floor-wood", "/assets/pixel-agents/floors/floor_5.png");

    this.load.image("office-prop-bookshelf-double", "/assets/pixel-agents/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png");
    this.load.image("office-prop-clock", "/assets/pixel-agents/furniture/CLOCK/CLOCK.png");
    this.load.image("office-prop-whiteboard", "/assets/pixel-agents/furniture/WHITEBOARD/WHITEBOARD.png");
    this.load.image("office-prop-painting-small", "/assets/pixel-agents/furniture/SMALL_PAINTING/SMALL_PAINTING.png");
    this.load.image("office-prop-painting-small-2", "/assets/pixel-agents/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png");
    this.load.image("office-prop-hanging-plant", "/assets/pixel-agents/furniture/HANGING_PLANT/HANGING_PLANT.png");
    this.load.image("office-prop-table-front", "/assets/pixel-agents/furniture/TABLE_FRONT/TABLE_FRONT.png");
    this.load.image("office-prop-small-table-front", "/assets/pixel-agents/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png");
    this.load.image("office-prop-bench-cushioned", "/assets/pixel-agents/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png");
    this.load.image("office-prop-sofa-front", "/assets/pixel-agents/furniture/SOFA/SOFA_FRONT.png");
    this.load.image("office-prop-sofa-back", "/assets/pixel-agents/furniture/SOFA/SOFA_BACK.png");
    this.load.image("office-prop-sofa-side", "/assets/pixel-agents/furniture/SOFA/SOFA_SIDE.png");
    this.load.image("office-prop-coffee-table", "/assets/pixel-agents/furniture/COFFEE_TABLE/COFFEE_TABLE.png");
    this.load.image("office-prop-coffee-cup", "/assets/pixel-agents/furniture/COFFEE/COFFEE.png");
    this.load.image("office-prop-large-plant", "/assets/pixel-agents/furniture/LARGE_PLANT/LARGE_PLANT.png");
    this.load.image("office-prop-bin", "/assets/pixel-agents/furniture/BIN/BIN.png");
    this.load.image("office-prop-chair-front", "/assets/pixel-agents/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png");
    this.load.image("office-prop-chair-back", "/assets/pixel-agents/furniture/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png");
    this.load.image("office-prop-chair-side", "/assets/pixel-agents/furniture/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png");
    this.load.image("office-prop-desk-front", "/assets/pixel-agents/furniture/DESK/DESK_FRONT.png");
    this.load.image("office-prop-pc-1", "/assets/pixel-agents/furniture/PC/PC_FRONT_ON_1.png");
    this.load.image("office-prop-pc-2", "/assets/pixel-agents/furniture/PC/PC_FRONT_ON_2.png");
    this.load.image("office-prop-pc-3", "/assets/pixel-agents/furniture/PC/PC_FRONT_ON_3.png");
  }

  create() {
    this.physics.world.setBounds(0, 0, OFFICE_WORLD_WIDTH, OFFICE_WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, OFFICE_WORLD_WIDTH, OFFICE_WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#0f1117");
    this.cameras.main.roundPixels = true;

    this.createGeneratedTextures();
    this.createCharacterAnimations();
    this.drawOfficeShell();
    this.drawFloor();
    this.drawProps();
    this.drawLabels();
    this.createCollisionGeometry();
    this.createPlayer();
    this.createInteractPrompt();
    this.talkBubble = new TalkBubble(this);

    this.cursors = this.input.keyboard?.createCursorKeys();
    const moveKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as
      | {
          up: Phaser.Input.Keyboard.Key;
          down: Phaser.Input.Keyboard.Key;
          left: Phaser.Input.Keyboard.Key;
          right: Phaser.Input.Keyboard.Key;
        }
      | undefined;

    if (moveKeys) {
      this.moveKeys = {
        up: moveKeys.up,
        down: moveKeys.down,
        left: moveKeys.left,
        right: moveKeys.right,
      };
    }

    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.sprintKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.isReady = true;
    this.game.events.emit("office-scene-ready", this);
  }

  update() {
    this.updatePlayerMovement();
    this.updateInteractPrompt();
  }

  setControlsLocked(locked: boolean) {
    this.controlsLocked = locked;
    if (locked) {
      this.player?.setVelocity(0, 0);
      this.player?.anims.stop();
      this.player?.setFrame(getIdleFrame(this.playerFacing));
      this.interactPrompt?.setVisible(false);
    }
  }

  async walkPlayerToAgent(agentId: string) {
    const actor = this.agents.get(agentId);
    if (!actor || !this.player) {
      return false;
    }

    const start = getClosestOfficeNode(this.player.x, this.player.y);
    const finish = getClosestOfficeNode(actor.sprite.x, actor.sprite.y);
    const route = getRouteForZones(start.id, finish.id);
    const points = [
      { x: start.x, y: start.y },
      ...route.slice(1).map((node) => ({ x: node.x, y: node.y })),
      actor.getApproachPoint(),
    ];

    return this.walkPlayerPath(points);
  }

  async playFireSequence(agentId: string) {
    const actor = this.agents.get(agentId);
    if (!actor) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      actor.playFireSequence(() => resolve(true));
    });
  }

  syncAgents(views: OfficeAgentView[]) {
    const spawn = getSpawnPoint();
    const nextIds = new Set(views.map((view) => view.agentId));

    for (const [agentId, actor] of this.agents) {
      if (nextIds.has(agentId)) {
        continue;
      }

      actor.destroy();
      this.agents.delete(agentId);
    }

    for (const view of views) {
      const actor =
        this.agents.get(view.agentId)
        ?? new AgentActor(this, view.agentId, spawn.x, spawn.y, "spawn");

      actor.sprite.setInteractive({ useHandCursor: true });
      actor.sprite.off("pointerdown");
      actor.sprite.on("pointerdown", () => {
        this.onInteractAgent?.(view.agentId);
      });
      actor.sync(view);
      this.agents.set(view.agentId, actor);
    }

    const talkingPair = views.find((view) => view.talkingWith);
    if (!this.talkBubble || !talkingPair) {
      this.talkBubble?.hide();
      return;
    }

    const left = this.agents.get(talkingPair.agentId);
    const right = talkingPair.talkingWith ? this.agents.get(talkingPair.talkingWith) : null;

    if (!left || !right) {
      this.talkBubble.hide();
      return;
    }

    this.talkBubble.placeBetween(left.sprite, right.sprite);
  }

  private createPlayer() {
    const spawn = getSpawnPoint();

    this.playerShadow = this.add.ellipse(spawn.x, spawn.y - 8, 30, 14, 0x0a0c12, 0.32).setDepth(spawn.y + 18);
    this.player = this.physics.add
      .sprite(spawn.x, spawn.y, PLAYER_TEXTURE_KEY, getIdleFrame(this.playerFacing))
      .setOrigin(0.5, 1)
      .setScale(OFFICE_PIXEL_SCALE)
      .setDepth(spawn.y + 60);
    this.player.setSize(10, 12);
    this.player.setOffset(3, 20);
    this.player.setCollideWorldBounds(true);

    for (const zone of this.obstacleZones) {
      this.physics.add.collider(this.player, zone);
    }
  }

  private updatePlayerMovement() {
    if (!this.player || !this.cursors) {
      return;
    }

    if (this.controlsLocked || this.scriptedMovement) {
      this.player.setVelocity(0, 0);
      return;
    }

    const leftPressed = this.cursors.left?.isDown || this.moveKeys?.left.isDown;
    const rightPressed = this.cursors.right?.isDown || this.moveKeys?.right.isDown;
    const upPressed = this.cursors.up?.isDown || this.moveKeys?.up.isDown;
    const downPressed = this.cursors.down?.isDown || this.moveKeys?.down.isDown;

    const direction = {
      x: Number(Boolean(rightPressed)) - Number(Boolean(leftPressed)),
      y: Number(Boolean(downPressed)) - Number(Boolean(upPressed)),
    };

    const speed = this.sprintKey?.isDown ? PLAYER_SPEED * PLAYER_SPRINT_MULTIPLIER : PLAYER_SPEED;
    const velocity = normalizeVelocity(direction, speed);
    this.player.setVelocity(velocity.x, velocity.y);
    this.playerFacing = getDirectionFromVelocity(velocity.x, velocity.y, this.playerFacing);
    this.player.setDepth(this.player.y + 60);

    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y - 8);
      this.playerShadow.setDepth(this.player.y + 18);
    }

    if (velocity.x !== 0 || velocity.y !== 0) {
      this.player.setFlipX(this.playerFacing === "left");
      if (this.playerFacing === "up") {
        this.player.play(`${PLAYER_TEXTURE_KEY}-walk-up`, true);
      } else if (this.playerFacing === "left" || this.playerFacing === "right") {
        this.player.play(`${PLAYER_TEXTURE_KEY}-walk-side`, true);
      } else {
        this.player.play(`${PLAYER_TEXTURE_KEY}-walk-down`, true);
      }
      return;
    }

    this.player.anims.stop();
    this.player.setFlipX(this.playerFacing === "left");
    this.player.setFrame(getIdleFrame(this.playerFacing));
  }

  private updateInteractPrompt() {
    if (!this.player || !this.interactPrompt || !this.interactPromptText) {
      return;
    }

    const target = this.getNearestInteractTarget();
    const isActive =
      target != null
      && target.distance <= INTERACT_DISTANCE
      && !this.controlsLocked
      && !this.scriptedMovement;

    if (!isActive || !target) {
      this.interactPrompt.setVisible(false);
      return;
    }

    this.interactPrompt.setVisible(true);
    const promptX = target.kind === "agent" ? target.actor.sprite.x : target.x;
    const promptY = target.kind === "agent" ? target.actor.sprite.y - 96 : target.y - 84;
    const promptDepth = target.kind === "agent" ? target.actor.sprite.depth + 60 : promptY + 80;
    this.interactPrompt.setPosition(promptX, promptY);
    this.interactPrompt.setDepth(promptDepth);
    this.interactPromptText.setText(target.prompt);

    if (!this.interactKey || !Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      return;
    }

    if (target.kind === "agent") {
      this.onInteractAgent?.(target.actor.agentId);
      return;
    }

    this.onInteractHotspot?.(target.hotspotId);
  }

  private drawOfficeShell() {
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x11151d, 1);
    backdrop.fillRect(0, 0, OFFICE_WORLD_WIDTH, OFFICE_WORLD_HEIGHT);
    backdrop.fillStyle(0x334055, 1);
    backdrop.fillRect(0, 0, OFFICE_WORLD_WIDTH, OFFICE_TILE_SIZE * 2);
    backdrop.fillStyle(0xd6cfbf, 1);
    backdrop.fillRect(0, OFFICE_TILE_SIZE * 2, OFFICE_WORLD_WIDTH, OFFICE_WORLD_HEIGHT - OFFICE_TILE_SIZE * 2);
    backdrop.fillStyle(0x87644b, 1);
    backdrop.fillRect(0, OFFICE_WORLD_HEIGHT - OFFICE_TILE_SIZE, OFFICE_WORLD_WIDTH, OFFICE_TILE_SIZE);
    backdrop.fillStyle(0xced6e2, 1);
    backdrop.fillRect(OFFICE_TILE_SIZE * 10 - 12, 0, 24, OFFICE_WORLD_HEIGHT);
    backdrop.fillStyle(0xf2ecde, 1);
    backdrop.fillRect(0, OFFICE_TILE_SIZE * 2, OFFICE_TILE_SIZE * 10, OFFICE_WORLD_HEIGHT - OFFICE_TILE_SIZE * 3);
    backdrop.lineStyle(4, 0x554234, 0.3);
    backdrop.strokeRect(18, 18, OFFICE_WORLD_WIDTH - 36, OFFICE_WORLD_HEIGHT - 36);
    backdrop.lineStyle(3, 0x9ea7b8, 0.46);
    backdrop.strokeRect(
      OFFICE_TILE_SIZE * 10,
      OFFICE_TILE_SIZE * 2,
      OFFICE_WORLD_WIDTH - OFFICE_TILE_SIZE * 10 - 24,
      OFFICE_WORLD_HEIGHT - OFFICE_TILE_SIZE * 5,
    );
  }

  private drawFloor() {
    for (const patch of getFloorPatches()) {
      for (let row = 0; row < patch.height; row += 1) {
        for (let column = 0; column < patch.width; column += 1) {
          this.add
            .image(
              (patch.col + column) * OFFICE_TILE_SIZE,
              (patch.row + row) * OFFICE_TILE_SIZE,
              patch.textureKey,
            )
            .setOrigin(0, 0)
            .setScale(OFFICE_PIXEL_SCALE)
            .setDepth(0);
        }
      }
    }
  }

  private drawProps() {
    for (const prop of getOfficeProps()) {
      const image = this.add
        .image(prop.x, prop.y, prop.textureKey)
        .setOrigin(0, 0)
        .setScale(OFFICE_PIXEL_SCALE)
        .setFlipX(Boolean(prop.flipX))
        .setAlpha(prop.alpha ?? 1)
        .setDepth(prop.depth ?? prop.y + 24);

      if (prop.id === "company-board") {
        image.setInteractive({ useHandCursor: true });
        image.on("pointerdown", () => {
          this.onInteractHotspot?.("company-board");
        });
      }
    }
  }

  private drawLabels() {
    for (const label of getOfficeLabels()) {
      this.add
        .text(label.x, label.y, label.text, {
          fontFamily: "Monaco, Menlo, monospace",
          fontSize: "17px",
          color: "#f6f0dc",
          stroke: "#2b1d16",
          strokeThickness: 5,
        })
        .setDepth(180);
    }
  }

  private createCollisionGeometry() {
    this.obstacleZones = getCollisionRects().map((rect) => {
      const zone = this.add.zone(rect.x, rect.y, rect.width, rect.height);
      this.physics.add.existing(zone, true);
      zone.setVisible(false);
      return zone;
    });
  }

  private createInteractPrompt() {
    const background = this.add.graphics();
    background.fillStyle(0x1c2431, 1);
    background.fillRoundedRect(-68, -14, 136, 28, 6);
    background.lineStyle(2, 0xf2d28b, 1);
    background.strokeRoundedRect(-68, -14, 136, 28, 6);

    this.interactPromptText = this.add.text(0, 0, "[E] Talk", {
      fontFamily: "Monaco, Menlo, monospace",
      fontSize: "13px",
      color: "#f9f2da",
    });
    this.interactPromptText.setOrigin(0.5, 0.5);

    this.interactPrompt = this.add.container(0, 0, [background, this.interactPromptText]);
    this.interactPrompt.setVisible(false);
  }

  private createGeneratedTextures() {
    if (!this.textures.exists("office-prop-watercooler")) {
      const cooler = this.add.graphics();
      cooler.fillStyle(0xb5d6ff, 1);
      cooler.fillRoundedRect(2, 0, 12, 20, 4);
      cooler.fillStyle(0xeef7ff, 0.95);
      cooler.fillRoundedRect(4, 2, 8, 6, 3);
      cooler.fillStyle(0x6ea5ff, 1);
      cooler.fillRect(4, 8, 8, 10);
      cooler.fillStyle(0x7e5639, 1);
      cooler.fillRect(4, 20, 8, 8);
      cooler.lineStyle(2, 0x1c2430, 1);
      cooler.strokeRoundedRect(2, 0, 12, 20, 4);
      cooler.generateTexture("office-prop-watercooler", 16, 28);
      cooler.destroy();
    }

    if (!this.textures.exists("office-prop-company-board")) {
      const board = this.add.graphics();
      board.fillStyle(0x6d4f3b, 1);
      board.fillRoundedRect(0, 0, 44, 28, 4);
      board.fillStyle(0xd6b06f, 1);
      board.fillRoundedRect(3, 3, 38, 22, 3);
      board.fillStyle(0x8e6047, 1);
      board.fillRect(6, 7, 32, 2);
      board.fillRect(6, 12, 26, 2);
      board.fillRect(6, 17, 28, 2);
      board.fillStyle(0xa14940, 1);
      board.fillCircle(5, 5, 2);
      board.fillCircle(39, 5, 2);
      board.lineStyle(2, 0x2b1d16, 1);
      board.strokeRoundedRect(0, 0, 44, 28, 4);
      board.generateTexture("office-prop-company-board", 44, 28);
      board.destroy();
    }

    if (!this.textures.exists("office-prop-door")) {
      const door = this.add.graphics();
      door.fillStyle(0x5d4537, 1);
      door.fillRect(0, 0, 32, 10);
      door.fillStyle(0x1a1d24, 1);
      door.fillRect(4, 0, 24, 8);
      door.fillStyle(0xb8945e, 1);
      door.fillRect(0, 8, 32, 2);
      door.fillStyle(0x6f454c, 1);
      door.fillRoundedRect(6, 10, 20, 6, 2);
      door.fillStyle(0x94646c, 1);
      door.fillRect(8, 11, 16, 1);
      door.fillStyle(0x2d221c, 1);
      door.fillRect(0, 15, 32, 1);
      door.lineStyle(2, 0x2b1d16, 1);
      door.strokeRect(0, 0, 32, 10);
      door.lineStyle(1, 0x2b1d16, 1);
      door.strokeRoundedRect(6, 10, 20, 6, 2);
      door.generateTexture("office-prop-door", 32, 16);
      door.destroy();
    }

    if (!this.textures.exists("office-flame")) {
      const flame = this.add.graphics();
      flame.fillStyle(0xff7f3f, 1);
      flame.fillPoints(
        [
          new Phaser.Geom.Point(6, 0),
          new Phaser.Geom.Point(11, 8),
          new Phaser.Geom.Point(8, 18),
          new Phaser.Geom.Point(4, 18),
          new Phaser.Geom.Point(1, 8),
        ],
        true,
      );
      flame.fillStyle(0xffdb6e, 1);
      flame.fillPoints(
        [
          new Phaser.Geom.Point(6, 4),
          new Phaser.Geom.Point(9, 10),
          new Phaser.Geom.Point(7, 16),
          new Phaser.Geom.Point(5, 16),
          new Phaser.Geom.Point(3, 10),
        ],
        true,
      );
      flame.generateTexture("office-flame", 12, 18);
      flame.destroy();
    }
  }

  private getNearestInteractTarget(): InteractTarget | null {
    if (!this.player) {
      return null;
    }

    let nearest: InteractTarget | null = null;

    for (const actor of this.agents.values()) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        actor.sprite.x,
        actor.sprite.y,
      );

      if (!nearest || distance < nearest.distance) {
        nearest = {
          kind: "agent",
          actor,
          distance,
          prompt: `[E] Talk to ${actor.getName()}`,
        };
      }
    }

    for (const hotspot of getOfficeHotspots()) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        hotspot.x,
        hotspot.y,
      );

      if (!nearest || distance < nearest.distance) {
        nearest = {
          kind: "hotspot",
          hotspotId: hotspot.id,
          x: hotspot.x,
          y: hotspot.y,
          distance,
          prompt: hotspot.prompt,
        };
      }
    }

    return nearest;
  }

  private async walkPlayerPath(points: Array<{ x: number; y: number }>) {
    if (!this.player) {
      return false;
    }

    this.scriptedMovement = true;
    this.player.setVelocity(0, 0);

    for (const point of points) {
      await this.movePlayerToPoint(point.x, point.y);
    }

    this.scriptedMovement = false;
    this.player.anims.stop();
    this.player.setFrame(getIdleFrame(this.playerFacing));
    return true;
  }

  private async movePlayerToPoint(x: number, y: number) {
    if (!this.player) {
      return;
    }

    const deltaX = x - this.player.x;
    const deltaY = y - this.player.y;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

    if (distance < 8) {
      return;
    }

    this.playerFacing = getDirectionFromVelocity(deltaX, deltaY, this.playerFacing);
    this.player.setFlipX(this.playerFacing === "left");

    if (this.playerFacing === "up") {
      this.player.play(`${PLAYER_TEXTURE_KEY}-walk-up`, true);
    } else if (this.playerFacing === "left" || this.playerFacing === "right") {
      this.player.play(`${PLAYER_TEXTURE_KEY}-walk-side`, true);
    } else {
      this.player.play(`${PLAYER_TEXTURE_KEY}-walk-down`, true);
    }

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.player,
        x,
        y,
        duration: Math.max(220, Math.round(distance * 5.4)),
        ease: "Sine.InOut",
        onUpdate: () => {
          this.player?.setDepth((this.player?.y ?? 0) + 60);
          if (this.playerShadow && this.player) {
            this.playerShadow.setPosition(this.player.x, this.player.y - 8);
            this.playerShadow.setDepth(this.player.y + 18);
          }
        },
        onComplete: () => resolve(),
      });
    });
  }

  private createCharacterAnimations() {
    for (let index = 0; index < 6; index += 1) {
      const key = `office-char-${index}`;
      if (this.anims.exists(`${key}-walk-down`)) {
        continue;
      }

      this.anims.create({
        key: `${key}-walk-down`,
        frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2, 1] }),
        frameRate: 7,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-walk-up`,
        frames: this.anims.generateFrameNumbers(key, { frames: [7, 8, 9, 8] }),
        frameRate: 7,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-walk-side`,
        frames: this.anims.generateFrameNumbers(key, { frames: [14, 15, 16, 15] }),
        frameRate: 7,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-typing-down`,
        frames: this.anims.generateFrameNumbers(key, { frames: [3, 4] }),
        frameRate: 4,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-typing-up`,
        frames: this.anims.generateFrameNumbers(key, { frames: [10, 11] }),
        frameRate: 4,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-typing-side`,
        frames: this.anims.generateFrameNumbers(key, { frames: [17, 18] }),
        frameRate: 4,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-reading-down`,
        frames: this.anims.generateFrameNumbers(key, { frames: [5, 6] }),
        frameRate: 3,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-reading-up`,
        frames: this.anims.generateFrameNumbers(key, { frames: [12, 13] }),
        frameRate: 3,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-reading-side`,
        frames: this.anims.generateFrameNumbers(key, { frames: [19, 20] }),
        frameRate: 3,
        repeat: -1,
      });
    }
  }
}
