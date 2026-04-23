import Phaser from "phaser";

export class TalkBubble {
  private readonly container: Phaser.GameObjects.Container;

  private readonly floatTween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    const bubble = scene.add.graphics();
    bubble.fillStyle(0xfff3cc, 1);
    bubble.fillRoundedRect(-18, -12, 36, 24, 6);
    bubble.lineStyle(2, 0x1b1d26, 1);
    bubble.strokeRoundedRect(-18, -12, 36, 24, 6);
    bubble.fillTriangle(-4, 10, 4, 10, 0, 18);
    bubble.lineStyle(2, 0x1b1d26, 1);
    bubble.strokeTriangle(-4, 10, 4, 10, 0, 18);

    const text = scene.add.text(0, -1, "...", {
      fontFamily: "Monaco, Menlo, monospace",
      fontSize: "14px",
      color: "#1b1d26",
    });
    text.setOrigin(0.5, 0.5);

    this.container = scene.add.container(0, 0, [bubble, text]);
    this.container.setDepth(200);
    this.container.setVisible(false);

    this.floatTween = scene.tweens.add({
      targets: this.container,
      y: "-=5",
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
      paused: true,
    });
  }

  placeBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
    this.container.setPosition((a.x + b.x) / 2, Math.min(a.y, b.y) - 64);
    this.container.setVisible(true);
    this.floatTween.resume();
  }

  hide() {
    this.container.setVisible(false);
    this.floatTween.pause();
  }
}
