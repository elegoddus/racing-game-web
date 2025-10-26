import { GAME_CONFIG } from '../config';

// ComboEffect: manages combo text animation (scale pop, wobble) and gradient color cycling
export class ComboEffect {
    constructor() {
        // per-player state keyed by player.id
        this.state = new Map();

        // color gradients: top -> bottom
        this.colorSets = [
            ['#ffffff', '#e6e6e6'], // white
            ['#a8ff60', '#007a1f'], // green
            ['#7ecbff', '#004e9e'], // blue
            ['#fff28a', '#c78f00'], // yellow/gold
            ['#ff7b7b', '#a80000'], // red
            ['#ff9ad6', '#a80074']  // pink
        ];
    }

    // ensure state exists for player
    _ensure(playerId) {
        if (!this.state.has(playerId)) {
            this.state.set(playerId, {
                currentScale: 1.0,
                targetScale: 1.0,
                wobbleAngle: 0,
                wobbleVel: 0,
                lastTrigger: 0
            });
        }
        return this.state.get(playerId);
    }

    // Called when combo increases for a player
    trigger(player) {
        const s = this._ensure(player.id);
        const combo = player.combo || 0;
        // target scale based on combo value (capped)
        const targetScale = Math.min(1 + combo * GAME_CONFIG.COMBO_SCALE_STEP, GAME_CONFIG.COMBO_MAX_SCALE);

        // Give a pop overshoot (start bigger then shrink back to target)
        s.currentScale = Math.min(targetScale * 1.25, GAME_CONFIG.COMBO_MAX_SCALE * 1.4);
        s.targetScale = targetScale;

        // Stronger wobble depending on combo (clamped)
        const comboFactor = Math.min(combo, 10) / 10; // 0..1
        s.wobbleVel = (0.12 + 0.25 * comboFactor) * (1 + comboFactor);
        s.lastTrigger = performance.now();
    }

    update(dt) {
        const dtSeconds = dt / 1000;
        for (const [id, s] of this.state.entries()) {
            // smooth scale towards target
            const diff = s.targetScale - s.currentScale;
            s.currentScale += diff * Math.min(12 * dtSeconds, 1);

            // wobble physics (damped)
            s.wobbleAngle += s.wobbleVel * dtSeconds;
            // decay wobble velocity
            s.wobbleVel *= Math.max(0.85, 1 - 2.5 * dtSeconds);
            if (Math.abs(s.wobbleVel) < 0.0005) s.wobbleVel = 0;
        }
    }

    // draw combo text for given player (called inside clipped viewport context)
    draw(ctx, player, canvas) {
        if (!player || player.combo <= 0) return;
        const s = this._ensure(player.id);

    // Position near the right edge of the player's viewport; we'll draw the
    // combo number on top and the percent below it, both right-aligned.
    const baseX = player.viewport.w - 20; // closer to the right edge
    const baseY = Math.floor(canvas.height * 0.33);

        // compute wobble rotation (radians)
        const wobbleAngle = Math.sin(s.wobbleAngle * 8) * 6 * Math.PI / 180; // +/-6 degrees * sin(freq)

    // final scale (apply a slight horizontal stretch so the combo reads longer)
    const finalScale = s.currentScale * player.comboPulse;

        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.rotate(wobbleAngle);
        ctx.scale(finalScale, finalScale);

        // choose color set by combo blocks of 5
        const idx = Math.floor((player.combo - 1) / 5) % this.colorSets.length;
        const colors = this.colorSets[Math.max(0, idx)];

        // cache gradient per player/state to avoid creating a new gradient each frame
        const comboFont = 36; // bigger for the combo number
        const percentFont = 18; // percent shown below
        const spacing = 6; // gap between number and percent
        if (!s._cachedGradientIdx || s._cachedGradientIdx !== idx || !s._cachedGradient) {
            const g = ctx.createLinearGradient(0, -comboFont, 0, comboFont + percentFont + 12);
            g.addColorStop(0, colors[0]);
            g.addColorStop(1, colors[1]);
            s._cachedGradient = g;
            s._cachedGradientIdx = idx;
        }

        ctx.fillStyle = s._cachedGradient;
        ctx.textAlign = 'right';

        // Slightly stretch horizontally to make the text appear longer
        // draw combo number with slight horizontal stretch and drop shadow
        ctx.save();
        // shadow for depth
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.scale(1.15, 1.0);
        ctx.font = `${comboFont}px 'Noto Sans', sans-serif`;
        // Draw combo number on top (baseline positioned at -percentFont)
        ctx.fillText(`${player.combo}x`, 0, -percentFont);

        // reset shadow so percent text not overly blurred
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.restore();

        // small multiplier (percent) below the combo number
        const mult = player.getComboMultiplier();
        if (mult > 1) {
            // draw percent slightly rotated/diagonal for stylized look
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.font = `${percentFont}px 'Noto Sans', sans-serif`;
            // tilt a bit
            const tilt = -8 * Math.PI / 180; // -8 degrees
            ctx.translate(0, spacing + percentFont + 4);
            ctx.rotate(tilt);
            // add subtle shadow for percent
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(`+${(mult - 1) * 100}%`, 0, 0);
            ctx.restore();
        }

        ctx.restore();
    }
}

export default ComboEffect;
