import Phaser from "phaser";
import { getRouteForZones } from "@/game/layout/officeLayout";
import type { OfficeAgentView } from "@/types/office";

const DEFAULT_FILL = 0x2563eb;
const NEEDS_ATTENTION_FILL = 0xdc2626;
const PAUSED_FILL = 0x7c3aed;
const ROUTE_STEP_MS = 320;

export class AgentActor {
  readonly agentId: string;
  readonly sprite: Phaser.GameObjects.Rectangle;

  private zoneId: string;

  private movementTween: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain | null = null;

  constructor(scene: Phaser.Scene, agentId: string, x: number, y: number, zoneId: string) {
    this.agentId = agentId;
    this.zoneId = zoneId;
    this.sprite = scene.add.rectangle(x, y, 14, 18, DEFAULT_FILL).setOrigin(0.5, 1).setDepth(30);
  }

  sync(view: OfficeAgentView) {
    if (view.intent.mode === "terminated") {
      this.stopMovement();
      this.sprite.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        angle: 18,
        duration: 450,
        onComplete: () => this.sprite.destroy(),
      });
      return;
    }

    this.sprite.setFillStyle(
      view.intent.mode === "needs_attention"
        ? NEEDS_ATTENTION_FILL
        : view.intent.mode === "paused_asleep"
          ? PAUSED_FILL
          : DEFAULT_FILL,
    );

    if (view.intent.targetZone === this.zoneId) {
      return;
    }

    const route = getRouteForZones(this.zoneId, view.intent.targetZone);
    const nextSteps = route.slice(1);
    if (nextSteps.length === 0) {
      return;
    }

    this.stopMovement();
    this.movementTween = this.sprite.scene.tweens.chain({
      targets: this.sprite,
      tweens: nextSteps.map((step) => ({
        x: step.x,
        y: step.y,
        duration: ROUTE_STEP_MS,
        ease: "Sine.InOut",
      })),
      onComplete: () => {
        this.movementTween = null;
      },
    });

    this.zoneId = nextSteps.at(-1)?.id ?? this.zoneId;
  }

  private stopMovement() {
    this.movementTween?.remove();
    this.movementTween = null;
  }
}
