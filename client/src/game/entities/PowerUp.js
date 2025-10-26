// --- LỚP POWERUP ---
export class PowerUp {
    constructor(lane, y, size, type, assets) {
        this.lane = lane;
        this.y = y;
        this.size = size;
        this.type = type;
        this.image = (type === 'shield') ? assets.powerup_shield : assets.powerup_magnet;
    }
    update(fallSpeed, dt) {
        this.y += fallSpeed * (dt / 1000);
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
