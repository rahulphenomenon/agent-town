import Phaser from "phaser";
import { OfficeScene } from "./scenes/OfficeScene";

export interface CreateOfficeGameCallbacks {
  onInteractAgent?: (agentId: string | null) => void;
}

export function createOfficeGame(
  parent: HTMLElement,
  callbacks: CreateOfficeGameCallbacks = {},
) {
  const scene = new OfficeScene();
  scene.onInteractAgent = callbacks.onInteractAgent;

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 768,
    height: 384,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 768,
      height: 384,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: [scene],
  });
}
