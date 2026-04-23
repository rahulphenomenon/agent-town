import Phaser from "phaser";
import { getRouteForZones, OFFICE_PIXEL_SCALE } from "@/game/layout/officeLayout";
import type { OfficeAgentView } from "@/types/office";

const ROUTE_STEP_MS = 380;
const CHARACTER_VARIANTS = 6;
const FIRE_BURN_DURATION = 5000;
const FIRE_FADE_DURATION = 540;
const FIRE_BURST_COUNT = 5;
const FIRE_EMBER_COUNT = 6;
const SUSTAINED_FLAME_COUNT = 4;

type FacingDirection = "up" | "down" | "left" | "right";
type AnimationMode = "walk" | "typing" | "reading";

function getIdleFrame(direction: FacingDirection) {
  if (direction === "up") {
    return 8;
  }

  if (direction === "left" || direction === "right") {
    return 15;
  }

  return 1;
}

function hashCharacterVariant(agentId: string) {
  let total = 0;
  for (const char of agentId) {
    total += char.charCodeAt(0);
  }

  return total % CHARACTER_VARIANTS;
}

function resolveAnimationName(
  textureKey: string,
  mode: AnimationMode,
  direction: FacingDirection,
) {
  if (direction === "left" || direction === "right") {
    return `${textureKey}-${mode}-side`;
  }

  return `${textureKey}-${mode}-${direction}`;
}

function getDirectionFromDelta(deltaX: number, deltaY: number): FacingDirection {
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX < 0 ? "left" : "right";
  }

  return deltaY < 0 ? "up" : "down";
}

function getZoneFacing(zoneId: string): FacingDirection {
  if (zoneId === "watercooler") {
    return "right";
  }

  if (zoneId === "couch") {
    return "left";
  }

  if (zoneId === "chat-nook") {
    return "down";
  }

  return "up";
}

function getBadgeText(view: OfficeAgentView) {
  if (view.intent.mode === "needs_attention") {
    return "!";
  }

  if (view.intent.mode === "paused_asleep") {
    return "Zz";
  }

  return "";
}

function getIdleAnimationMode(view: OfficeAgentView): AnimationMode {
  if (view.intent.mode === "working_at_desk" || view.intent.mode === "needs_attention") {
    return "typing";
  }

  if (view.intent.mode === "paused_asleep") {
    return "reading";
  }

  return "walk";
}

export class AgentActor {
  readonly agentId: string;
  readonly sprite: Phaser.GameObjects.Sprite;

  private readonly textureKey: string;

  private readonly shadow: Phaser.GameObjects.Ellipse;

  private readonly badge: Phaser.GameObjects.Text;

  private readonly nameplate: Phaser.GameObjects.Text;

  private zoneId: string;

  private destinationZoneId: string;

  private movementTween: Phaser.Tweens.Tween | null = null;

  private pendingView: OfficeAgentView | null = null;

  private terminating = false;

  private fireSequenceActive = false;

