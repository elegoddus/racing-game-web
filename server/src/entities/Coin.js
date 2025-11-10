class Coin {
    constructor(lane, y, size, laneWidth) {
        this.id = `${lane}-${y}-${Math.random()}`; // Add a unique ID
        this.lane = lane;
        this.initialY = y;
        this.y = y;
        this.size = size;
        this.x = this.lane * laneWidth + (laneWidth - this.size) / 2;
        
        // Bobbing effect properties remain
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

    getRect() {
        let padding = this.size * 0.1;
        return { x: this.x + padding, y: this.y + padding, w: this.size - padding * 2, h: this.size - padding * 2 };
    }
}

module.exports = Coin;
