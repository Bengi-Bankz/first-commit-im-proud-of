import { Container, Sprite, Texture } from "pixi.js";
import { RoundedBox } from "../../ui/RoundedBox";

export class MainScreen extends Container {
  public static assetBundles = ["main"];
  private bgBox: RoundedBox;
  private cupsContainer: Container;
  private prizeSprite: Sprite;
  private playButton: Sprite;
  private cupSprites: Sprite[] = [];
  private animationInProgress = false;
  private winningCupIndex: number = 0;
  private pauseIcon!: Sprite;
  private settingsIcon!: Sprite;

  constructor() {
    super();
    // Add a RoundedBox as background (uses rounded-rectangle from atlas)
    this.bgBox = new RoundedBox({ width: 600, height: 600 });
    this.addChild(this.bgBox);

    // Add pause icon (top left)
    const pauseTexture = Texture.from("icon-pause.png");
    this.pauseIcon = new Sprite({ texture: pauseTexture, anchor: 0 });
    this.pauseIcon.x = 20;
    this.pauseIcon.y = 20;
    this.pauseIcon.eventMode = "static";
    this.pauseIcon.cursor = "pointer";
    // this.pauseIcon.on("pointertap", () => { /* Pause logic here */ });

    // Add settings icon (top right)
    const settingsTexture = Texture.from("icon-settings.png");
    this.settingsIcon = new Sprite({ texture: settingsTexture, anchor: 1 });
    // Position will be set in resize

    // Add a container for the cups
    this.cupsContainer = new Container();
    this.addChild(this.cupsContainer);

    // Add prize sprite at the lowest z-index
    const prizeTexture = Texture.from("prize.png");
    this.prizeSprite = new Sprite({ texture: prizeTexture, anchor: 0.5 });
    this.cupsContainer.addChild(this.prizeSprite);
    // Add 3 red cups above the prize
    const cupTexture = Texture.from("redcup.png");
    for (let i = 0; i < 3; i++) {
      const cup = new Sprite({ texture: cupTexture, anchor: 0.5 });
      this.cupsContainer.addChild(cup);
      this.cupSprites.push(cup);
    }

    // Add play button (centered below cups)
    const playBtnTexture = Texture.from("button.png"); // Use the correct frame name from your sprite sheet (ui.png)
    this.playButton = new Sprite({ texture: playBtnTexture, anchor: 0.5 });
    this.playButton.eventMode = "static";
    this.playButton.cursor = "pointer";
    this.playButton.on("pointertap", () => this.startGame());
    this.addChild(this.playButton);

    // Initially cups are not interactive
    this.setCupsInteractive(false);

    // ...existing code...

    // Make icons bigger
    this.pauseIcon.scale.set(1.8);
    this.settingsIcon.scale.set(1.8);
    // Ensure icons are direct children of MainScreen and above the background
    this.addChild(this.pauseIcon);
    this.addChild(this.settingsIcon);
  }

  private setCupsInteractive(enabled: boolean) {
    this.cupSprites.forEach((cup, idx) => {
      cup.eventMode = enabled ? "static" : "none";
      cup.cursor = enabled ? "pointer" : "auto";
      cup.removeAllListeners();
      if (enabled) {
        cup.on("pointertap", () => this.onCupSelected(idx));
      }
    });
  }

  private startGame() {
    if (this.animationInProgress) return;
    this.animationInProgress = true;
    this.setCupsInteractive(false);
    this.runIntroAnimation().then(() => {
      this.setCupsInteractive(true);
      this.animationInProgress = false;
    });
  }

  private onCupSelected(idx: number) {
    this.setCupsInteractive(false);
    // Placeholder: randomly pick a winning cup for demo
    if (this.cupSprites.length === 0) return;
    if (this.prizeSprite) this.prizeSprite.visible = false;
    this.winningCupIndex = Math.floor(Math.random() * this.cupSprites.length);
    if (idx === this.winningCupIndex) {
      // Win: reveal prize under selected cup
      this.revealPrize(idx, true);
    } else {
      // Lose: reveal all cups, show prize under winning cup
      this.revealPrize(this.winningCupIndex, false);
    }
  }

