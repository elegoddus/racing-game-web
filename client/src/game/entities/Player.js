import { GAME_CONFIG, LANE_COUNT } from '../config';
import { playSFX } from '../audio.js';

// --- LỚP PLAYER ---
export class Player {
    constructor(id, name, groundY, laneWidth, playerImage, viewport) {
        this.id = id; // 0 cho P1, 1 cho P2
        this.name = name;
        this.lane = 2; // Bắt đầu ở làn giữa
        this.laneWidth = laneWidth;
        this.image = playerImage; // Hình ảnh của player
        this.viewport = viewport; // Vùng màn hình của người chơi
        this.score = 0;
        this.shieldTimer = 0; // Thời gian có khiên
        this.magnetTimer = 0; // Thời gian có nam châm
        this.combo = 0; // Đếm combo ăn coin
        this.comboTimer = 0; // Thời gian để duy trì combo
        this.comboPulse = 1.0; // Hiệu ứng phóng to cho combo
    this.justComboed = false; // flag set when combo increases to trigger effects
        this.shakeTimer = 0; // Thời gian rung màn hình
        this.shakeIntensity = 5; // Độ mạnh của rung
        this.isAlive = true;
        this.respawnTimer = 0; // Đếm ngược để hồi sinh (giây)
        this.invincibleTimer = 0; // Đếm ngược bất tử sau khi hồi sinh (giây)
        this.shieldRotation = 0; // Thêm: góc xoay cho khiên
        this.shieldPulse = 1; // Thêm: hiệu ứng đập cho khiên

    // For near-miss detection: remember last lane and when lane changed
    this.previousLane = this.lane;
    this.lastLaneChangeTime = 0; // seconds since epoch

        // Thuộc tính cho hiệu ứng nghiêng xe
        this.rotation = 0; // Góc nghiêng hiện tại (radians)
        this.rotationVelocity = 0; // Vận tốc góc

        // Tính toán kích thước dựa trên ảnh và chiều rộng làn đường
        const aspectRatio = this.image.height / this.image.width;
        this.w = this.laneWidth * 0.8;
        this.h = this.w * aspectRatio;

        this.y = groundY - this.h - 20;
        this.x = this.getTargetX(); // Vị trí x ban đầu
    }

    // Lấy vị trí x mục tiêu dựa trên làn hiện tại
    getTargetX() {
        return this.lane * this.laneWidth + (this.laneWidth - this.w) / 2;
    }

    // Cập nhật vị trí để di chuyển mượt mà
    update(dt) {
        const dtSeconds = dt / 1000;

        if (!this.isAlive) {
            // If respawnTimer is null, it means the death is permanent (no auto-respawn).
            if (this.respawnTimer != null) {
                this.respawnTimer -= dtSeconds;
                if (this.respawnTimer <= 0) {
                    this.respawn();
                }
            }
            return;
        }

        if (this.shieldTimer > 0) {
            this.shieldTimer -= dtSeconds;
            this.shieldRotation += 2 * dtSeconds;
            this.shieldPulse = 1 + Math.sin(this.shieldRotation * 5) * 0.05;
        }

        if (this.magnetTimer > 0) {
            this.magnetTimer -= dtSeconds;
        }

        if (this.comboTimer > 0) {
            this.comboTimer -= dtSeconds;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        if (this.comboPulse > 1.0) {
            this.comboPulse -= 4 * dtSeconds;
            if (this.comboPulse < 1.0) {
                this.comboPulse = 1.0;
            }
        }

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dtSeconds;
        }

        if (this.shakeTimer > 0) {
            this.shakeTimer -= dtSeconds;
        }

        const targetX = this.getTargetX();
        this.x += (targetX - this.x) * 15 * dtSeconds;

        const stiffness = 250;
        const damping = 15;
        const restoringForce = -this.rotation * stiffness;
        const dampingForce = -this.rotationVelocity * damping;
        const angularAcceleration = restoringForce + dampingForce;

        this.rotationVelocity += angularAcceleration * dtSeconds;
        this.rotation += this.rotationVelocity * dtSeconds;
    }

