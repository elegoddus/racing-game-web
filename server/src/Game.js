const Player = require('./entities/Player.js');
const Obstacle = require('./entities/Obstacle.js');
const Coin = require('./entities/Coin.js');
const PowerUp = require('./entities/PowerUp.js');
const { GAME_CONFIG, PLAYER_COUNT, LANE_COUNT, obstaclePatterns } = require('./config.js');

class Game {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map();
        this.gameState = 'waiting';
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.fallSpeed = GAME_CONFIG.INITIAL_FALL_SPEED;
        this.lastTime = 0;
        this.roadOffset = 0;

        this.PLAYER_VIEW_WIDTH = (1200 - GAME_CONFIG.VIEWPORT_GAP) / PLAYER_COUNT;
        this.LANE_WIDTH = this.PLAYER_VIEW_WIDTH / LANE_COUNT;
        this.GROUND_Y = 800;
    }

    start() {
        this.gameState = 'playing';
        // initGame() is now called by the RoomManager before the game loop starts.
    }

    addPlayer(socketId, playerName) {
        // Store player data temporarily. The full Player object will be created in initGame.
        this.players.set(socketId, {
            name: playerName,
        });
    }

    initGame() {
        let playerIndex = 0;
        this.players.forEach((playerData, socketId) => {
            const viewport = { x: playerIndex * (this.PLAYER_VIEW_WIDTH + GAME_CONFIG.VIEWPORT_GAP), y: 0, w: this.PLAYER_VIEW_WIDTH, h: 800 };
            const newPlayer = new Player(playerIndex, playerData.name, this.GROUND_Y, this.LANE_WIDTH, viewport);
            this.players.set(socketId, newPlayer);
            playerIndex++;
        });

        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.fallSpeed = GAME_CONFIG.INITIAL_FALL_SPEED;
        this.lastTime = 0;
        this.spawnObstaclePattern();
    }

    spawnObstaclePattern() {
        const obstacleTypes = ['tree', 'log', 'pit', 'crate', 'rock'];
        const patternIndex = Math.floor(Math.random() * obstaclePatterns.length);
        const pattern = obstaclePatterns[patternIndex];
        const obsW = this.LANE_WIDTH * 0.9;
        const obsH = obsW * 1.2;
        for (let row = 0; row < 5; row++) {
            for (let lane = 0; lane < LANE_COUNT; lane++) {
                const y = -row * (obsH + 350);
                if (pattern[row][lane] === 1) {
                    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
                    this.obstacles.push(new Obstacle(lane, y, obsW, obsH, type));
                } else if (Math.random() < 0.2) {
                    this.coins.push(new Coin(lane, y + 60, 80, this.LANE_WIDTH));
                } else if (Math.random() < 0.05) {
                    const type = Math.random() < 0.6 ? 'shield' : 'magnet';
                    this.powerups.push(new PowerUp(lane, y + 60, 80, type));
                }
            }
        }
    }

    update(dt) {
        if (this.gameState !== 'playing') return;

        this.players.forEach(p => p.update(dt));

        this.roadOffset = (this.roadOffset + this.fallSpeed * (dt / 1000)) % GAME_CONFIG.ROAD_OFFSET_LOOP;
        this.fallSpeed += GAME_CONFIG.FALL_SPEED_INCREASE_RATE;
        
        this.obstacles.forEach(o => o.update(this.fallSpeed, dt));
        this.coins.forEach(c => c.update(this.fallSpeed, dt));
        this.powerups.forEach(p => p.update(this.fallSpeed, dt));

        this.obstacles = this.obstacles.filter(o => o.y < this.GROUND_Y);
        this.coins = this.coins.filter(c => c.y < this.GROUND_Y);
        this.powerups = this.powerups.filter(p => p.y < this.GROUND_Y);

        if (this.obstacles.length === 0 || this.obstacles[this.obstacles.length - 1].y > 200) {
            this.spawnObstaclePattern();
        }
        this.players.forEach(p => this.attractCoins(p, dt));
        this.checkCollisions();

        if (Array.from(this.players.values()).every(p => !p.isAlive)) {
            this.gameState = 'gameover';
        }
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

    checkCollisions() {
        this.players.forEach(player => {
            if (!player.isAlive) return;
            const playerRect = player.getRect();
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obs = this.obstacles[i];
                const obsRect = obs.getRect(this.LANE_WIDTH);
                if (this.rectsIntersect(playerRect, obsRect)) {
                    if (player.shieldTimer > 0) {
                        player.shieldTimer = 0;
                        this.obstacles.splice(i, 1);
                    } else {
                        const otherAlive = Array.from(this.players.values()).some(p => p !== player && p.isAlive);
                        player.die(otherAlive);
                    }
                }
            }
            for (let i = this.coins.length - 1; i >= 0; i--) {
                const coin = this.coins[i];
                if (this.rectsIntersect(playerRect, coin.getRect())) {
                    const scoreGained = GAME_CONFIG.COIN_BASE_SCORE * player.getComboMultiplier();
                    player.score += scoreGained;
                    this.coins.splice(i, 1);
                }
            }
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const powerup = this.powerups[i];
                if (this.rectsIntersect(playerRect, powerup.getRect(this.LANE_WIDTH))) {
                    if (powerup.type === 'shield') {
                        player.shieldTimer = GAME_CONFIG.SHIELD_DURATION;
                    } else if (powerup.type === 'magnet') {
                        player.magnetTimer = GAME_CONFIG.MAGNET_DURATION;
                    }
                    this.powerups.splice(i, 1);
                }
            }
        });
    }

    handlePlayerInput(socketId, input) {
        const player = this.players.get(socketId);
        if (player && input.action) {
            if (input.action === 'left') {
                player.moveLeft();
            } else if (input.action === 'right') {
                player.moveRight();
            }
        }
    }

    getGameState() {
        return {
            players: Array.from(this.players.values()),
            obstacles: this.obstacles,
            coins: this.coins,
            powerups: this.powerups,
            roadOffset: this.roadOffset,
            gameState: this.gameState
        };
    }

    rectsIntersect(r1, r2) {
        return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
    }
}

module.exports = Game;