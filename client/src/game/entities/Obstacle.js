export class Obstacle {
    constructor(lane, y, w, h, image) {
        this.lane = lane;
        this.y = y;
        this.w = w;
        this.h = h;
        this.image = image;
        this.nearMissedBy = [];
    }
    update(fallSpeed, dt) {
        this.y += fallSpeed * (dt / 1000);
    }
    draw(ctx, laneWidth) {
        const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
        ctx.drawImage(this.image, x, this.y, this.w, this.h);
    }
    getRect(laneWidth) {
        const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
        let padding = this.w * 0.15;
        return { x: x + padding, y: this.y + padding, w: this.w - padding * 2, h: this.h - padding * 2 };
    }
    getNearMissRect(laneWidth) {
        const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
        return { x: x - 20, y: this.y - 20, w: this.w + 40, h: this.h + 40 };
    }
}