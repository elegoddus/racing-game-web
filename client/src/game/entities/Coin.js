// --- LỚP COIN ---
export class Coin {
    constructor(lane, y, size, image, laneWidth) {
        this.lane = lane;
        this.y = y;
        this.size = size;
        this.image = image;
        this.x = this.lane * laneWidth + (laneWidth - this.size) / 2;
    }
    update(fallSpeed, dt) {
        this.y += fallSpeed * (dt / 1000);
    }
    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, this.size, this.size);
    }
    getRect() {
        let padding = this.size * 0.1;
        return { x: this.x + padding, y: this.y + padding, w: this.size - padding * 2, h: this.size - padding * 2 };
    }
}
