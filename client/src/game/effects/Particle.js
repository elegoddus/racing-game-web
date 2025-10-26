// --- LỚP PARTICLE (HIỆU ỨNG) ---
export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3 - 1; // Hơi bay lên
        this.life = 20 + Math.random() * 20;
        this.initialLife = this.life;
        this.size = 2 + Math.random() * 4;
        this.color = color;
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= (dt / 16); // Giảm life theo dt
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.initialLife);
        ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}
