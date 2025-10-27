import { drawNeonText } from '../utils.js';

export class FloatingText {
    constructor(text, x, y, color, size, viewportX, shakeIntensity = 0, rotation = 0, pulseFrequency = 0) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.initialSize = size;
        this.size = size;
        this.viewportX = viewportX;
        this.life = 1.0;
        this.vy = -60;
        this.shakeIntensity = shakeIntensity;
        this.rotation = rotation;
        this.pulseFrequency = pulseFrequency;
        this.pulseTimer = 0;
    }

    update(dt) {
        const dtSeconds = dt / 1000;
        this.y += this.vy * dtSeconds;
        this.life -= dtSeconds;

        if (this.pulseFrequency > 0) {
            this.pulseTimer += dtSeconds;
            const pulseAmount = Math.sin(this.pulseTimer * this.pulseFrequency) * (this.initialSize * 0.2); // Pulse by 20% of original size
            this.size = this.initialSize + pulseAmount;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.viewportX, 0);

        let shakeX = 0;
        let shakeY = 0;
        if (this.shakeIntensity > 0 && this.life > 0) {
            shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        }
        
        // Apply rotation and translation
        ctx.translate(this.x + shakeX, this.y + shakeY);
        ctx.rotate(this.rotation);
        
        const alpha = Math.max(0, this.life);
        const fillColor = `rgba(${this.color}, ${alpha})`;
        const glowColor = `rgba(255, 255, 255, ${alpha * 0.5})`;
        
        // Draw text at the new rotated origin (0,0)
        drawNeonText(ctx, this.text, 0, 0, this.size, fillColor, glowColor, 'center', 2);
        
        ctx.restore();
    }
}
