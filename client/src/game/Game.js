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
import { setupUI, drawMainMenu, drawGameOver, drawPauseMenu } from './ui.js';
import { playSFX, playBGM, stopAllBGM } from './audio.js';

export class Game {
    constructor(canvas, playerNames) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

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
        this.scoresSent = false;

        this.PLAYER_VIEW_WIDTH = (this.canvas.width - GAME_CONFIG.VIEWPORT_GAP) / PLAYER_COUNT;
        this.LANE_WIDTH = this.PLAYER_VIEW_WIDTH / LANE_COUNT;
        this.GROUND_Y = this.canvas.height;
        this.gameId = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
        this.comboEffect = new ComboEffect();
        this.settings = {
            controls: {
                p1_left: 'a',
                p1_right: 'd',
                p2_left: 'ArrowLeft',
                p2_right: 'ArrowRight'
            }
        };
        this.showSettings = false;
        this.awaitingKey = null;
    }

    createCoinParticles(absoluteX, absoluteY) {
        const count = 15;
        const color = '255, 215, 0';
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 3 + 1;
            const life = 30 + Math.random() * 20;
            this.particles.push(new Particle(absoluteX, absoluteY, color, size, vx, vy, life));
        }
    }

    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (typeof stroke === 'undefined') stroke = true;
        if (typeof radius === 'undefined') radius = 5;
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
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    async start() {
        try {
            this.assets = await loadAssets();
            this.obstacleImages = [this.assets.obstacle_tree, this.assets.obstacle_log, this.assets.obstacle_pit, this.assets.obstacle_crate, this.assets.obstacle_rock];
            this.buttons = setupUI(this.canvas);
            this.initEventListeners();
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem('racing:settings');
                    if (raw) {
                        const s = JSON.parse(raw);
                        if (s && s.controls) this.settings.controls = Object.assign({}, this.settings.controls, s.controls);
                        if (s && s.locale) try { setLocale(s.locale); } catch (e) {}
                    }
                }
            } catch (e) {}
            try {
                if (typeof document !== 'undefined' && document.fonts) {
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
            const fontName = getLocale() === 'en' ? "'Press Start 2P'" : "'Noto Sans'";
            this.ctx.fillStyle = 'red';
            this.ctx.font = `20px ${fontName}`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Failed to load assets. Check console for details.', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    initEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (this.awaitingKey) {
                const mapKey = this.awaitingKey.key;
                this.settings.controls[mapKey] = e.key;
                this.awaitingKey = null;
                return;
            }
            if (this.gameState !== 'playing' || this.showSettings) return;
            try {
                if (e.key === this.settings.controls.p1_left) this.players[0].moveLeft();
                else if (e.key === this.settings.controls.p1_right) this.players[0].moveRight();
                if (e.key === this.settings.controls.p2_left) this.players[1].moveLeft();
                else if (e.key === this.settings.controls.p2_right) this.players[1].moveRight();
            } catch (err) {}
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('click', async (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            if (this.buttons.app && this.buttons.app.settingsIcon && isMouseInRect({ x: clickX, y: clickY }, this.buttons.app.settingsIcon.rect)) {
                this.showSettings = true;
                return;
            }

            if (this.showSettings && this.buttons.pause) {
                const p = this.buttons.pause;
                if (isMouseInRect({ x: clickX, y: clickY }, p.resume.rect)) {
                    this.showSettings = false;
                    return;
                }
                if (isMouseInRect({ x: clickX, y: clickY }, p.restart.rect)) {
                    this.showSettings = false;
                    this.initGame();
                    return;
                }
                if (isMouseInRect({ x: clickX, y: clickY }, p.mainMenu.rect)) {
                    window.location.reload();
                    return;
                }
                if (isMouseInRect({ x: clickX, y: clickY }, p.endGame.rect)) {
                    this.players.forEach(p => p.isAlive = false);
                    this.checkCollisions();
                    this.showSettings = false;
                    return;
                }
                if (isMouseInRect({ x: clickX, y: clickY }, p.lang_en.rect)) {
                    setLocale('en');
                    return;
                }
                if (isMouseInRect({ x: clickX, y: clickY }, p.lang_vi.rect)) {
                    setLocale('vi');
                    return;
                }
            }

            if (this.gameState === 'gameover') {
                if (isMouseInRect({ x: clickX, y: clickY }, this.buttons.gameOver.restart.rect)) {
                    this.initGame();
                } else if (isMouseInRect({ x: clickX, y: clickY }, this.buttons.gameOver.menu.rect)) {
                    window.location.reload();
                }
            }
        });
    }

    initGame() {
        stopAllBGM();
        playBGM('game');
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
        if (this.gameState === 'playing' && !this.showSettings) {
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
        this.comboEffect.update(dt);
        this.players.forEach(player => {
            if (player.justComboed) {
                this.comboEffect.trigger(player);
                player.justComboed = false;
            }
        });
    }

    attractCoins(player, dt) {
        if (!player.isAlive || player.magnetTimer <= 0) return;
        const dtSeconds = dt / 1000;
        const magnetRadius = 220;
        const strengthBase = 700;
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            const coinCenterX = coin.x + coin.size / 2;
            const coinCenterY = coin.y + coin.size / 2;
            const playerCenterX = player.x + player.w / 2;
            const playerCenterY = player.y + player.h / 2;
            const dx = playerCenterX - coinCenterX;
            const dy = playerCenterY - coinCenterY;
            const dist = Math.hypot(dx, dy);
            if (dist < magnetRadius) {
                const normX = dx / (dist || 1);
                const normY = dy / (dist || 1);
                const strength = ((magnetRadius - dist) / magnetRadius) * strengthBase * dtSeconds;
                coin.x += normX * strength;
                coin.y += normY * strength;
            }
        }
    }

    awardNearMiss(player) {
        playSFX('dodge');
        const bonus = GAME_CONFIG.NEAR_MISS_BONUS;
        player.score += bonus;
        player.addCombo(1);
        this.floatingTexts.push(new FloatingText(t('nearMissBonus', { n: bonus }), this.PLAYER_VIEW_WIDTH - 60, this.canvas.height * 0.6, '173, 216, 230', 18, player.viewport.x));
        
        // Repositioned and tuned "!" effect
        const iconX = player.x + player.w; // Top-right of the player character
        const iconY = player.y;
        const color = '147, 112, 219'; // Medium purple
        const size = 50;
        const shake = 5;
        const rotation = Math.PI / 6;
        const pulseFrequency = 20;
        this.floatingTexts.push(new FloatingText('!', iconX, iconY, color, size, player.viewport.x, shake, rotation, pulseFrequency));
    }

    async checkCollisions() {
        this.players.forEach(player => {
            if (!player.isAlive) return;
            const playerRect = player.getRect();
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obs = this.obstacles[i];
                const obsRect = obs.getRect(this.LANE_WIDTH);
                if (rectsIntersect(playerRect, obsRect)) {
                    if (player.shieldTimer > 0) {
                        playSFX('shield');
                        player.shieldTimer = 0;
                        this.obstacles.splice(i, 1);
                    } else {
                        playSFX('crash');
                        const otherAlive = this.players.some(p => p !== player && p.isAlive);
                        player.die(otherAlive);
                    }
                } else {
                    try {
                        const NEAR_MISS_WINDOW = 0.5;
                        const MAX_FRONT_DISTANCE = 100;
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
                    } catch (e) {}
                }
            }
            for (let i = this.coins.length - 1; i >= 0; i--) {
                const coin = this.coins[i];
                if (rectsIntersect(playerRect, coin.getRect())) {
                    playSFX('coin');
                    player.addCombo(1);
                    const scoreGained = GAME_CONFIG.COIN_BASE_SCORE * player.getComboMultiplier();
                    player.score += scoreGained;
                    this.floatingTexts.push(new FloatingText(`+${scoreGained}`, coin.x + coin.size / 2, coin.y, '255, 215, 0', 16, player.viewport.x));
                    const absoluteCoinX = player.viewport.x + coin.x + coin.size / 2;
                    this.createCoinParticles(absoluteCoinX, coin.y);
                    this.coins.splice(i, 1);
                }
            }
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const powerup = this.powerups[i];
                if (rectsIntersect(playerRect, powerup.getRect(this.LANE_WIDTH))) {
                    if (powerup.type === 'shield') {
                        playSFX('shield');
                        player.shieldTimer = GAME_CONFIG.SHIELD_DURATION;
                    } else if (powerup.type === 'magnet') {
                        playSFX('magnet');
                        player.magnetTimer = GAME_CONFIG.MAGNET_DURATION;
                    }
                    this.powerups.splice(i, 1);
                }
            }
        });
        if (this.players.every(p => !p.isAlive)) {
            if (this.gameState !== 'gameover') {
                stopAllBGM();
                playSFX('gameOver');
                playBGM('menu');
                if (!this.scoresSent) {
                    this.players.forEach(player => {
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
            drawNeonText(this.ctx, `${player.name}: ${Math.floor(player.score)}`, 20, 40, 18, '#da1acaff', '#00ffff', 'left');
            try {
                if (!player.isAlive && player.respawnTimer != null && player.respawnTimer > 0) {
                    const secs = Math.ceil(player.respawnTimer);
                    const text = t('respawnIn', { n: secs });
                    const cx = player.viewport.w / 2;
                    const cy = Math.floor(this.canvas.height * 0.45);
                    drawNeonText(this.ctx, text, cx, cy, 22, '#ffffff', 'rgba(0,220,255,0.9)', 'center', 6);
                }
            } catch (e) {}
            try {
                this.comboEffect.draw(this.ctx, player, this.canvas);
            } catch (e) {}
            this.ctx.restore();
        });
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.PLAYER_VIEW_WIDTH, 0, GAME_CONFIG.VIEWPORT_GAP, this.canvas.height);
        this.particles.forEach(p => p.draw(this.ctx));
        this.floatingTexts.forEach(t => t.draw(this.ctx));
        try {
            if (this.buttons.app && this.buttons.app.settingsIcon) {
                const b = this.buttons.app.settingsIcon;
                this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
                this.roundRect(this.ctx, b.rect.x, b.rect.y, b.rect.w, b.rect.h, 6, true, true);
                const fontName = getLocale() === 'en' ? "'Press Start 2P'" : "'Noto Sans'";
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = `20px ${fontName}`;
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(b.text || '⚙', b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2 + 1);
            }
        } catch (e) {}
        try {
            if (this.showSettings && this.buttons.pause) {
                drawPauseMenu(this.ctx, this.buttons.pause, this.mousePos, this.canvas, this.settings.controls, this.awaitingKey);
            }
        } catch (e) {}
    }
}