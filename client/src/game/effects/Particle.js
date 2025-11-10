export class Particle {
    constructor(x, y, color, size = null, vx = null, vy = null, life = null) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size !== null ? size : 2 + Math.random() * 4;
        this.vx = vx !== null ? vx : (Math.random() - 0.5) * 3;
        this.vy = vy !== null ? vy : (Math.random() - 0.5) * 3 - 1;
        this.life = life !== null ? life : 20 + Math.random() * 20;
        this.initialLife = this.life;
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= (dt / 16);
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.initialLife);
        ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}