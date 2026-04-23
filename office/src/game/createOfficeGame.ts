import Phaser from "phaser";
import { OFFICE_WORLD_HEIGHT, OFFICE_WORLD_WIDTH } from "./layout/officeLayout";
import { OfficeScene } from "./scenes/OfficeScene";

export interface CreateOfficeGameCallbacks {
  onInteractAgent?: (agentId: string | null) => void;
  onInteractHotspot?: (hotspotId: string) => void;
}

export function createOfficeGame(
  parent: HTMLElement,
  callbacks: CreateOfficeGameCallbacks = {},
) {
  const scene = new OfficeScene();
  scene.onInteractAgent = callbacks.onInteractAgent;
  scene.onInteractHotspot = callbacks.onInteractHotspot;

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: OFFICE_WORLD_WIDTH,
    height: OFFICE_WORLD_HEIGHT,
    pixelArt: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: OFFICE_WORLD_WIDTH,
      height: OFFICE_WORLD_HEIGHT,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    render: {
      roundPixels: true,
    },
    scene: [scene],
  });
}
