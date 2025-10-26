export function startGame(canvasElement, options) {
    const { onGameOver, playerNames } = options;

    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');

    let animationFrameId; // ID để có thể hủy vòng lặp game

    // --- LỚP PLAYER ---
    class Player {
        constructor(id, groundY, laneWidth, playerImage, viewport, name) {
            this.id = id; // 0 cho P1, 1 cho P2
            this.name = name || `Player ${id + 1}`; // Lấy tên từ React
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
            this.shakeTimer = 0; // Thời gian rung màn hình
            this.shakeIntensity = 5; // Độ mạnh của rung
            this.isAlive = true;
            this.respawnTimer = 0; // Đếm ngược để hồi sinh (giây)
            this.invincibleTimer = 0; // Đếm ngược bất tử sau khi hồi sinh (giây)
            this.shieldRotation = 0; // Thêm: góc xoay cho khiên
            this.shieldPulse = 1; // Thêm: hiệu ứng đập cho khiên

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
        getTargetX(viewportX = 0) {
            return this.lane * this.laneWidth + (this.laneWidth - this.w) / 2;
        }

        // Cập nhật vị trí để di chuyển mượt mà
        update(dt) {
            const dtSeconds = dt / 1000;

            if (!this.isAlive) {
                this.respawnTimer -= dtSeconds;
                if (this.respawnTimer <= 0) {
                    this.respawn();
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
                this.lane--;
                this.rotationVelocity -= 7;
            }
        }

        moveRight() {
            if (this.isAlive && this.lane < LANE_COUNT - 1) {
                this.lane++;
                this.rotationVelocity += 7;
            }
        }

        die() {
            if (this.invincibleTimer > 0 || this.shieldTimer > 0) return;
            this.isAlive = false;
            this.shakeTimer = GAME_CONFIG.SHAKE_DURATION;
            this.respawnTimer = GAME_CONFIG.RESPAWN_TIME;
        }

        respawn() {
            this.isAlive = true;
            this.lane = 2;
            this.invincibleTimer = GAME_CONFIG.INVINCIBLE_TIME_AFTER_RESPAWN;
            this.rotation = 0;
            this.combo = 0;
            this.comboTimer = 0;
            this.comboPulse = 1.0;
            this.rotationVelocity = 0;
        }

        draw(ctx) {
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
            return { x: this.x + paddingX, y: this.y + paddingY, w: this.w - paddingX * 2, h: this.h - paddingY * 2 };
        }

        getNearMissRect(laneWidth) {
            const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
            return { x: x - 20, y: this.y - 20, w: this.w + 40, h: this.h + 40 };
        }
    }

    // --- LỚP OBSTACLE ---
    class Obstacle {
        constructor(lane, y, w, h, image) {
            this.lane = lane;
            this.y = y;
            this.w = w;
            this.h = h;
            this.image = image;
            this.isNearMiss = false;
        }
        update(fallSpeed, dt) {
            this.y += fallSpeed * (dt / 1000);
        }
        draw(ctx, laneWidth) {
            const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
            ctx.drawImage(this.image, x, this.y, this.w, this.h);
        }
        getRect(laneWidth) {
            const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
            let padding = this.w * 0.15;
            return { x: x + padding, y: this.y + padding, w: this.w - padding * 2, h: this.h - padding * 2 };
        }
        getNearMissRect(laneWidth) {
            const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
            return { x: x - 20, y: this.y - 20, w: this.w + 40, h: this.h + 40 };
        }
    }

    // --- LỚP COIN ---
    class Coin {
        constructor(lane, y, size, image) {
            this.lane = lane;
            this.y = y;
            this.size = size;
            this.image = image;
            this.x = this.lane * LANE_WIDTH + (LANE_WIDTH - this.size) / 2;
        }
        update(fallSpeed, dt) {
            this.y += fallSpeed * (dt / 1000);
        }
        draw(ctx, laneWidth) {
            ctx.drawImage(this.image, this.x, this.y, this.size, this.size);
        }
        getRect(laneWidth) {
            let padding = this.size * 0.1;
            return { x: this.x + padding, y: this.y + padding, w: this.size - padding * 2, h: this.size - padding * 2 };
        }
    }

    // --- LỚP POWERUP ---
    class PowerUp {
        constructor(lane, y, size, type) {
            this.lane = lane;
            this.y = y;
            this.size = size;
            this.type = type;
            this.image = (type === 'shield') ? assets.powerup_shield : assets.powerup_magnet;
        }
        update(fallSpeed, dt) {
            this.y += fallSpeed * (dt / 1000);
        }
        draw(ctx, laneWidth) {
            const centerX = this.lane * laneWidth + laneWidth / 2;
            const x = centerX - this.size / 2;
            ctx.drawImage(this.image, x, this.y, this.size, this.size);
        }
        getRect(laneWidth) {
            const centerX = this.lane * laneWidth + laneWidth / 2;
            const x = centerX - this.size / 2;
            let padding = this.size * 0.1;
            return { x: x + padding, y: this.y + padding, w: this.size - padding * 2, h: this.size - padding * 2 };
        }
    }

    // --- LỚP PARTICLE (HIỆU ỨNG) ---
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = (Math.random() - 0.5) * 3 - 1;
            this.life = 20 + Math.random() * 20;
            this.initialLife = this.life;
            this.size = 2 + Math.random() * 4;
            this.color = color;
        }
        update(dt) {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= (dt / 16);
        }
        draw(ctx) {
            const alpha = Math.max(0, this.life / this.initialLife);
            ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- LỚP FLOATING TEXT (HIỆU ỨNG CHỮ BAY) ---
    class FloatingText {
        constructor(text, x, y, color, size, viewportX) {
            this.text = text;
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = size;
            this.viewportX = viewportX;
            this.life = 1.0;
            this.vy = -60;
        }
        update(dt) {
            const dtSeconds = dt / 1000;
            this.y += this.vy * dtSeconds;
            this.life -= dtSeconds;
        }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.viewportX, 0);
            const alpha = Math.max(0, this.life);
            const fillColor = `rgba(${this.color}, ${alpha})`;
            const glowColor = `rgba(255, 255, 255, ${alpha * 0.5})`;
            drawNeonText(ctx, this.text, this.x, this.y, `${this.size}px 'Noto Sans'`, fillColor, glowColor, 'center', 2);
            ctx.restore();
        }
    }

    // --- CÁC HẰNG SỐ VÀ CẤU HÌNH GAME ---
    const GAME_CONFIG = {
        RESPAWN_TIME: 10,
        INVINCIBLE_TIME_AFTER_RESPAWN: 3,
        SHIELD_DURATION: 7,
        MAGNET_DURATION: 8,
        COIN_BASE_SCORE: 100,
        NEAR_MISS_BONUS: 25,
        COMBO_DURATION: 2.0,
        COMBO_SCORE_MULTIPLIER_STEP: 5,
        INITIAL_FALL_SPEED: 300,
        FALL_SPEED_INCREASE_RATE: 0.1,
        LANE_DASH_LENGTH: 40,
        LANE_DASH_GAP: 20,
        ROAD_OFFSET_LOOP: 60,
        SHAKE_DURATION: 0.3,
        SHAKE_INTENSITY: 5,
    };

    // --- PHẦN KHỞI TẠO GAME CHÍNH ---
    const PLAYER_COUNT = 2;
    const VIEWPORT_GAP = 50;
    const LANE_COUNT = 5;
    const PLAYER_VIEW_WIDTH = (canvas.width - VIEWPORT_GAP) / PLAYER_COUNT;
    const LANE_WIDTH = PLAYER_VIEW_WIDTH / LANE_COUNT;
    const GROUND_Y = canvas.height;

    let players = [];
    let obstacles = [];
    let coins = [];
    let powerups = [];
    let particles = [];
    let floatingTexts = [];
    let fallSpeed = GAME_CONFIG.INITIAL_FALL_SPEED;
    let gameState = 'playing'; // Bắt đầu game ngay lập tức
    let lastTime = 0;
    let roadOffset = 0;

    const obstaclePatterns = [
        [[0,1,0,0,1], [1,0,1,0,0], [0,0,0,1,0], [1,0,1,0,0], [0,1,0,0,0]],
        [[1,0,0,1,0], [0,0,1,0,1], [0,1,0,0,0], [1,0,1,0,0], [0,0,0,1,0]],
        [[0,0,1,0,0], [1,0,0,1,0], [0,1,0,0,1], [0,0,1,0,0], [1,0,0,0,1]],
        [[1,0,1,0,0], [0,1,0,0,1], [1,0,0,1,0], [0,0,1,0,1], [0,1,0,0,0]],
        [[0,0,1,0,1], [1,0,0,0,0], [0,1,0,1,0], [0,0,0,0,1], [1,0,1,0,0]],
        [[0,1,0,0,0], [1,0,0,1,0], [0,0,1,0,1], [1,0,0,0,0], [0,1,0,0,1]],
        [[0,0,0,1,0], [1,0,1,0,0], [0,0,1,0,1], [0,1,0,0,0], [1,0,0,1,0]],
        [[1,0,1,0,0], [0,1,0,1,0], [0,0,0,0,1], [1,0,1,0,0], [0,0,1,0,0]],
        [[0,1,0,0,0], [1,0,0,1,0], [0,1,0,0,1], [1,0,1,0,0], [0,0,0,1,0]],
        [[1,0,0,1,0], [0,1,0,0,1], [0,0,1,0,0], [1,0,0,1,0], [0,1,0,0,0]]
    ];

    const assetSources = {
        player: '/assets/image/player.png',
        coin: '/assets/image/coin.png',
        obstacle_tree: '/assets/image/tree.png',
        obstacle_log: '/assets/image/log.png',
        obstacle_pit: '/assets/image/pit.png',
        obstacle_crate: '/assets/image/crate.png',
        obstacle_rock: '/assets/image/rock.png',
        powerup_shield: '/assets/image/shield.png',
        shield_effect: '/assets/image/shield_effect.png',
        powerup_magnet: '/assets/image/magnet.png'
    };

    function processImageTransparency(image, colorToRemove = {r: 255, g: 255, b: 255}) {
        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d');
        offscreenCanvas.width = image.naturalWidth;
        offscreenCanvas.height = image.naturalHeight;
        offscreenCtx.drawImage(image, 0, 0);
        const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (Math.abs(r - colorToRemove.r) < 10 && Math.abs(g - colorToRemove.g) < 10 && Math.abs(b - colorToRemove.b) < 10) {
                data[i + 3] = 0;
            }
        }
        offscreenCtx.putImageData(imageData, 0, 0);
        return offscreenCanvas;
    }

    const assets = {};
    let obstacleImages = [];

    function loadAsset(key, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                let processedImage = img;
                if (key.startsWith('obstacle_') && key !== 'obstacle_pit') {
                    if (key === 'obstacle_crate') {
                        processedImage = processImageTransparency(img, {r: 211, g: 211, b: 211});
                    } else {
                        processedImage = processImageTransparency(img, {r: 255, g: 255, b: 255});
                    }
                } else if (key === 'player' || key.startsWith('powerup_') || key === 'shield_effect') {
                    processedImage = processImageTransparency(img, {r: 255, g: 255, b: 255});
                }
                assets[key] = processedImage;
                resolve(processedImage);
            };
            img.onerror = () => reject(`Không thể tải được ảnh: ${src}`);
        });
    }

    async function loadAssetsAndStart() {
        const promises = Object.entries(assetSources).map(([key, src]) => loadAsset(key, src));
        try {
            await Promise.all(promises);
            console.log("Tất cả hình ảnh đã được tải thành công!");
            obstacleImages = [assets.obstacle_tree, assets.obstacle_log, assets.obstacle_pit, assets.obstacle_crate, assets.obstacle_rock];
            initGame();
            animationFrameId = requestAnimationFrame(gameLoop);
        } catch (error) {
            console.error(error);
            ctx.fillStyle = 'red';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(error, canvas.width / 2, canvas.height / 2);
        }
    }

    function initGame() {
        players = [];
        for (let i = 0; i < PLAYER_COUNT; i++) {
            const viewport = { x: i * (PLAYER_VIEW_WIDTH + VIEWPORT_GAP), y: 0, w: PLAYER_VIEW_WIDTH, h: canvas.height };
            players.push(new Player(i, GROUND_Y, LANE_WIDTH, assets.player, viewport, playerNames[i]));
            players[i].invincibleTimer = GAME_CONFIG.INVINCIBLE_TIME_AFTER_RESPAWN;
        }
        obstacles = [];
        coins = [];
        powerups = [];
        particles = [];
        floatingTexts = [];
        gameState = 'playing';
        fallSpeed = GAME_CONFIG.INITIAL_FALL_SPEED;
        lastTime = 0;
        spawnObstaclePattern();
    }

    function spawnObstaclePattern() {
        const patternIndex = Math.floor(Math.random() * obstaclePatterns.length);
        const pattern = obstaclePatterns[patternIndex];
        const obsW = LANE_WIDTH * 0.9;
        const obsH = obsW * 1.2;
        for (let row = 0; row < 5; row++) {
            for (let lane = 0; lane < LANE_COUNT; lane++) {
                const y = -row * (obsH + 350);
                if (pattern[row][lane] === 1) {
                    const obstacleImage = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
                    obstacles.push(new Obstacle(lane, y, obsW, obsH, obstacleImage));
                } else if (Math.random() < 0.2) {
                    coins.push(new Coin(lane, y + 60, 80, assets.coin));
                } else if (Math.random() < 0.05) {
                    const type = Math.random() < 0.6 ? 'shield' : 'magnet';
                    powerups.push(new PowerUp(lane, y + 60, 80, type));
                }
            }
        }
    }

    function gameLoop(timestamp) {
        if (gameState !== 'playing') {
            return;
        }

        if (lastTime === 0) {
            lastTime = timestamp;
            animationFrameId = requestAnimationFrame(gameLoop);
            return;
        }

        const dt = timestamp - lastTime;
        lastTime = timestamp;

        update(dt);
        draw();
        
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        players.forEach(p => p.update(dt));
        roadOffset = (roadOffset + fallSpeed * (dt / 1000)) % GAME_CONFIG.ROAD_OFFSET_LOOP;
        fallSpeed += GAME_CONFIG.FALL_SPEED_INCREASE_RATE;

        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].update(fallSpeed, dt);
            if (obstacles[i].y > canvas.height) obstacles.splice(i, 1);
        }
        for (let i = coins.length - 1; i >= 0; i--) {
            coins[i].update(fallSpeed, dt);
            if (coins[i].y > canvas.height) coins.splice(i, 1);
        }
        for (let i = powerups.length - 1; i >= 0; i--) {
            powerups[i].update(fallSpeed, dt);
            if (powerups[i].y > canvas.height) powerups.splice(i, 1);
        }

        particles = particles.filter(p => p.life > 0);
        particles.forEach(p => p.update(dt));
        floatingTexts = floatingTexts.filter(t => t.life > 0);
        floatingTexts.forEach(t => t.update(dt));

        if (obstacles.length === 0 || obstacles[obstacles.length - 1].y > 200) {
            spawnObstaclePattern();
        }
        
        players.forEach(p => attractCoins(p, dt));
        checkCollisions();
    }

    function attractCoins(player, dt) {
        if (!player.isAlive || player.magnetTimer <= 0) return;
        const playerCenterX = player.x + player.w / 2;
        const playerCenterY = player.y + player.h / 2;
        const magnetRadius = 250;
        const attractionSpeed = 5;
        const dtSeconds = dt / 1000;
        coins.forEach(coin => {
            const coinCenterX = coin.x + coin.size / 2;
            const distance = Math.hypot(playerCenterX - coinCenterX, playerCenterY - coin.y);
            if (distance < magnetRadius) {
                coin.y += (playerCenterY - coin.y) * attractionSpeed * dtSeconds;
                coin.x += (playerCenterX - coinCenterX) * attractionSpeed * dtSeconds;
            }
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        players.forEach(player => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(player.viewport.x, player.viewport.y, player.viewport.w, player.viewport.h);
            ctx.clip();
            ctx.translate(player.viewport.x, 0);
            ctx.fillStyle = '#404040';
            ctx.fillRect(0, 0, player.viewport.w, player.viewport.h);
            ctx.strokeStyle = '#777';
            ctx.lineWidth = 4;
            ctx.setLineDash([GAME_CONFIG.LANE_DASH_LENGTH, GAME_CONFIG.LANE_DASH_GAP]);
            for (let i = 1; i < LANE_COUNT; i++) {
                ctx.beginPath();
                ctx.lineDashOffset = -roadOffset;
                ctx.moveTo(i * LANE_WIDTH, 0);
                ctx.lineTo(i * LANE_WIDTH, canvas.height);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            player.draw(ctx);
            obstacles.forEach(o => o.draw(ctx, LANE_WIDTH));
            coins.forEach(c => c.draw(ctx, LANE_WIDTH));
            powerups.forEach(p => p.draw(ctx, LANE_WIDTH));

            drawNeonText(ctx, `${player.name}: ${Math.floor(player.score)}`, 20, 40, "18px 'Noto Sans'", '#da1acaff', '#00ffff', 'left');

            if (player.combo > 1) {
                ctx.save();
                const baseComboSize = 18 + Math.min(10, player.combo);
                const comboSize = baseComboSize * player.comboPulse;
                const comboColor = player.combo > 10 ? '255, 0, 255' : '0, 255, 255';
                const comboX = PLAYER_VIEW_WIDTH - 25;
                const comboY = canvas.height / 3;
                const swayAngle = Math.sin(lastTime / 250) * 0.1;
                const comboRotation = 0.2 + swayAngle;
                ctx.translate(comboX, comboY);
                ctx.rotate(comboRotation);
                drawNeonText(ctx, `x${player.combo} COMBO`, 0, 0, `${comboSize}px 'Noto Sans'`, '#fff', `rgb(${comboColor})`, 'right', (2 + player.comboPulse));
                ctx.restore();
            }

            if (!player.isAlive) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(0, canvas.height / 2 - 40, PLAYER_VIEW_WIDTH, 80);
                drawNeonText(ctx, `Hồi sinh: ${Math.ceil(player.respawnTimer)}`, PLAYER_VIEW_WIDTH / 2, canvas.height / 2 + 15, "24px 'Noto Sans'", '#fff', '#ff00ff');
            }
            ctx.restore();
        });

        ctx.fillStyle = '#333';
        ctx.fillRect(PLAYER_VIEW_WIDTH, 0, VIEWPORT_GAP, canvas.height);
        particles.forEach(p => p.draw(ctx));
        floatingTexts.forEach(t => t.draw(ctx));
    }

    function checkCollisions() {
        players.forEach(player => {
            if (!player.isAlive) return;
            const playerRect = player.getRect();
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obs = obstacles[i];
                const obsRect = obs.getRect(LANE_WIDTH);
                let collided = false;
                if (rectsIntersect(playerRect, obsRect)) {
                    collided = true;
                    if (player.shieldTimer > 0) {
                        player.shieldTimer = 0;
                        obstacles.splice(i, 1);
                    } else {
                        player.die();
                    }
                } else if (!collided && !obs.isNearMiss && player.isAlive && player.shieldTimer <= 0) {
                    const nearMissRect = obs.getNearMissRect(LANE_WIDTH);
                    if (rectsIntersect(playerRect, nearMissRect)) {
                        awardNearMiss(player);
                        obs.isNearMiss = true;
                    }
                }
            }

            for (let i = coins.length - 1; i >= 0; i--) {
                const coin = coins[i];
                const coinRect = coin.getRect(LANE_WIDTH);
                if (rectsIntersect(playerRect, coinRect)) {
                    player.combo++;
                    player.comboPulse = 1.6;
                    player.comboTimer = GAME_CONFIG.COMBO_DURATION;
                    const scoreGained = GAME_CONFIG.COIN_BASE_SCORE * Math.floor(1 + player.combo / GAME_CONFIG.COMBO_SCORE_MULTIPLIER_STEP);
                    player.score += scoreGained;
                    floatingTexts.push(new FloatingText(`+${scoreGained}`, coin.x + coin.size / 2, coin.y, '255, 215, 0', 16, player.viewport.x));
                    const particleX = player.viewport.x + coin.x + coin.size / 2;
                    for (let j = 0; j < 5; j++) {
                        particles.push(new Particle(particleX, coin.y + coin.size / 2, '255, 215, 0'));
                    }
                    coins.splice(i, 1);
                }
            }

            for (let i = powerups.length - 1; i >= 0; i--) {
                const powerup = powerups[i];
                const powerupRect = powerup.getRect(LANE_WIDTH);
                if (rectsIntersect(playerRect, powerupRect)) {
                    if (powerup.type === 'shield') {
                        player.shieldTimer = GAME_CONFIG.SHIELD_DURATION;
                    } else if (powerup.type === 'magnet') {
                        player.magnetTimer = GAME_CONFIG.MAGNET_DURATION;
                    }
                    powerups.splice(i, 1);
                }
            }
        });

        if (players.every(p => !p.isAlive)) {
            if (gameState !== 'gameover') {
                gameState = 'gameover';
                const finalScores = players.map(p => ({ name: p.name, score: Math.floor(p.score) }));
                
                // Gửi điểm của từng người chơi lên server
                finalScores.forEach(playerScore => {
                    sendScoreToServer(playerScore.score, playerScore.name);
                });

                // Gọi callback để báo cho React biết game đã kết thúc
                if (onGameOver) {
                    onGameOver(finalScores);
                }
            }
        }
    }

    async function sendScoreToServer(score, playerName) {
        try {
            await fetch('http://localhost:3001/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, playerName })
            });
            console.log(`Score for ${playerName} sent successfully.`);
        } catch (error) {
            console.error('Failed to send score:', error);
        }
    }

    function rectsIntersect(r1, r2) {
        return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
    }

    function awardNearMiss(player) {
        const bonus = GAME_CONFIG.NEAR_MISS_BONUS;
        player.score += bonus;
        player.combo++;
        player.comboPulse = 1.6;
        player.comboTimer = GAME_CONFIG.COMBO_DURATION;
        floatingTexts.push(new FloatingText(`+${bonus} Né!`, PLAYER_VIEW_WIDTH - 60, canvas.height * 0.6, '173, 216, 230', 18, player.viewport.x));
    }

    function drawNeonText(ctx, text, x, y, font, fillColor, glowColor, align = 'center', glowWidth = 4) {
        ctx.font = font;
        ctx.textAlign = align;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = glowWidth;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
    }

    const handleKeyDown = (e) => {
        if (gameState !== 'playing') return;
        if (e.key === 'a' || e.key === 'A') players[0].moveLeft();
        else if (e.key === 'd' || e.key === 'D') players[0].moveRight();
        if (e.key === 'ArrowLeft') players[1].moveLeft();
        else if (e.key === 'ArrowRight') players[1].moveRight();
    };

    window.addEventListener('keydown', handleKeyDown);

    // Bắt đầu tải ảnh và khởi chạy game
    loadAssetsAndStart();

    // Trả về một object chứa hàm dọn dẹp
    return {
        cleanup: () => {
            console.log("Cleaning up game instance...");
            window.removeEventListener('keydown', handleKeyDown);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            // Reset tất cả các biến trạng thái game
            players = [];
            obstacles = [];
            coins = [];
            powerups = [];
            particles = [];
            floatingTexts = [];
            gameState = 'stopped';
        }
    };
}