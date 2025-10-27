export class PowerUp {
    constructor(lane, y, size, type, assets) {
        this.lane = lane;
        this.initialY = y; // Store the initial Y position
        this.y = y;
        this.size = size;
        this.type = type;
        this.image = (type === 'shield') ? assets.powerup_shield : assets.powerup_magnet;

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
    }

    draw(ctx, laneWidth) {
        const centerX = this.lane * laneWidth + laneWidth / 2;
        const x = centerX - this.size / 2;
        ctx.drawImage(this.image, x, this.y, this.size, this.size);
    }

    getRect(laneWidth) {
        const centerX = this.lane * laneWidth + laneWidth / 2;
        const x = centerX - this.size / 2;
        let padding = this.size * 0.1;
        return { x: x + padding, y: this.y + padding, w: this.size - padding * 2, h: this.size - padding * 2 };
    }
}