  constructor(scene: Phaser.Scene, agentId: string, x: number, y: number, zoneId: string) {
    this.agentId = agentId;
    this.zoneId = zoneId;
    this.destinationZoneId = zoneId;
    const preferredTextureKey = `office-char-${hashCharacterVariant(agentId)}`;
    this.textureKey = scene.textures.exists(preferredTextureKey) ? preferredTextureKey : "office-char-0";

    this.shadow = scene.add.ellipse(x, y - 6, 28, 12, 0x11131b, 0.3).setDepth(y + 32);
    this.sprite = scene.add
      .sprite(x, y, this.textureKey, 1)
      .setOrigin(0.5, 1)
      .setScale(OFFICE_PIXEL_SCALE)
      .setDepth(y + 64);
    this.badge = scene.add
      .text(x, y - 72, "", {
        fontFamily: "Monaco, Menlo, monospace",
        fontSize: "14px",
        color: "#fff8dc",
        backgroundColor: "#12141d",
        padding: { x: 5, y: 1 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(y + 112)
      .setVisible(false);
    this.nameplate = scene.add
      .text(x, y - 92, "", {
        fontFamily: "Monaco, Menlo, monospace",
        fontSize: "12px",
        color: "#fff8dc",
        backgroundColor: "#151924",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(y + 116);
  }

  destroy() {
    this.stopMovement();
    this.shadow.destroy();
    this.badge.destroy();
    this.nameplate.destroy();
    this.sprite.destroy();
  }

  getZoneId() {
    return this.destinationZoneId || this.zoneId;
  }

  getApproachPoint() {
    return {
      x: this.sprite.x,
      y: this.sprite.y + 42,
    };
  }

  getName() {
    return this.pendingView?.name ?? "Agent";
  }

  playFireSequence(onComplete?: () => void) {
    if (this.fireSequenceActive) {
      return;
    }

    this.fireSequenceActive = true;
    this.terminating = true;
    this.stopMovement();
    this.sprite.anims.stop();
    this.sprite.setTint(0xffd88a);

    const scene = this.sprite.scene;
    const startX = this.sprite.x;
    const startY = this.sprite.y;
    const startDepth = this.sprite.depth;
    const completedState = { done: false };
    const finish = () => {
      if (completedState.done) {
        return;
      }

      completedState.done = true;
      this.sprite.clearTint();
      this.sprite.setVisible(false);
      this.shadow.setVisible(false);
      this.badge.setVisible(false);
      this.nameplate.setVisible(false);
      onComplete?.();
    };

    const makeScale = (amount: number) => OFFICE_PIXEL_SCALE * amount;
    const burstFlames = Array.from({ length: FIRE_BURST_COUNT }, (_, index) => {
      const angle = (index / FIRE_BURST_COUNT) * Math.PI * 2;
      const flame = scene.add
        .image(startX + Math.cos(angle) * 6, startY - 18 + Math.sin(angle) * 4, "office-flame")
        .setOrigin(0.5, 1)
        .setScale(makeScale(0.95 - index * 0.04))
        .setRotation((Math.random() - 0.5) * 0.35)
        .setAlpha(0.98)
        .setDepth(startDepth + 12);

      scene.tweens.add({
        targets: flame,
        x: startX + Math.cos(angle) * (24 + index * 3),
        y: startY - 28 - index * 6,
        alpha: 0,
        scaleX: makeScale(0.7),
        scaleY: makeScale(1.3),
        angle: flame.angle + (index % 2 === 0 ? 12 : -12),
        duration: 320 + index * 60,
        delay: index * 18,
        ease: "Quad.Out",
      });

      return flame;
    });

    const embers = Array.from({ length: FIRE_EMBER_COUNT }, (_, index) => {
      const ember = scene.add
        .circle(startX + (index - 2.5) * 4, startY - 10, 2.5, 0xffcf73, 0.95)
        .setStrokeStyle(1, 0xff8d3a, 0.8)
        .setDepth(startDepth + 14);

      scene.tweens.add({
        targets: ember,
        x: startX + (index - 2.5) * 12 + (index % 2 === 0 ? -10 : 14),
        y: startY - 58 - index * 4,
        alpha: 0,
        scale: 0.35,
        duration: 420 + index * 35,
        delay: 90 + index * 25,
        ease: "Quad.Out",
        onComplete: () => ember.destroy(),
      });

      return ember;
    });

    const sustainedFlames = Array.from({ length: SUSTAINED_FLAME_COUNT }, (_, index) => {
      const flameOffsets = [
        { x: -12, y: 10 },
        { x: -4, y: 4 },
        { x: 6, y: 6 },
        { x: 14, y: 11 },
      ] as const;
      const offset = flameOffsets[index] ?? { x: 0, y: 8 };
      const flame = scene.add
        .image(startX + offset.x, startY + offset.y, "office-flame")
        .setOrigin(0.5, 1)
        .setScale(makeScale(0.88 - index * 0.06))
        .setRotation((index - 1.5) * 0.09)
        .setAlpha(0.84)
        .setDepth(startDepth + 10)
        .setBlendMode(Phaser.BlendModes.ADD);

      scene.tweens.add({
        targets: flame,
        y: flame.y - (10 + index * 2),
        alpha: 0.36,
        scaleX: makeScale(0.72 - index * 0.04),
        scaleY: makeScale(1.12 - index * 0.03),
        angle: flame.angle + (index % 2 === 0 ? 10 : -10),
        duration: 420 + index * 50,
        repeat: Math.ceil(FIRE_BURN_DURATION / (420 + index * 50)),
        yoyo: true,
        ease: "Sine.InOut",
      });

      return flame;
    });

    const flash = scene.add
      .ellipse(startX, startY - 18, 18, 8, 0xfff2c6, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(startDepth + 16);

    scene.tweens.add({
      targets: flash,
      x: startX,
      y: startY - 24,
      width: 48,
      height: 22,
      alpha: 0,
      duration: 140,
      ease: "Quad.Out",
      onComplete: () => flash.destroy(),
    });

    scene.tweens.add({
      targets: this.shadow,
      x: startX + 3,
      y: startY + 18,
      scaleX: 0.46,
      scaleY: 0.3,
      alpha: 0.14,
      duration: 280,
      ease: "Quad.InOut",
    });

    scene.tweens.add({
      targets: [this.badge, this.nameplate],
      y: [this.badge.y - 6, this.nameplate.y - 8],
      alpha: 0,
      duration: 240,
      ease: "Quad.Out",
    });

    scene.tweens.add({
      targets: this.sprite,
      x: startX + 10,
      y: startY - 8,
      angle: 8,
      scaleX: OFFICE_PIXEL_SCALE * 1.08,
      scaleY: OFFICE_PIXEL_SCALE * 0.9,
      alpha: 1,
      duration: 110,
      ease: "Quad.Out",
      onUpdate: () => {
        this.syncDecorationPosition();
      },
      onComplete: () => {
        scene.tweens.add({
          targets: this.sprite,
          x: startX + 4,
          y: startY - 5,
          angle: -3,
          scaleX: OFFICE_PIXEL_SCALE * 1.03,
          scaleY: OFFICE_PIXEL_SCALE * 0.96,
          duration: 260,
          yoyo: true,
          repeat: Math.ceil(FIRE_BURN_DURATION / 260) - 1,
          ease: "Sine.InOut",
          onUpdate: () => {
            this.syncDecorationPosition();
          },
        });

        scene.time.delayedCall(FIRE_BURN_DURATION, () => {
          scene.tweens.killTweensOf(this.sprite);
          scene.tweens.killTweensOf(this.shadow);
          sustainedFlames.forEach((flame) => scene.tweens.killTweensOf(flame));

          scene.tweens.add({
            targets: this.shadow,
            x: startX + 10,
            y: startY + 22,
            scaleX: 0.2,
            scaleY: 0.16,
            alpha: 0,
            duration: FIRE_FADE_DURATION,
            ease: "Quad.In",
          });

          scene.tweens.add({
            targets: sustainedFlames,
            y: (_target: unknown, target: Phaser.GameObjects.Image) => target.y - 18,
            alpha: 0,
            scaleX: makeScale(0.5),
            scaleY: makeScale(0.8),
            duration: FIRE_FADE_DURATION,
            ease: "Quad.In",
            onComplete: () => {
              sustainedFlames.forEach((flame) => flame.destroy());
            },
          });

          scene.tweens.add({
            targets: this.sprite,
            x: startX + 16,
            y: startY + 72,
            angle: 16,
            scaleX: OFFICE_PIXEL_SCALE * 0.34,
            scaleY: OFFICE_PIXEL_SCALE * 0.34,
            alpha: 0,
            duration: FIRE_FADE_DURATION,
            ease: "Quad.In",
            onUpdate: () => {
              this.syncDecorationPosition();
            },
            onComplete: () => {
              burstFlames.forEach((flame) => flame.destroy());
              embers.forEach((ember) => ember.destroy());
              finish();
            },
          });
        });
      },
    });
  }

  sync(view: OfficeAgentView) {
    if (this.terminating) {
      return;
    }

    this.pendingView = view;
    this.syncBadge(view);
    this.nameplate.setText(view.name);

    if (view.intent.mode === "terminated") {
      this.playFireSequence();
      return;
    }

    if (view.intent.targetZone === this.zoneId && this.movementTween == null) {
      this.destinationZoneId = this.zoneId;
      this.applyIdleState(view);
      return;
    }

    if (view.intent.targetZone === this.destinationZoneId && this.movementTween != null) {
      return;
    }

    const route = getRouteForZones(this.zoneId, view.intent.targetZone);
    const nextSteps = route.slice(1);

    if (nextSteps.length === 0) {
      this.destinationZoneId = this.zoneId;
      this.applyIdleState(view);
      return;
    }

    this.stopMovement();
    this.destinationZoneId = view.intent.targetZone;
    this.moveAlongRoute(nextSteps, 0);
  }

  private moveAlongRoute(steps: Array<{ id: string; x: number; y: number }>, index: number) {
    if (index >= steps.length) {
      this.zoneId = this.destinationZoneId;
      this.movementTween = null;
      this.applyIdleState(this.pendingView);
      return;
    }

    const next = steps[index];
    const direction = getDirectionFromDelta(next.x - this.sprite.x, next.y - this.sprite.y);
    this.playAnimation("walk", direction);

    this.movementTween = this.sprite.scene.tweens.add({
      targets: this.sprite,
      x: next.x,
      y: next.y,
      duration: ROUTE_STEP_MS,
      ease: "Sine.InOut",
      onUpdate: () => {
        this.syncDecorationPosition();
      },
      onComplete: () => {
        this.zoneId = next.id;
        this.moveAlongRoute(steps, index + 1);
      },
    });
  }

  private applyIdleState(view: OfficeAgentView | null) {
    if (!view) {
      return;
    }

    this.sprite.clearTint();
    this.sprite.setAlpha(view.intent.mode === "paused_asleep" ? 0.9 : 1);

    if (view.intent.mode === "needs_attention") {
      this.sprite.setTint(0xffd6c9);
    }

    const animationMode = getIdleAnimationMode(view);
    const facing = getZoneFacing(view.intent.targetZone);

    if (animationMode === "walk") {
      this.setStaticPose(facing);
    } else {
      this.playAnimation(animationMode, facing);
    }

    this.syncDecorationPosition();
  }

  private playAnimation(mode: AnimationMode, direction: FacingDirection) {
    const animationName = resolveAnimationName(this.textureKey, mode, direction);

    this.sprite.setFlipX(direction === "left");
    this.sprite.play(animationName, true);
  }

  private syncBadge(view: OfficeAgentView) {
    const badgeText = getBadgeText(view);
    this.badge.setText(badgeText);
    this.badge.setVisible(badgeText.length > 0);
    this.badge.setBackgroundColor(view.intent.mode === "needs_attention" ? "#7c1d1d" : "#2f2559");
  }

  private syncDecorationPosition() {
    const spriteX = this.sprite.x;
    const spriteY = this.sprite.y;

    this.shadow.setPosition(spriteX, spriteY - 6);
    this.shadow.setDepth(spriteY + 24);
    this.sprite.setDepth(spriteY + 64);
    this.nameplate.setPosition(spriteX, spriteY - 88);
    this.nameplate.setDepth(spriteY + 114);
    this.badge.setPosition(spriteX, spriteY - 70);
    this.badge.setDepth(spriteY + 112);
  }

  private stopMovement() {
    this.movementTween?.remove();
    this.movementTween = null;
  }

  private setStaticPose(direction: FacingDirection) {
    this.sprite.anims.stop();
    this.sprite.setFlipX(direction === "left");
    this.sprite.setFrame(getIdleFrame(direction));
  }
}
