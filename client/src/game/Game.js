import { Player } from './entities/Player.js';
import { Obstacle } from './entities/Obstacle.js';
import { Coin } from './entities/Coin.js';
import { PowerUp } from './entities/PowerUp.js';
import { Particle } from './effects/Particle.js';
import { FloatingText } from './effects/FloatingText.js';
import ComboEffect from './effects/ComboEffect.js';
import { loadAssets } from './assets.js';
import { GAME_CONFIG, PLAYER_COUNT, LANE_COUNT, obstaclePatterns } from './config';
import { rectsIntersect, isMouseInRect, fetchLeaderboard, sendScoreToServer, drawNeonText } from './utils.js';
import { getLocale, setLocale, t } from '../i18n/index.js';
import { setupUI, drawMainMenu, drawGameOver, drawSettings } from './ui.js';

export class Game {
    constructor(canvas, playerNames) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.playerNames = playerNames;
        this.gameState = 'loading';
        this.players = [];
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.particles = [];
        this.floatingTexts = [];
        this.fallSpeed = GAME_CONFIG.INITIAL_FALL_SPEED;
        this.leaderboardData = [];
        this.lastTime = 0;
        this.mousePos = { x: 0, y: 0 };
        this.buttons = {};
        this.roadOffset = 0;
        this.assets = {};
        this.obstacleImages = [];
    this.scoresSent = false; // prevent duplicate sends

