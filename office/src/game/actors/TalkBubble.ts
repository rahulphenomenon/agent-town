import Phaser from "phaser";

export class TalkBubble {
  private readonly bubble: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.bubble = scene.add.text(0, 0, "…", {
      color: "#111827",
      backgroundColor: "#fef3c7",
      padding: { x: 4, y: 2 },
    });
    this.bubble.setDepth(40);
    this.bubble.setVisible(false);
  }

  placeBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
    this.bubble.setPosition((a.x + b.x) / 2, Math.min(a.y, b.y) - 24);
    this.bubble.setVisible(true);
  }

  hide() {
    this.bubble.setVisible(false);
  }
}