    moveLeft() {
        if (this.isAlive && this.lane > 0) {
            playSFX('laneChange', { playbackRate: 2.0 });
            this.previousLane = this.lane;
            this.lane--;
            this.lastLaneChangeTime = performance.now() / 1000;
            this.rotationVelocity -= 7;
        }
    }

    moveRight() {
        if (this.isAlive && this.lane < LANE_COUNT - 1) {
            playSFX('laneChange', { playbackRate: 2.0 });
            this.previousLane = this.lane;
            this.lane++;
            this.lastLaneChangeTime = performance.now() / 1000;
            this.rotationVelocity += 7;
        }
    }

    die(allowRespawn = false) {
        // If player is currently invincible or shielded, ignore the hit.
        if (this.invincibleTimer > 0 || this.shieldTimer > 0) return;
        // Mark as dead.
        this.isAlive = false;
        this.shakeTimer = GAME_CONFIG.SHAKE_DURATION;
        if (allowRespawn) {
            // schedule respawn after configured time
            this.respawnTimer = GAME_CONFIG.RESPAWN_TIME;
        } else {
            // Use null to indicate "no auto-respawn".
            this.respawnTimer = null;
        }
        // Reset combo immediately on death
        this.combo = 0;
        this.comboTimer = 0;
        this.comboPulse = 1.0;
    }

    addCombo(amount = 1) {
        this.combo += amount;
        this.comboPulse = 1.6;
        this.justComboed = true;
        this.comboTimer = GAME_CONFIG.COMBO_DURATION;
    }

    getComboMultiplier() {
        return 1 + Math.floor(this.combo / GAME_CONFIG.COMBO_SCORE_MULTIPLIER_STEP);
    }

    respawn() {
        playSFX('start');
        this.isAlive = true;
        this.lane = 2;
        this.invincibleTimer = GAME_CONFIG.INVINCIBLE_TIME_AFTER_RESPAWN;
        this.rotation = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.comboPulse = 1.0;
        this.rotationVelocity = 0;
    }

    draw(ctx, assets) {
        if (!this.isAlive) return;

        ctx.save();

        if (this.invincibleTimer > 0) {
            if (Math.floor(this.invincibleTimer * 10) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }
        }

        let shakeX = 0;
        let shakeY = 0;
        if (this.shakeTimer > 0) {
            shakeX = (Math.random() - 0.5) * GAME_CONFIG.SHAKE_INTENSITY;
            shakeY = (Math.random() - 0.5) * GAME_CONFIG.SHAKE_INTENSITY;
        }
        ctx.translate(this.x + this.w / 2 + shakeX, this.y + this.h / 2 + shakeY);
        ctx.rotate(this.rotation);

        if (this.shieldTimer > 0) {
            ctx.save();
            const shieldSize = (this.w + 30) * this.shieldPulse;
            ctx.translate(0, 0);
            ctx.rotate(this.shieldRotation);
            ctx.globalAlpha = 0.5 + Math.sin(this.shieldRotation * 2) * 0.2;
            ctx.drawImage(assets.shield_effect, -shieldSize / 2, -shieldSize / 2, shieldSize, shieldSize);
            ctx.globalAlpha = 1.0;
            ctx.restore();
        }

        ctx.drawImage(this.image, -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }

    getRect() {
        let paddingX = this.w * 0.2;
        let paddingY = this.h * 0.1;
        return {
            x: this.x + paddingX,
            y: this.y + paddingY,
            w: this.w - paddingX * 2,
            h: this.h - paddingY * 2
        };
    }

    getNearMissRect() {
        const x = this.lane * this.laneWidth + (this.laneWidth - this.w) / 2;
        return {
            x: x - 20,
            y: this.y - 20,
            w: this.w + 40,
            h: this.h + 40
        };
    }
}
