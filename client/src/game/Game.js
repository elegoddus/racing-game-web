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
    constructor(canvas, props) {
        this.canvas = canvas;
        if (!this.canvas) {
            console.error("Game constructor: canvas is null or undefined.");
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.mode = props.mode; // 'solo', 'multi'
        this.props = props;

        this.numPlayers = props.numPlayers;
        this.playerNames = props.playerNames;
        this.settings = props.settings;
        this.onGameOver = props.onGameOver;
        this.socket = props.socket;
        this.myPlayerIndex = props.myPlayerIndex;

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

        const playerCount = this.mode === 'solo' ? this.numPlayers : PLAYER_COUNT;
        const totalGap = GAME_CONFIG.VIEWPORT_GAP * (playerCount > 1 ? playerCount - 1 : 0);
        this.PLAYER_VIEW_WIDTH = (this.canvas.width - totalGap) / playerCount;
        this.LANE_WIDTH = this.PLAYER_VIEW_WIDTH / LANE_COUNT;
        this.GROUND_Y = this.canvas.height;
        this.gameId = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
        this.comboEffect = new ComboEffect();
        this.showSettings = false;
        this.awaitingKey = null;
    }

    // Method to update game state from server data in multiplayer
    updateFromServer(serverState) {
        if (!this.assets.player) return; // Don't update if assets aren't loaded

        this.roadOffset = serverState.roadOffset;

        // Update players
        serverState.players.forEach((serverPlayer, index) => {
            if (!this.players[index]) {
                 const viewport = {
                    x: index * (this.PLAYER_VIEW_WIDTH + GAME_CONFIG.VIEWPORT_GAP),
                    y: 0,
                    w: this.PLAYER_VIEW_WIDTH,
                    h: this.canvas.height
                };
                this.players[index] = new Player(index, serverPlayer.name, this.GROUND_Y, this.LANE_WIDTH, this.assets.player, viewport);
            }
            const clientPlayer = this.players[index];
            clientPlayer.x = serverPlayer.x;
            clientPlayer.y = serverPlayer.y;
            clientPlayer.w = serverPlayer.w;
            clientPlayer.h = serverPlayer.h;
            clientPlayer.rotation = serverPlayer.rotation;
            clientPlayer.isAlive = serverPlayer.isAlive;
            clientPlayer.score = serverPlayer.score;
            clientPlayer.invincibleTimer = serverPlayer.invincibleTimer;
            clientPlayer.shieldTimer = serverPlayer.shieldTimer;
            // We don't sync combo, let client handle it for effects
        });

        // Update obstacles
        this.obstacles = serverState.obstacles.map(o => {
            const assetName = o.type; // Assuming server sends 'tree', 'log', etc.
            const image = this.assets[`obstacle_${assetName}`];
            if (!image) console.warn(`Asset not found for obstacle type: ${assetName}`);
            return new Obstacle(o.lane, o.y, o.w, o.h, image, o.type);
        });

        // Update coins
        this.coins = serverState.coins.map(c => {
            return new Coin(c.lane, c.y, c.size, this.assets.coin, this.LANE_WIDTH);
        });

        // Update powerups
        this.powerups = serverState.powerups.map(p => {
            const image = p.type === 'shield' ? this.assets.powerup_shield : this.assets.powerup_magnet;
            return new PowerUp(p.lane, p.y, p.size, p.type, { shield: this.assets.powerup_shield, magnet: this.assets.powerup_magnet });
        });
        
        if (serverState.gameState === 'gameover' && this.gameState !== 'gameover') {
            this.gameState = 'gameover';
            if (this.onGameOver) {
                this.onGameOver(serverState.players, { isMultiplayer: true });
            }
        }
    }


    createCoinParticles(player, coin) {
        const count = 15;
        const color = '255, 215, 0';
        const localX = coin.x + coin.size / 2;
        const localY = coin.y + coin.size / 2;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 3 + 1;
            const life = 30 + Math.random() * 20;
            this.particles.push(new Particle(localX, localY, color, size, vx, vy, life, player.viewport.x));
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
            if (this.settings && this.settings.locale) {
                try { setLocale(this.settings.locale); } catch (e) {}
            }
            try {
                if (typeof document !== 'undefined' && document.fonts) {
                    await document.fonts.load("16px 'Noto Sans'");
                    await document.fonts.ready;
                }
            } catch (e) {
                console.warn('font load check failed', e);
            }

            if (this.mode === 'solo') {
                this.initGame();
                this.gameState = 'playing';
            } else {
                // In multi, we wait for server state.
                this.gameState = 'playing'; // Or 'waiting'
            }
            
            requestAnimationFrame(this.gameLoop.bind(this));

        } catch (error) {
            console.error("Game.js: Error in start():", error);
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

            if (this.mode === 'solo') {
                const handleMove = (player, key, leftKey, rightKey) => {
                    if (!player || !player.isAlive) return;
                    const oldLane = player.lane;
                    let moved = false;
                    if (key === leftKey) {
                        player.moveLeft();
                        moved = true;
                    } else if (key === rightKey) {
                        player.moveRight();
                        moved = true;
                    }

                    if (moved && player.lane !== oldLane) {
                        this.checkForNearMiss(player, oldLane);
                    }
                };

                try {
                    handleMove(this.players[0], e.key, this.settings.controls.p1_left, this.settings.controls.p1_right);
                    handleMove(this.players[1], e.key, this.settings.controls.p2_left, this.settings.controls.p2_right);
                } catch (err) {}
            } else { // Multiplayer input
                const key = e.key;
                const controls = this.props.activeControls;
                let action = null;

                if (this.myPlayerIndex === 0) {
                    if (key === controls.p1_left) action = 'left';
                    if (key === controls.p1_right) action = 'right';
                } else if (this.myPlayerIndex === 1) {
                    if (key === controls.p2_left) action = 'left';
                    if (key === controls.p2_right) action = 'right';
                }

                if (action && this.socket) {
                    this.socket.emit('playerInput', { action: action });
                }
            }
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

            if (this.gameState === 'gameover' && this.mode === 'solo') {
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
        for (let i = 0; i < this.numPlayers; i++) {
            const name = i === 0 ? this.playerNames.p1 : this.playerNames.p2;
            let viewportX = 0;
            if (this.numPlayers === 1) {
                viewportX = (this.canvas.width - this.PLAYER_VIEW_WIDTH) / 2;
            } else {
                viewportX = i * (this.PLAYER_VIEW_WIDTH + GAME_CONFIG.VIEWPORT_GAP);
            }
            const viewport = { x: viewportX, y: 0, w: this.PLAYER_VIEW_WIDTH, h: this.canvas.height };
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
        }
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.gameState === 'playing' && !this.showSettings) {
            if (this.mode === 'solo') {
                this.update(dt);
            } else {
                // In multi, server dictates state. We only update client-side effects.
                this.updateClientEffects(dt);
            }
        }
        this.draw();
        
        if (this.gameState === 'gameover' && this.mode === 'solo') {
            drawGameOver(this.ctx, this.players, this.leaderboardData, this.buttons, this.mousePos, this.canvas);
        }
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    updateClientEffects(dt) {
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);

        this.floatingTexts.forEach(t => t.update(dt));
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
    }

    update(dt) {
        this.players.forEach(p => p.update(dt));

        this.roadOffset = (this.roadOffset + this.fallSpeed * (dt / 1000)) % GAME_CONFIG.ROAD_OFFSET_LOOP;
        this.fallSpeed += GAME_CONFIG.FALL_SPEED_INCREASE_RATE;
        
        this.obstacles.forEach(o => o.update(this.fallSpeed, dt));
        this.coins.forEach(c => c.update(this.fallSpeed, dt));
        this.powerups.forEach(p => p.update(this.fallSpeed, dt));
        this.updateClientEffects(dt);

        this.obstacles = this.obstacles.filter(o => o.y < this.canvas.height);
        this.coins = this.coins.filter(c => c.y < this.canvas.height);
        this.powerups = this.powerups.filter(p => p.y < this.canvas.height);

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
        
        const iconX = player.x + player.w;
        const iconY = player.y;
        const color = '147, 112, 219';
        const size = 50;
        const shake = 5;
        const rotation = Math.PI / 6;
        const pulseFrequency = 20;
        this.floatingTexts.push(new FloatingText('!', iconX, iconY, color, size, player.viewport.x, shake, rotation, pulseFrequency));
    }

    checkForNearMiss(player, oldLane) {
        const playerRect = player.getRect();
        for (const obs of this.obstacles) {
            if (obs.lane === oldLane && !obs.nearMissedBy.includes(player.id)) {
                const obsRect = obs.getRect(this.LANE_WIDTH);
                const verticalDistance = playerRect.y - (obsRect.y + obsRect.h);
                
                const isCloseInFront = verticalDistance > -playerRect.h && verticalDistance < 200;

                if (isCloseInFront) {
                    obs.nearMissedBy.push(player.id);
                    this.awardNearMiss(player);
                }
            }
        }
    }

    async checkCollisions() {
        const coinsToRemove = new Set();
        const obstaclesToRemove = new Set();
        const powerupsToRemove = new Set();

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
                        obstaclesToRemove.add(obs);
                    } else {
                        playSFX('crash');
                        const otherAlive = this.players.some(p => p !== player && p.isAlive);
                        player.die(otherAlive);
                    }
                }
            }

            for (let i = this.coins.length - 1; i >= 0; i--) {
                const coin = this.coins[i];
                if (rectsIntersect(playerRect, coin.getRect(this.LANE_WIDTH))) {
                    playSFX('coin');
                    player.addCombo(1);
                    const scoreGained = GAME_CONFIG.COIN_BASE_SCORE * player.getComboMultiplier();
                    player.score += scoreGained;
                    this.floatingTexts.push(new FloatingText(`+${scoreGained}`, coin.x + coin.size / 2, coin.y, '255, 215, 0', 16, player.viewport.x));
                    this.createCoinParticles(player, coin);
                    coinsToRemove.add(coin);
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
                    powerupsToRemove.add(powerup);
                }
            }
        });

        if (obstaclesToRemove.size > 0) this.obstacles = this.obstacles.filter(o => !obstaclesToRemove.has(o));
        if (coinsToRemove.size > 0) this.coins = this.coins.filter(c => !coinsToRemove.has(c));
        if (powerupsToRemove.size > 0) this.powerups = this.powerups.filter(p => !powerupsToRemove.has(p));

        if (this.players.every(p => !p.isAlive)) {
            if (this.gameState !== 'gameover') {
                this.gameState = 'gameover';
                stopAllBGM();
                playSFX('gameOver');
                playBGM('menu');

                if (this.onGameOver) {
                    this.onGameOver(this.players, { isMultiplayer: false });
                }

                if (!this.scoresSent) {
                    this.players.forEach(player => {
                        sendScoreToServer(player.score, player.name, this.gameId);
                    });
                    this.scoresSent = true;
                }
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const playerCount = this.mode === 'solo' ? this.numPlayers : (this.players.length > 0 ? this.players.length : PLAYER_COUNT);
        const viewWidth = (this.canvas.width - GAME_CONFIG.VIEWPORT_GAP) / playerCount;

        for (let i = 0; i < playerCount; i++) {
            const player = this.players[i];
            const viewportX = i * (viewWidth + GAME_CONFIG.VIEWPORT_GAP);
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(viewportX, 0, viewWidth, this.canvas.height);
            this.ctx.clip();
            this.ctx.translate(viewportX, 0);

            // Draw Road
            this.ctx.fillStyle = '#404040';
            this.ctx.fillRect(0, 0, viewWidth, this.canvas.height);
            this.ctx.strokeStyle = '#777';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([GAME_CONFIG.LANE_DASH_LENGTH, GAME_CONFIG.LANE_DASH_GAP]);
            for (let j = 1; j < LANE_COUNT; j++) {
                this.ctx.beginPath();
                this.ctx.lineDashOffset = -this.roadOffset;
                this.ctx.moveTo(j * this.LANE_WIDTH, 0);
                this.ctx.lineTo(j * this.LANE_WIDTH, this.canvas.height);
                this.ctx.stroke();
            }
            this.ctx.setLineDash([]);

            // Draw Entities
            if (player) {
                player.draw(this.ctx, this.assets);
            }
            
            // Draw obstacles, coins, and powerups inside the viewport
            this.obstacles.forEach(o => o.draw(this.ctx, this.LANE_WIDTH));
            this.coins.forEach(c => c.draw(this.ctx, this.LANE_WIDTH));
            this.powerups.forEach(p => p.draw(this.ctx, this.LANE_WIDTH));

            // Draw UI
            if (player) {
                drawNeonText(this.ctx, `${player.name}: ${Math.floor(player.score)}`, 20, 40, 18, '#da1acaff', '#00ffff', 'left');
                if (!player.isAlive && player.respawnTimer != null && player.respawnTimer > 0) {
                    const secs = Math.ceil(player.respawnTimer);
                    const text = t('respawnIn', { n: secs });
                    const cx = viewWidth / 2;
                    const cy = Math.floor(this.canvas.height * 0.45);
                    drawNeonText(this.ctx, text, cx, cy, 22, '#ffffff', 'rgba(0,220,255,0.9)', 'center', 6);
                }
            }
            
            this.ctx.restore();
        }
        
        // Draw combo effect for solo mode (as it's per-player)
        if (this.mode === 'solo') {
            this.players.forEach(player => {
                this.ctx.save();
                this.ctx.translate(player.viewport.x, 0);
                this.comboEffect.draw(this.ctx, player, this.canvas);
                this.ctx.restore();
            });
        }


        if (playerCount > 1) {
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(viewWidth, 0, GAME_CONFIG.VIEWPORT_GAP, this.canvas.height);
        }

        // Draw global effects
        this.particles.forEach(p => {
            if (p.viewportX !== undefined) {
                this.ctx.save();
                this.ctx.translate(p.viewportX, 0);
                p.draw(this.ctx);
                this.ctx.restore();
            } else {
                p.draw(this.ctx);
            }
        });
        this.floatingTexts.forEach(t => t.draw(this.ctx));

        // Draw UI buttons
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
