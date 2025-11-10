class Obstacle {
    constructor(lane, y, w, h, type) {
        this.lane = lane;
        this.y = y;
        this.w = w;
        this.h = h;
        this.type = type;
        this.isNearMiss = false;
    }
    update(fallSpeed, dt) {
        this.y += fallSpeed * (dt / 1000);
    }
    getRect(laneWidth) {
        const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
        let padding = this.w * 0.15;
        return { x: x + padding, y: this.y + padding, w: this.w - padding * 2, h: this.h - padding * 2 };
    }
}

module.exports = Obstacle;
