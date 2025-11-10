class PowerUp {
    constructor(lane, y, size, type) {
        this.lane = lane;
        this.initialY = y;
        this.y = y;
        this.size = size;
        this.type = type;
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

    getRect(laneWidth) {
        const centerX = this.lane * laneWidth + laneWidth / 2;
        const x = centerX - this.size / 2;
        let padding = this.size * 0.1;
        return { x: x + padding, y: this.y + padding, w: this.size - padding * 2, h: this.size - padding * 2 };
    }
}

module.exports = PowerUp;
