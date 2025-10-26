import { drawNeonText } from '../utils.js';

// --- LỚP FLOATING TEXT (HIỆU ỨNG CHỮ BAY) ---
export class FloatingText {
    constructor(text, x, y, color, size, viewportX) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.viewportX = viewportX; // Viewport của người chơi nào đã tạo ra nó
        this.life = 1.0; // Tồn tại trong 1 giây
        this.vy = -60; // Tốc độ bay lên
    }

    update(dt) {
        const dtSeconds = dt / 1000;
        this.y += this.vy * dtSeconds;
        this.life -= dtSeconds;
    }

    draw(ctx) {
        // Chỉ vẽ trong viewport của người chơi tương ứng
        ctx.save();
        ctx.translate(this.viewportX, 0);
        const alpha = Math.max(0, this.life);
        const fillColor = `rgba(${this.color}, ${alpha})`;
        const glowColor = `rgba(255, 255, 255, ${alpha * 0.5})`;
    drawNeonText(ctx, this.text, this.x, this.y, `${this.size}px 'Noto Sans'`, fillColor, glowColor, 'center', 2);
        ctx.restore();
    }
}