        this.PLAYER_VIEW_WIDTH = (this.canvas.width - GAME_CONFIG.VIEWPORT_GAP) / PLAYER_COUNT;
        this.LANE_WIDTH = this.PLAYER_VIEW_WIDTH / LANE_COUNT;
        this.GROUND_Y = this.canvas.height;
        // Unique identifier for this game instance to prevent duplicate score inserts
        this.gameId = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
        this.comboEffect = new ComboEffect();
        // settings and controls
        this.settings = {
            controls: {
                p1_left: 'a',
                p1_right: 'd',
                p2_left: 'ArrowLeft',
                p2_right: 'ArrowRight'
            }
        };
        this.showSettings = false;
        this.awaitingKey = null; // { key: 'p1_left' }
    }

    // Note: visual combo effects are managed by ComboEffect manager (comboEffect)

    // Helper to draw rounded rectangles
    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (typeof stroke === 'undefined') {
            stroke = true;
        }
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
    }

    async start() {
        try {
            this.assets = await loadAssets();
            this.obstacleImages = [this.assets.obstacle_tree, this.assets.obstacle_log, this.assets.obstacle_pit, this.assets.obstacle_crate, this.assets.obstacle_rock];
            this.buttons = setupUI(this.canvas);
            this.initEventListeners();
            // Load persisted settings (controls / locale) from localStorage if present
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem('racing:settings');
                    if (raw) {
                        const s = JSON.parse(raw);
                        if (s && s.controls) {
                            this.settings.controls = Object.assign({}, this.settings.controls, s.controls);
                        }
                        if (s && s.locale) {
                            try { setLocale(s.locale); } catch (e) { }
                        }
                    }
                }
            } catch (e) {
                // ignore localStorage errors
            }
            // Ensure important fonts are loaded before initializing the game canvas
            try {
                if (typeof document !== 'undefined' && document.fonts) {
                    // request font loads for the sizes we use (Noto Sans only)
                    await document.fonts.load("16px 'Noto Sans'");
                    await document.fonts.ready;
                }
            } catch (e) {
                console.warn('font load check failed', e);
            }
            this.initGame();
            this.gameState = 'playing';
            requestAnimationFrame(this.gameLoop.bind(this));
        } catch (error) {
            console.error("Error loading assets:", error);
                this.ctx.fillStyle = 'red';
            this.ctx.font = "20px 'Noto Sans', sans-serif";
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Failed to load assets. Check console for details.', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    initEventListeners() {
        window.addEventListener('keydown', (e) => {
            // If waiting for a key binding, capture and set it
            if (this.awaitingKey) {
                const mapKey = this.awaitingKey.key;
                this.settings.controls[mapKey] = e.key;
                this.awaitingKey = null;
                return;
            }
            if (this.gameState !== 'playing') return;
            // use configured controls
            try {
                if (e.key === this.settings.controls.p1_left) this.players[0].moveLeft();
                else if (e.key === this.settings.controls.p1_right) this.players[0].moveRight();
                if (e.key === this.settings.controls.p2_left) this.players[1].moveLeft();
                else if (e.key === this.settings.controls.p2_right) this.players[1].moveRight();
            } catch (err) {
                // ignore if players not initialized yet
            }
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });
        this.canvas.addEventListener('click', async (e) => {
            // compute click position relative to canvas (so click works even without prior mousemove)
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // DEBUG: log click coordinates
            console.log('[DEBUG] canvas click at', clickX, clickY, 'mousePos(last):', this.mousePos);

            // settings button clickable from main menu (open settings overlay)
            try {
                if (this.buttons && this.buttons.mainMenu && this.buttons.mainMenu.settings && isMouseInRect({ x: clickX, y: clickY }, this.buttons.mainMenu.settings.rect)) {
                    this.showSettings = true;
                    return;
                }
                    // app-level settings icon (always visible) click
                    if (this.buttons && this.buttons.app && this.buttons.app.settingsIcon && isMouseInRect({ x: clickX, y: clickY }, this.buttons.app.settingsIcon.rect)) {
                        this.showSettings = true;
                        return;
                    }
                // if settings overlay is open, handle its clicks
                if (this.showSettings && this.buttons && this.buttons.settings) {
                    const s = this.buttons.settings;
                    // back
                    if (isMouseInRect({ x: clickX, y: clickY }, s.back.rect)) {
                        this.showSettings = false;
                        return;
                    }
                    // language
                    if (isMouseInRect({ x: clickX, y: clickY }, s.lang_en.rect)) {
                        setLocale('en');
                        return;
                    }
                    if (isMouseInRect({ x: clickX, y: clickY }, s.lang_vi.rect)) {
                        setLocale('vi');
                        return;
                    }
                    // control remapping fields
                    const fields = ['p1_left','p1_right','p2_left','p2_right'];
                    for (const k of fields) {
                        if (isMouseInRect({ x: clickX, y: clickY }, s[k].rect)) {
                            // start capturing next key
                            this.awaitingKey = { key: k };
                            return;
                        }
                    }
                }
            } catch (err) {
                // ignore
            }

            if (this.gameState === 'gameover') {
                if (isMouseInRect({ x: clickX, y: clickY }, this.buttons.gameOver.restart.rect)) {
                    console.log('[DEBUG] restart clicked');
                    this.initGame();
                } else if (isMouseInRect({ x: clickX, y: clickY }, this.buttons.gameOver.menu.rect)) {
                    console.log('[DEBUG] main menu clicked');
                    window.location.reload();
                }
            }
        });
    }

    initGame() {
        this.players = [];
        for (let i = 0; i < PLAYER_COUNT; i++) {
            const name = i === 0 ? this.playerNames.p1 : this.playerNames.p2;
            const viewport = { x: i * (this.PLAYER_VIEW_WIDTH + GAME_CONFIG.VIEWPORT_GAP), y: 0, w: this.PLAYER_VIEW_WIDTH, h: this.canvas.height };
            this.players.push(new Player(i, name, this.GROUND_Y, this.LANE_WIDTH, this.assets.player, viewport));
            this.players[i].invincibleTimer = GAME_CONFIG.INVINCIBLE_TIME_AFTER_RESPAWN;
        }
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.particles = [];
        this.floatingTexts = [];
        this.gameState = 'playing';
        this.fallSpeed = GAME_CONFIG.INITIAL_FALL_SPEED;
        this.lastTime = 0;
        this.leaderboardData = [];
    this.scoresSent = false;
        this.spawnObstaclePattern();
    }

    spawnObstaclePattern() {
        const patternIndex = Math.floor(Math.random() * obstaclePatterns.length);
        const pattern = obstaclePatterns[patternIndex];
        const obsW = this.LANE_WIDTH * 0.9;
        const obsH = obsW * 1.2;
        for (let row = 0; row < 5; row++) {
            for (let lane = 0; lane < LANE_COUNT; lane++) {
                const y = -row * (obsH + 350);
                if (pattern[row][lane] === 1) {
                    const obstacleImage = this.obstacleImages[Math.floor(Math.random() * this.obstacleImages.length)];
                    this.obstacles.push(new Obstacle(lane, y, obsW, obsH, obstacleImage));
                } else if (Math.random() < 0.2) {
                    this.coins.push(new Coin(lane, y + 60, 80, this.assets.coin, this.LANE_WIDTH));
                } else if (Math.random() < 0.05) {
                    const type = Math.random() < 0.6 ? 'shield' : 'magnet';
                    this.powerups.push(new PowerUp(lane, y + 60, 80, type, this.assets));
                }
            }
        }
    }

    gameLoop(timestamp) {
        if (this.lastTime === 0) {
            this.lastTime = timestamp;
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (this.gameState === 'playing') {
            this.update(dt);
        }
        this.draw();
        if (this.gameState === 'gameover') {
            drawGameOver(this.ctx, this.players, this.leaderboardData, this.buttons, this.mousePos, this.canvas);
        }
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(dt) {
        this.players.forEach(p => p.update(dt));
        this.roadOffset = (this.roadOffset + this.fallSpeed * (dt / 1000)) % GAME_CONFIG.ROAD_OFFSET_LOOP;
        this.fallSpeed += GAME_CONFIG.FALL_SPEED_INCREASE_RATE;
        this.obstacles.forEach(o => o.update(this.fallSpeed, dt));
        this.coins.forEach(c => c.update(this.fallSpeed, dt));
        this.powerups.forEach(p => p.update(this.fallSpeed, dt));
        this.particles.forEach(p => p.update(dt));
        this.floatingTexts.forEach(t => t.update(dt));
        this.obstacles = this.obstacles.filter(o => o.y < this.canvas.height);
        this.coins = this.coins.filter(c => c.y < this.canvas.height);
        this.powerups = this.powerups.filter(p => p.y < this.canvas.height);
        this.particles = this.particles.filter(p => p.life > 0);
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
        if (this.obstacles.length === 0 || this.obstacles[this.obstacles.length - 1].y > 200) {
            this.spawnObstaclePattern();
        }
        this.players.forEach(p => this.attractCoins(p, dt));
        this.checkCollisions();

        // Handle combo-triggered effects after collisions (since addCombo may be called there)
        // update combo effect manager and trigger per-player on combo increase
        this.comboEffect.update(dt);
        this.players.forEach(player => {
            if (player.justComboed) {
                this.comboEffect.trigger(player);
                player.justComboed = false;
            }
        });
    }

    // Magnet: attract nearby coins towards the player when magnet is active
    attractCoins(player, dt) {
        if (!player.isAlive) return;
        if (player.magnetTimer <= 0) return;
        const dtSeconds = dt / 1000;
        const magnetRadius = 220; // pixels
        const strengthBase = 700; // tuning constant for attraction speed

        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            // coin.x is relative to viewport; player.x is also relative
            const coinCenterX = coin.x + coin.size / 2;
            const coinCenterY = coin.y + coin.size / 2;
            const playerCenterX = player.x + player.w / 2;
            const playerCenterY = player.y + player.h / 2;

            const dx = playerCenterX - coinCenterX;
            const dy = playerCenterY - coinCenterY;
            const dist = Math.hypot(dx, dy);
            if (dist < magnetRadius) {
                // Move coin toward player. Strength increases as it gets closer.
                const normX = dx / (dist || 1);
                const normY = dy / (dist || 1);
                const strength = ((magnetRadius - dist) / magnetRadius) * strengthBase * dtSeconds;
                coin.x += normX * strength;
                coin.y += normY * strength;
            }
        }
    }

    awardNearMiss(player) {
        const bonus = GAME_CONFIG.NEAR_MISS_BONUS;
        player.score += bonus;
        player.addCombo(1);
        // localized floating text near player's viewport
        this.floatingTexts.push(new FloatingText(t('nearMissBonus', { n: bonus }), this.PLAYER_VIEW_WIDTH - 60, this.canvas.height * 0.6, '173, 216, 230', 18, player.viewport.x));
    }
    async checkCollisions() {
        this.players.forEach(player => {
            if (!player.isAlive) return;
            const playerRect = player.getRect();

            this.obstacles.forEach((obs, i) => {
                const obsRect = obs.getRect(this.LANE_WIDTH);
                if (rectsIntersect(playerRect, obsRect)) {
                    if (player.shieldTimer > 0) {
                        player.shieldTimer = 0;
                        this.obstacles.splice(i, 1);
                    } else {
                        // If another player is alive, allow this player to respawn later
                        const otherAlive = this.players.some(p => p !== player && p.isAlive);
                        player.die(otherAlive);
                    }
                } else {
                    // Refined near-miss detection:
                    // Conditions:
                    // - obstacle hasn't been awarded (obs.isNearMiss === false)
                    // - player had just changed lane from the obstacle's lane to another lane
                    // - lane change happened recently (NEAR_MISS_WINDOW)
                    // - player has no shield active
                    // - obstacle was approaching from front and is within a vertical window
                    try {
                        // Tuning: make near-miss harder to trigger by reducing
                        // the time window and distance threshold.
                        const NEAR_MISS_WINDOW = 0.5; // seconds (shorter window)
                        const MAX_FRONT_DISTANCE = 100; // pixels (closer in front)
                        const now = performance.now() / 1000;
                        const obsCenterY = obs.y + obs.h / 2;
                        const playerCenterY = player.y + player.h / 2;

                        const changedFromObstacleLane = (player.previousLane === obs.lane && player.lane !== obs.lane);
                        const recentLaneChange = (now - (player.lastLaneChangeTime || 0)) <= NEAR_MISS_WINDOW;
                        const approachFromFront = (obsCenterY < playerCenterY) && ((playerCenterY - obsCenterY) <= MAX_FRONT_DISTANCE);

                        if (!obs.isNearMiss && changedFromObstacleLane && recentLaneChange && approachFromFront && player.shieldTimer <= 0) {
                            obs.isNearMiss = true;
                            this.awardNearMiss(player);
                        }
                    } catch (e) {
                        // ignore if methods aren't available for some objects
                    }
                }
            });

            this.coins.forEach((coin, i) => {
                if (rectsIntersect(playerRect, coin.getRect())) {
                    // use player's combo helper
                    player.addCombo(1);
                    const scoreGained = GAME_CONFIG.COIN_BASE_SCORE * player.getComboMultiplier();
                    player.score += scoreGained;
                    this.floatingTexts.push(new FloatingText(`+${scoreGained}`, coin.x + coin.size / 2, coin.y, '255, 215, 0', 16, player.viewport.x));
                    this.coins.splice(i, 1);
                }
            });

            this.powerups.forEach((powerup, i) => {
                if (rectsIntersect(playerRect, powerup.getRect(this.LANE_WIDTH))) {
                    if (powerup.type === 'shield') player.shieldTimer = GAME_CONFIG.SHIELD_DURATION;
                    else if (powerup.type === 'magnet') player.magnetTimer = GAME_CONFIG.MAGNET_DURATION;
                    this.powerups.splice(i, 1);
                }
            });
        });

        if (this.players.every(p => !p.isAlive)) {
            if (this.gameState !== 'gameover') {
                if (!this.scoresSent) {
                    this.players.forEach(player => {
                        // send gameId so server can dedupe per game instance
                        sendScoreToServer(player.score, player.name, this.gameId);
                    });
                    this.scoresSent = true;
                }
                this.leaderboardData = await fetchLeaderboard();
            }
            this.gameState = 'gameover';
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.players.forEach(player => {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(player.viewport.x, player.viewport.y, player.viewport.w, player.viewport.h);
            this.ctx.clip();
            this.ctx.translate(player.viewport.x, 0);

            this.ctx.fillStyle = '#404040';
            this.ctx.fillRect(0, 0, player.viewport.w, player.viewport.h);

            this.ctx.strokeStyle = '#777';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([GAME_CONFIG.LANE_DASH_LENGTH, GAME_CONFIG.LANE_DASH_GAP]);
            for (let i = 1; i < LANE_COUNT; i++) {
                this.ctx.beginPath();
                this.ctx.lineDashOffset = -this.roadOffset;
                this.ctx.moveTo(i * this.LANE_WIDTH, 0);
                this.ctx.lineTo(i * this.LANE_WIDTH, this.canvas.height);
                this.ctx.stroke();
            }
            this.ctx.setLineDash([]);

            player.draw(this.ctx, this.assets);
            this.obstacles.forEach(o => o.draw(this.ctx, this.LANE_WIDTH));
            this.coins.forEach(c => c.draw(this.ctx, this.LANE_WIDTH));
            this.powerups.forEach(p => p.draw(this.ctx, this.LANE_WIDTH));

            drawNeonText(
                this.ctx,
                `${player.name}: ${Math.floor(player.score)}`,
                20, 40,
                "18px 'Noto Sans'",
                '#da1acaff',
                '#00ffff',
                'left'
            );

            // Respawn countdown HUD: if player is dead and has a respawnTimer (not permanent death)
            try {
                if (!player.isAlive && player.respawnTimer != null && player.respawnTimer > 0) {
                    const secs = Math.ceil(player.respawnTimer);
                    const text = t('respawnIn', { n: secs });
                    // center of viewport
                    const cx = player.viewport.w / 2;
                    const cy = Math.floor(this.canvas.height * 0.45);
                    drawNeonText(this.ctx, text, cx, cy, "22px 'Noto Sans'", '#ffffff', 'rgba(0,220,255,0.9)', 'center', 6);
                }
            } catch (e) {
                // ignore drawing errors
            }

            // Combo visual handled by ComboEffect manager
            try {
                this.comboEffect.draw(this.ctx, player, this.canvas);
            } catch (e) {
                // ignore
            }

            this.ctx.restore();
        });

        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.PLAYER_VIEW_WIDTH, 0, GAME_CONFIG.VIEWPORT_GAP, this.canvas.height);

        this.particles.forEach(p => p.draw(this.ctx));
        this.floatingTexts.forEach(t => t.draw(this.ctx));
        // draw a small persistent settings icon/button in the top-right so players can open Settings anytime
        try {
            if (this.buttons && this.buttons.app && this.buttons.app.settingsIcon) {
                // draw using ui drawButton helper by importing drawButton would be extra; reuse drawNeonText for a small icon
                const b = this.buttons.app.settingsIcon;
                // simple background
                this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
                this.roundRect(this.ctx, b.rect.x, b.rect.y, b.rect.w, b.rect.h, 6, true, true);
                // icon
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = "20px 'Noto Sans'";
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(b.text || '⚙', b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2 + 1);
            }
        } catch (e) {
            // ignore drawing errors
        }
        // If settings overlay is active draw it on top
        try {
            if (this.showSettings && this.buttons && this.buttons.settings) {
                drawSettings(this.ctx, this.buttons.settings, this.mousePos, this.canvas, this.settings.controls, this.awaitingKey);
            }
        } catch (e) {
            // ignore draw errors
        }
    }
}
