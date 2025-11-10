export class Coin {
    constructor(lane, y, size, image, laneWidth) {
        this.lane = lane;
        this.initialY = y;
        this.y = y;
        this.size = size;
        this.image = image; // This is now the sprite sheet
        this.x = this.lane * laneWidth + (laneWidth - this.size) / 2;

        // Animation properties
        this.frameCount = 14; // Assume 14 frames in the sprite sheet
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 1 / 12; // 12 frames per second
        this.frameWidth = this.image.width / this.frameCount;
        this.frameHeight = this.image.height;

        // For bobbing effect
        this.bobAngle = Math.random() * Math.PI * 2;
        this.bobSpeed = 2;
        this.bobAmount = 5;
    }

    update(fallSpeed, dt) {
        const dtSeconds = dt / 1000;
        this.initialY += fallSpeed * dtSeconds;
        this.bobAngle += this.bobSpeed * dtSeconds;
        this.y = this.initialY + Math.sin(this.bobAngle) * this.bobAmount;

        // Update animation frame
        this.animationTimer += dtSeconds;
        if (this.animationTimer > this.animationSpeed) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.animationTimer = 0;
        }
    }

    draw(ctx, laneWidth) { // laneWidth is not used here but kept for consistency
        const sx = this.currentFrame * this.frameWidth;
        const sy = 0;
        ctx.drawImage(
            this.image,       // The sprite sheet
            sx,               // Source X (which frame to draw)
            sy,               // Source Y
            this.frameWidth,  // Source Width
            this.frameHeight, // Source Height
            this.x,           // Destination X
            this.y,           // Destination Y
            this.size,        // Destination Width
            this.size         // Destination Height
        );
    }

    getRect() {
        let padding = this.size * 0.1;
        return { x: this.x + padding, y: this.y + padding, w: this.size - padding * 2, h: this.size - padding * 2 };
    }
}