  private async revealPrize(idx: number, isWin: boolean) {
    const cup = this.cupSprites[idx];
    if (!cup) return;
    // Animate cup up
    await new Promise((r) => setTimeout(r, 200));
    await new Promise<void>((resolve) => {
      const startY = cup.y;
      const endY = startY - 120;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 350);
        cup.y = startY + (endY - startY) * t;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    // Show prize under this cup if win, or under winning cup if lose
    if (this.prizeSprite) {
      this.prizeSprite.x = cup.x;
      this.prizeSprite.y = cup.y + cup.height * cup.scale.y * 0.45;
      this.prizeSprite.visible = true;
    }
    if (!isWin) {
      // Animate up all cups to show the winner
      for (let i = 0; i < this.cupSprites.length; i++) {
        if (i !== idx) {
          const otherCup = this.cupSprites[i];
          await new Promise<void>((resolve) => {
            const startY = otherCup.y;
            const endY = startY - 120;
            const start = performance.now();
            const step = (now: number) => {
              const t = Math.min(1, (now - start) / 350);
              otherCup.y = startY + (endY - startY) * t;
              if (t < 1) requestAnimationFrame(step);
              else resolve();
            };
            requestAnimationFrame(step);
          });
        }
      }
    }
    // TODO: Add win animation if isWin
  }

  /** Runs the intro animation sequence for the cups and prize */
  private async runIntroAnimation() {
    const cupSprites = this.cupSprites;
    const numCups = cupSprites.length;
    const middleIndex = Math.floor(numCups / 2);
    const middleCup = cupSprites[middleIndex];
    if (!middleCup) return;
    // Helper to animate a cup up/down
    const animateCup = (cup: Sprite, up = true, duration = 350) => {
      return new Promise<void>((resolve) => {
        const startY = cup.y;
        const endY = up ? startY - 120 : startY;
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          cup.y = startY + (endY - startY) * t;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    };
    // Helper to swap two cups
    const swapCups = (a: Sprite, b: Sprite, duration = 350) => {
      return new Promise<void>((resolve) => {
        const startAX = a.x,
          startBX = b.x;
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          a.x = startAX + (startBX - startAX) * t;
          b.x = startBX + (startAX - startBX) * t;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    };
    // Sequence: up, down (show diamond), then hide diamond before shuffle
    // Always reset cup position after up/down
    const originalY = middleCup.y;
    await animateCup(middleCup, true); // up
    await animateCup(middleCup, false); // down
    middleCup.y = originalY;
    // Hide the diamond (prize) before shuffling
    if (this.prizeSprite) this.prizeSprite.visible = false;
    await new Promise((r) => setTimeout(r, 200));
    // Shuffle sequence
    await swapCups(cupSprites[0], cupSprites[1]); // swap 1
    await swapCups(cupSprites[1], cupSprites[2]); // swap 2
    await swapCups(cupSprites[0], cupSprites[2]); // swap 3

    // Randomly select a cup for the second reveal (diamond location)
    const revealCup = cupSprites[Math.floor(Math.random() * cupSprites.length)];
    if (this.prizeSprite && revealCup) {
      this.prizeSprite.x = revealCup.x;
      this.prizeSprite.y =
        revealCup.y + revealCup.height * revealCup.scale.y * 0.45;
      this.prizeSprite.visible = true;
    }
    await animateCup(revealCup, true); // up (reveal diamond location)
    await new Promise((r) => setTimeout(r, 200));
    await animateCup(revealCup, false); // down (hide diamond again)
    revealCup.y = originalY;
    if (this.prizeSprite) this.prizeSprite.visible = false;
    await new Promise((r) => setTimeout(r, 400)); // pause
    // 6 swaps
    for (let i = 0; i < 6; i++) {
      const a = cupSprites[Math.floor(Math.random() * numCups)];
      let b;
      do {
        b = cupSprites[Math.floor(Math.random() * numCups)];
      } while (b === a);
      await swapCups(a, b);
    }
    // 2 more swaps
    await swapCups(cupSprites[0], cupSprites[2]);
    await swapCups(cupSprites[1], cupSprites[0]);
    // At the end, keep the diamond hidden for player pick-up
    if (this.prizeSprite) this.prizeSprite.visible = false;
  }

  /** Resize the background to always cover the viewport */
  public resize(width: number, height: number) {
    // Position pause icon (top left, moved down for visibility)
    if (this.pauseIcon) {
      this.pauseIcon.x = 20;
      this.pauseIcon.y = 40;
    }
    // Position settings icon (top right, moved much further down)
    if (this.settingsIcon) {
      this.settingsIcon.x = width - 20;
      this.settingsIcon.y = 40 * 3; // 3 times further down than pause icon
    }
    // Center play button horizontally, 7/8ths down the screen
    if (this.playButton) {
      this.playButton.x = width * 0.5;
      this.playButton.y = height * 0.875;
    }
    // Fill the entire viewport
    this.bgBox.width = width;
    this.bgBox.height = height;
    this.bgBox.x = width * 0.5;
    this.bgBox.y = height * 0.5;

    // Layout cups group in the center, spaced evenly
    const cupSpacing = Math.min(300, width / 3);
    const cupY = height * 0.5;
    // Only lay out cups (use this.cupSprites)
    const cupSprites = this.cupSprites;
    const numCups = cupSprites.length;
    const groupWidth = (numCups - 1) * cupSpacing;
    for (let i = 0; i < numCups; i++) {
      const cup = cupSprites[i];
      cup.x = width * 0.5 - groupWidth / 2 + i * cupSpacing;
      cup.y = cupY;
      // Scale cups to fit larger (e.g., 250px tall max)
      if (cup.texture.height > 0) {
        const scale = Math.min(2, 250 / cup.texture.height);
        cup.scale.set(scale);
      }
    }
    // Position prize under the middle cup
    const middleIndex = Math.floor(numCups / 2);
    const middleCup = cupSprites[middleIndex];
    if (middleCup && this.prizeSprite) {
      this.prizeSprite.x = middleCup.x;
      this.prizeSprite.y =
        middleCup.y + middleCup.height * middleCup.scale.y * 0.45;
      this.prizeSprite.scale.set(0.7);
    }
  }
}
