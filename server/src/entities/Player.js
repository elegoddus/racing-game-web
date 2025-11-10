const { GAME_CONFIG, LANE_COUNT } = require('../config');

class Player {
    constructor(id, name, groundY, laneWidth, viewport) {
        this.id = id;
        this.name = name;
        this.lane = 2;
        this.laneWidth = laneWidth;
        this.viewport = viewport;
        this.score = 0;
        this.shieldTimer = 0;
        this.magnetTimer = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.isAlive = true;
        this.respawnTimer = 0;
        this.invincibleTimer = 0;
        this.previousLane = this.lane;
        this.lastLaneChangeTime = 0;
        this.rotation = 0;
        this.rotationVelocity = 0;

        this.w = this.laneWidth * 0.8;
        this.h = this.w * 1.2; // Assuming a default aspect ratio

        this.y = groundY - this.h - 20;
        this.x = this.getTargetX();
    }

    getTargetX() {
        return this.lane * this.laneWidth + (this.laneWidth - this.w) / 2;
    }

    update(dt) {
        const dtSeconds = dt / 1000;

        if (!this.isAlive) {
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

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dtSeconds;
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
            this.previousLane = this.lane;
            this.lane--;
            this.lastLaneChangeTime = Date.now() / 1000;
            this.rotationVelocity -= 7;
        }
    }

    moveRight() {
        if (this.isAlive && this.lane < LANE_COUNT - 1) {
            this.previousLane = this.lane;
            this.lane++;
            this.lastLaneChangeTime = Date.now() / 1000;
            this.rotationVelocity += 7;
        }
    }

    die(allowRespawn = false) {
        if (this.invincibleTimer > 0 || this.shieldTimer > 0) return;
        this.isAlive = false;
        if (allowRespawn) {
            this.respawnTimer = GAME_CONFIG.RESPAWN_TIME;
        } else {
            this.respawnTimer = null;
        }
        this.combo = 0;
        this.comboTimer = 0;
    }

    addCombo(amount = 1) {
        this.combo += amount;
        this.comboTimer = GAME_CONFIG.COMBO_DURATION;
    }

    getComboMultiplier() {
        return 1 + Math.floor(this.combo / GAME_CONFIG.COMBO_SCORE_MULTIPLIER_STEP);
    }

    respawn() {
        this.isAlive = true;
        this.lane = 2;
        this.invincibleTimer = GAME_CONFIG.INVINCIBLE_TIME_AFTER_RESPAWN;
        this.rotation = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.rotationVelocity = 0;
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
}

module.exports = Player;
