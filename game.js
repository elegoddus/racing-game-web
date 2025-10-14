// --- LỚP PLAYER ---
class Player {
    constructor(id, groundY, laneWidth, playerImage, viewport) {
        this.id = id; // 0 cho P1, 1 cho P2
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
        // Sử dụng .width và .height vì `this.image` có thể là <canvas> hoặc <image>
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

        // Nếu người chơi đang chết, đếm ngược để hồi sinh
        if (!this.isAlive) {
            this.respawnTimer -= dtSeconds;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return; // Không làm gì khác nếu đang chết
        }

        // Đếm ngược thời gian khiên
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dtSeconds;
            // Cập nhật hiệu ứng cho khiên
            this.shieldRotation += 2 * dtSeconds; // Xoay
            this.shieldPulse = 1 + Math.sin(this.shieldRotation * 5) * 0.05; // Đập nhẹ
        }

        // Đếm ngược thời gian nam châm
        if (this.magnetTimer > 0) {
            this.magnetTimer -= dtSeconds;
        }

        // Đếm ngược thời gian combo
        if (this.comboTimer > 0) {
            this.comboTimer -= dtSeconds;
            if (this.comboTimer <= 0) {
                this.combo = 0; // Reset combo
            }
        }

        // Cập nhật hiệu ứng phóng to của combo
        if (this.comboPulse > 1.0) {
            this.comboPulse -= 4 * dtSeconds; // Tốc độ co lại
            if (this.comboPulse < 1.0) {
                this.comboPulse = 1.0;
            }
        }

        // Đếm ngược thời gian bất tử
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dtSeconds;
        }

        // Đếm ngược thời gian rung
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dtSeconds;
        }

        const targetX = this.getTargetX();
        // Di chuyển x về phía targetX
        this.x += (targetX - this.x) * 15 * dtSeconds; // Tăng tốc độ chuyển làn một chút

        // --- Cập nhật vật lý cho hiệu ứng nghiêng xe ---
        const stiffness = 250; // Độ cứng của "lò xo" kéo xe về vị trí thẳng
        const damping = 15;    // Độ giảm chấn, giúp xe ổn định lại

        // Lực kéo về vị trí cân bằng (0 độ)
        const restoringForce = -this.rotation * stiffness;
        // Lực cản làm giảm dao động
        const dampingForce = -this.rotationVelocity * damping;

        // Gia tốc góc = tổng các lực
        const angularAcceleration = restoringForce + dampingForce;

        // Cập nhật vận tốc và góc nghiêng
        this.rotationVelocity += angularAcceleration * dtSeconds;
        this.rotation += this.rotationVelocity * dtSeconds;
    }

    moveLeft() {
        if (this.isAlive && this.lane > 0) {
            this.lane--;
            this.rotationVelocity -= 7; // "Đẩy" xe nghiêng về bên trái (tăng độ nghiêng)
        }
    }

    moveRight() {
        if (this.isAlive && this.lane < LANE_COUNT - 1) {
            this.lane++;
            this.rotationVelocity += 7; // "Đẩy" xe nghiêng về bên phải (tăng độ nghiêng)
        }
    }

    // Xử lý khi người chơi chết
    die() {
        if (this.invincibleTimer > 0 || this.shieldTimer > 0) return; // Bất tử hoặc có khiên thì không chết
        this.isAlive = false;
        this.shakeTimer = 0.3; // Rung màn hình trong 0.3 giây
        this.respawnTimer = 10; // Hồi sinh sau 10 giây
    }

    // Hồi sinh người chơi
    respawn() {
        this.isAlive = true;
        this.lane = 2; // Về làn giữa
        this.invincibleTimer = 3; // Bất tử trong 3 giây
        this.rotation = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.comboPulse = 1.0;
        this.rotationVelocity = 0;
    }

    // Phương thức vẽ player lên canvas
    draw(ctx) {
        if (!this.isAlive) return; // Không vẽ nếu đang chết

        // Lưu trạng thái canvas trước khi áp dụng transform và alpha
        ctx.save();

        // Sửa lại: Hiệu ứng nhấp nháy khi bất tử
        if (this.invincibleTimer > 0) {
            // Làm cho xe mờ đi xen kẽ để tạo hiệu ứng nhấp nháy
            if (Math.floor(this.invincibleTimer * 10) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }
        }

        // Áp dụng hiệu ứng rung màn hình (chỉ tác động lên viewport của player này)
        let shakeX = 0;
        let shakeY = 0;
        if (this.shakeTimer > 0) {
            shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        }
        // Di chuyển gốc tọa độ đến tâm của chiếc xe để xoay quanh tâm
        ctx.translate(this.x + this.w / 2 + shakeX, this.y + this.h / 2 + shakeY);
        // Xoay canvas theo góc nghiêng của xe
        ctx.rotate(this.rotation);

        // Vẽ khiên nếu có
        if (this.shieldTimer > 0) {
            ctx.save();
            const shieldSize = (this.w + 30) * this.shieldPulse;
            ctx.translate(0, 0); // Tâm đã ở (0,0)
            ctx.rotate(this.shieldRotation);
            // Vẽ tại tọa độ tương đối (-width/2, -height/2) vì đã translate
            ctx.globalAlpha = 0.5 + Math.sin(this.shieldRotation * 2) * 0.2; // Nhấp nháy nhẹ
            ctx.drawImage(assets.shield_effect, -shieldSize / 2, -shieldSize / 2, shieldSize, shieldSize);
            ctx.globalAlpha = 1.0;
            ctx.restore();
        }

        ctx.drawImage(this.image, -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore(); // Khôi phục lại tất cả trạng thái đã lưu (vị trí, góc xoay, rung, và globalAlpha)
    }

    // Lấy hitbox để kiểm tra va chạm
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

    // Vùng nguy hiểm lớn hơn để tính điểm né
    getNearMissRect(laneWidth) {
        const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
        return {
            x: x - 20,
            y: this.y - 20,
            w: this.w + 40,
            h: this.h + 40
        };
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
        this.isNearMiss = false; // Đánh dấu đã được tính điểm né chưa
    }

    // Cập nhật vị trí của vật cản
    update(fallSpeed, dt) {
        this.y += fallSpeed * (dt / 1000); // Khôi phục lại hàm update đơn giản
    }
    
    draw(ctx, laneWidth) {
        const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
        ctx.drawImage(this.image, x, this.y, this.w, this.h);
    }
    
    getRect(laneWidth) {
        const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
        let padding = this.w * 0.15;
        return {
            x: x + padding,
            y: this.y + padding,
            w: this.w - padding * 2,
            h: this.h - padding * 2
        };
    }

    // Vùng nguy hiểm lớn hơn để tính điểm né
    getNearMissRect(laneWidth) {
        const x = this.lane * laneWidth + (laneWidth - this.w) / 2;
        return {
            x: x - 20,
            y: this.y - 20,
            w: this.w + 40,
            h: this.h + 40
        };
    }
}


// --- LỚP COIN ---
class Coin {
    constructor(lane, y, size, image) {
        this.lane = lane;
        this.y = y;
        this.size = size;
        this.image = image;
        this.x = this.lane * LANE_WIDTH + (LANE_WIDTH - this.size) / 2; // Sửa lỗi: Dùng hằng số LANE_WIDTH
    }

    update(fallSpeed, dt) {
        this.y += fallSpeed * (dt / 1000);
    }

    draw(ctx, laneWidth) {
        // Thêm hiệu ứng tại đây nếu muốn
        ctx.drawImage(this.image, this.x, this.y, this.size, this.size);
    }
    
    getRect(laneWidth) {
        // Cập nhật x trước khi lấy rect để logic hút coin hoạt động đúng
        // this.x được cập nhật bởi logic hút coin, không nên gán lại ở đây
        let padding = this.size * 0.1;
        return {
            x: this.x + padding,
            y: this.y + padding,
            w: this.size - padding * 2, // Giảm hitbox một chút
            h: this.size - padding * 2  // Giảm hitbox một chút
        };
    }
}

// --- LỚP POWERUP ---
class PowerUp {
    constructor(lane, y, size, type) {
        this.lane = lane;
        this.y = y;
        this.size = size;
        this.type = type; // 'shield' hoặc 'magnet'
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
        return {
            x: x + padding,
            y: this.y + padding,
            w: this.size - padding * 2,
            h: this.size - padding * 2
        };
    }
}

// --- LỚP PARTICLE (HIỆU ỨNG) ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3 - 1; // Hơi bay lên
        this.life = 20 + Math.random() * 20;
        this.initialLife = this.life;
        this.size = 2 + Math.random() * 4;
        this.color = color;
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= (dt / 16); // Giảm life theo dt
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
        drawNeonText(ctx, this.text, this.x, this.y, `${this.size}px 'Press Start 2P'`, fillColor, glowColor, 'center', 2);
        ctx.restore();
    }
}

// --- PHẦN KHỞI TẠO GAME CHÍNH ---

// Lấy canvas và context để vẽ
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Các hằng số game
const PLAYER_COUNT = 2;
const VIEWPORT_GAP = 50; // Khoảng cách giữa 2 màn hình
const LANE_COUNT = 5;
const PLAYER_VIEW_WIDTH = (canvas.width - VIEWPORT_GAP) / PLAYER_COUNT;
const LANE_WIDTH = PLAYER_VIEW_WIDTH / LANE_COUNT;
const GROUND_Y = canvas.height; // Xe sẽ ở cuối màn hình

// Các biến trạng thái game
let players = [];
let obstacles = [];
let coins = [];
let powerups = [];
let particles = [];
let floatingTexts = [];
let fallSpeed = 300; // Tốc độ rơi (pixels/giây)
let gameOver = false;
let lastTime = 0;
let roadOffset = 0; // Thêm: offset cho vạch kẻ đường

// Mảng ma trận chướng ngại vật (chuyển từ Java)
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
    // Thêm 8 pattern còn lại của bạn vào đây...
];

// --- TẢI HÌNH ẢNH (ASSETS) ---

// Danh sách các file ảnh cần tải
const assetSources = {
    player: 'image/player.png',
    coin: 'image/coin.png',
    // Vật cản
    obstacle_tree: 'image/tree.png',
    obstacle_log: 'image/log.png',
    obstacle_pit: 'image/pit.png',
    obstacle_crate: 'image/crate.png',
    obstacle_rock: 'image/rock.png',
    // Power-ups
    powerup_shield: 'image/shield.png',
    shield_effect: 'image/shield_effect.png', // Ảnh hiệu ứng khiên bao quanh xe
    powerup_magnet: 'image/magnet.png'
};

// --- HÀM XỬ LÝ NỀN TRONG SUỐT CHO ẢNH ---
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

        // Nếu màu của pixel gần giống với màu cần xóa, làm nó trong suốt
        // (Thêm một khoảng sai số nhỏ để xử lý các biến thể của màu trắng/xám)
        if (Math.abs(r - colorToRemove.r) < 10 && Math.abs(g - colorToRemove.g) < 10 && Math.abs(b - colorToRemove.b) < 10) {
            data[i + 3] = 0; // Đặt Alpha (độ trong suốt) thành 0
        }
    }

    offscreenCtx.putImageData(imageData, 0, 0);
    return offscreenCanvas; // Trả về canvas đã được xử lý, có thể dùng như một ảnh
}


const assets = {};
// Mảng mới để tiện lấy ngẫu nhiên ảnh vật cản
let obstacleImages = [];

// Hàm tải một ảnh và trả về một Promise
function loadAsset(key, src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            let processedImage = img;
            // Chỉ xử lý các ảnh có nền trắng hoặc xám, trừ ảnh 'pit' (hố đen)
            if (key.startsWith('obstacle_') && key !== 'obstacle_pit') {
                 // Ảnh 'crate' có nền xám, các ảnh khác có nền trắng
                if (key === 'obstacle_crate') {
                    processedImage = processImageTransparency(img, {r: 211, g: 211, b: 211});
                } else {
                    processedImage = processImageTransparency(img, {r: 255, g: 255, b: 255});
                }
            } else if (key === 'player' || key.startsWith('powerup_') || key === 'shield_effect') {
                // Xử lý nền trắng cho player và các power-up
                processedImage = processImageTransparency(img, {r: 255, g: 255, b: 255});
            }

            assets[key] = processedImage;
            resolve(processedImage); // Sửa lỗi 1: Trả về ảnh đã được xử lý
        };
        img.onerror = () => reject(`Không thể tải được ảnh: ${src}`);
    });
}

// Hàm bắt đầu tải tất cả hình ảnh bằng Promise.all
async function loadAssets() {
    const promises = Object.entries(assetSources).map(([key, src]) => loadAsset(key, src));
    try {
        await Promise.all(promises);
        console.log("Tất cả hình ảnh đã được tải thành công!");
        // Sau khi tải xong, đưa các ảnh vật cản vào mảng riêng
        obstacleImages = [assets.obstacle_tree, assets.obstacle_log, assets.obstacle_pit, assets.obstacle_crate, assets.obstacle_rock];
        initGame();
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error(error);
        // Hiển thị lỗi lên màn hình cho người dùng
        ctx.fillStyle = 'red';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(error, canvas.width / 2, canvas.height / 2);
    }
}

// --- LOGIC KHỞI TẠO VÀ CHƠI LẠI ---

function initGame() {
    // Tạo 2 người chơi
    players = [];
    for (let i = 0; i < PLAYER_COUNT; i++) {
        const viewport = {
            x: i * (PLAYER_VIEW_WIDTH + VIEWPORT_GAP),
            y: 0,
            w: PLAYER_VIEW_WIDTH,
            h: canvas.height
        };
        players.push(new Player(i, GROUND_Y, LANE_WIDTH, assets.player, viewport));
        // Cho người chơi 3 giây bất tử khi bắt đầu để tránh thua ngay lập tức
        players[i].invincibleTimer = 3; 
    }

    // Reset các biến
    obstacles = [];
    coins = [];
    powerups = [];
    particles = [];
    floatingTexts = [];
    gameOver = false; 
    fallSpeed = 300;
    lastTime = 0;
    // Sinh ra loạt vật cản đầu tiên
    spawnObstaclePattern();
}

// Hàm sinh vật cản
function spawnObstaclePattern() {
    const patternIndex = Math.floor(Math.random() * obstaclePatterns.length);
    const pattern = obstaclePatterns[patternIndex];
    const obsW = LANE_WIDTH * 0.9;
    const obsH = obsW * 1.2; // Điều chỉnh kích thước vật cản

    for (let row = 0; row < 5; row++) {
        for (let lane = 0; lane < LANE_COUNT; lane++) {
            const y = -row * (obsH + 350); // Giảm khoảng cách giữa các hàng
            if (pattern[row][lane] === 1) {
                // Chọn ngẫu nhiên một ảnh vật cản
                const obstacleImage = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
                obstacles.push(new Obstacle(lane, y, obsW, obsH, obstacleImage));
            } else if (Math.random() < 0.2) { // Giảm tỉ lệ ra coin một chút
                coins.push(new Coin(lane, y + 60, 80, assets.coin, LANE_WIDTH));
            } else if (Math.random() < 0.05) { // 5% tỉ lệ ra power-up
                const type = Math.random() < 0.6 ? 'shield' : 'magnet'; // 60% ra khiên, 40% ra nam châm
                powerups.push(new PowerUp(lane, y + 60, 80, type));
            }
        }
    }
}

// --- VÒNG LẶP GAME CHÍNH ---

function gameLoop(timestamp) {
    if (gameOver) {
        drawGameOver();
        return; // Dừng vòng lặp nếu game over
    }

    // Tính toán delta time (dt) - thời gian giữa các khung hình
    // Xử lý cho khung hình đầu tiên
    if (lastTime === 0) {
        lastTime = timestamp;
        requestAnimationFrame(gameLoop);
        return;
    }

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt); // Cập nhật tất cả logic
    draw();     // Vẽ tất cả mọi thứ
    
    // Yêu cầu trình duyệt gọi lại gameLoop ở khung hình tiếp theo
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    // Cập nhật trạng thái của từng người chơi
    players.forEach(p => p.update(dt));

    // Cập nhật offset cho đường chạy
    roadOffset = (roadOffset + fallSpeed * (dt / 1000)) % 60;

    fallSpeed += 0.1; // Tăng tốc độ từ từ

    // Cập nhật và xóa vật cản/coin đã ra khỏi màn hình
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

    // Chỉ cập nhật các hiệu ứng toàn cục
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.update(dt));
    floatingTexts = floatingTexts.filter(t => t.life > 0);
    floatingTexts.forEach(t => t.update(dt));

    // Sinh thêm vật cản nếu cần
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].y > 200) {
        spawnObstaclePattern();
    }
    
    // Hút coin nếu có nam châm
    players.forEach(p => attractCoins(p, dt));

    // Kiểm tra va chạm
    checkCollisions();
}

// --- HÀM HÚT COIN BẰNG NAM CHÂM ---
function attractCoins(player, dt) {
    if (!player.isAlive || player.magnetTimer <= 0) return;

    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;

    coins.forEach(coin => {
        const coinCenterX = coin.x + coin.size / 2;
        // Chỉ hút các coin ở gần
        const distance = Math.hypot(playerCenterX - coinCenterX, playerCenterY - coin.y);
        if (distance < 250) { // Bán kính hút là 250px
            const dtSeconds = dt / 1000;
            coin.y += (playerCenterY - coin.y) * 5 * dtSeconds;
            coin.x += (playerCenterX - coinCenterX) * 5 * dtSeconds;
        }
    });
}

function draw() {
    // Xóa toàn bộ màn hình
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ cho từng người chơi
    players.forEach(player => {
        ctx.save(); // Lưu trạng thái canvas hiện tại

        // --- Tạo viewport cho người chơi ---
        ctx.beginPath();
        ctx.rect(player.viewport.x, player.viewport.y, player.viewport.w, player.viewport.h);
        ctx.clip(); // Cắt vùng vẽ, mọi thứ vẽ sau đây chỉ hiện trong vùng này

        // Dịch chuyển gốc tọa độ đến góc trên bên trái của viewport để vẽ các đối tượng tĩnh
        ctx.translate(player.viewport.x, 0);

        // --- Vẽ mọi thứ trong viewport ---
        // Thêm vào: Vẽ nền đường màu xám sáng hơn
        ctx.fillStyle = '#404040'; // Màu xám đậm, sáng hơn màu đen
        ctx.fillRect(0, 0, player.viewport.w, player.viewport.h);
        
        // Thêm: Vẽ vạch kẻ đường chuyển động
        ctx.strokeStyle = '#777'; // Giảm độ sáng của vạch để đỡ chói
        ctx.lineWidth = 4;
        ctx.setLineDash([40, 20]); // Thay đổi: vạch dài hơn (40px), khoảng trống ngắn hơn (20px)
        for (let i = 1; i < LANE_COUNT; i++) {
            ctx.beginPath();
            ctx.lineDashOffset = -roadOffset; // Di chuyển vạch theo tốc độ chung
            ctx.moveTo(i * LANE_WIDTH, 0);
            ctx.lineTo(i * LANE_WIDTH, canvas.height);
            ctx.stroke();
        }
        ctx.setLineDash([]); // Reset lại nét vẽ

        // Vẽ người chơi và các vật thể
        player.draw(ctx);
        obstacles.forEach(o => o.draw(ctx, LANE_WIDTH));
        coins.forEach(c => c.draw(ctx, LANE_WIDTH));
        powerups.forEach(p => p.draw(ctx, LANE_WIDTH));

        // Vẽ điểm số
        drawNeonText(
            ctx,
            `P${player.id + 1} Score: ${Math.floor(player.score)}`,
            20, 40,
            "18px 'Press Start 2P'",
            '#da1acaff', // Màu lõi
            '#00ffff', // Màu viền neon (cyan)
            'left'
        );

        // Vẽ Combo
        if (player.combo > 1) {
            ctx.save(); // Lưu trạng thái trước khi xoay

            const baseComboSize = 18 + Math.min(10, player.combo);
            const comboSize = baseComboSize * player.comboPulse; // Áp dụng hiệu ứng phóng to
            const comboColor = player.combo > 10 ? '255, 0, 255' : '0, 255, 255';
            const comboX = PLAYER_VIEW_WIDTH - 25; // Chuyển ra cạnh thêm một chút
            const comboY = canvas.height / 3;      // Vị trí Y ở 1/3 màn hình
            
            // Thêm hiệu ứng lắc lư
            const swayAngle = Math.sin(lastTime / 250) * 0.1; // Góc lắc lư
            const comboRotation = 0.2 + swayAngle; // Góc nghiêng cơ bản + góc lắc lư

            // Di chuyển đến vị trí và xoay canvas
            ctx.translate(comboX, comboY);
            ctx.rotate(comboRotation);
            
            drawNeonText(
                ctx,
                `x${player.combo} COMBO`,
                0, 0, // Vẽ tại gốc tọa độ mới
                `${comboSize}px 'Press Start 2P'`,
                '#fff', `rgb(${comboColor})`,
                'right',
                (2 + player.comboPulse) // Viền dày hơn một chút khi phóng to
            );
            
            ctx.restore(); // Khôi phục lại trạng thái
        }

        // Nếu người chơi chết, hiển thị đếm ngược
        if (!player.isAlive) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, canvas.height / 2 - 40, PLAYER_VIEW_WIDTH, 80);
            drawNeonText(
                ctx,
                `Hồi sinh: ${Math.ceil(player.respawnTimer)}`,
                PLAYER_VIEW_WIDTH / 2, canvas.height / 2 + 15,
                "24px 'Press Start 2P'",
                '#fff', // Màu lõi
                '#ff00ff' // Màu viền neon (magenta)
            );
        }

        ctx.restore(); // Khôi phục lại trạng thái canvas (xóa clip và translate)
    });

    // Vẽ đường phân cách ở giữa
    ctx.fillStyle = '#333';
    ctx.fillRect(PLAYER_VIEW_WIDTH, 0, VIEWPORT_GAP, canvas.height);

    // Vẽ các hạt hiệu ứng lên trên cùng, sau khi mọi thứ đã được vẽ
    particles.forEach(p => p.draw(ctx));

    // Vẽ các dòng chữ bay
    floatingTexts.forEach(t => t.draw(ctx));
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawNeonText(ctx, 'GAME OVER', canvas.width / 2, canvas.height / 2 - 80, "40px 'Press Start 2P'", '#fff', '#ff3333');
    drawNeonText(ctx, `Player 1 Score: ${Math.floor(players[0].score)}`, canvas.width / 2, canvas.height / 2 - 20, "22px 'Press Start 2P'", '#fff', '#00ffff');
    drawNeonText(ctx, `Player 2 Score: ${Math.floor(players[1].score)}`, canvas.width / 2, canvas.height / 2 + 30, "22px 'Press Start 2P'", '#fff', '#00ffff');
    drawNeonText(ctx, 'Press Enter to Restart', canvas.width / 2, canvas.height / 2 + 80, "16px 'Press Start 2P'", '#eee', '#888');
}

// --- VA CHẠM VÀ ĐIỀU KHIỂN ---

function checkCollisions() {
    players.forEach(player => {
        // Chỉ kiểm tra va chạm nếu người chơi còn sống
        if (!player.isAlive) return;

        const playerRect = player.getRect();
        // Va chạm với vật cản
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
                // Khôi phục logic "Né" ban đầu và sửa lỗi
                const nearMissRect = obs.getNearMissRect(LANE_WIDTH);
                if (rectsIntersect(playerRect, nearMissRect)) {
                    awardNearMiss(player);
                    obs.isNearMiss = true;
                }
            }
        }

        // Ăn coin
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            const coinRect = coin.getRect(LANE_WIDTH);
            if (rectsIntersect(playerRect, coinRect)) {
                player.combo++;
                player.comboPulse = 1.6; // Kích hoạt hiệu ứng phóng to
                player.comboTimer = 2.0; // Reset thời gian duy trì combo
                const scoreGained = 100 * Math.floor(1 + player.combo / 5); // Điểm tăng theo combo
                player.score += scoreGained;

                // Tạo hiệu ứng chữ bay
                floatingTexts.push(new FloatingText(
                    `+${scoreGained}`,
                    coin.x + coin.size / 2, // Sửa lỗi: Dùng vị trí x thực tế của coin
                    coin.y,
                    '255, 215, 0', // Gold
                    16, player.viewport.x
                ));

                // Sửa lỗi: Tính toán tọa độ hạt dựa trên viewport của người chơi
                const particleX = player.viewport.x + coin.x + coin.size / 2; // Sửa lỗi: Dùng vị trí x thực tế của coin
                for (let j = 0; j < 5; j++) { // Giảm số lượng hạt
                    particles.push(new Particle(particleX, coin.y + coin.size / 2, '255, 215, 0'));
                }
                coins.splice(i, 1); // Xóa coin khỏi mảng
            }
        }

        // Ăn power-up
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            const powerupRect = powerup.getRect(LANE_WIDTH);
            if (rectsIntersect(playerRect, powerupRect)) {
                if (powerup.type === 'shield') {
                    player.shieldTimer = 7; // Kích hoạt khiên trong 7 giây
                } else if (powerup.type === 'magnet') {
                    player.magnetTimer = 8; // Kích hoạt nam châm trong 8 giây
                }
                powerups.splice(i, 1);
            }
        }
    });

    // Sửa lỗi 2: Di chuyển logic kiểm tra game over ra ngoài vòng lặp player
    if (players.every(p => !p.isAlive)) {
        gameOver = true;
    }

}

// Hàm phụ trợ kiểm tra 2 hình chữ nhật có giao nhau không
function rectsIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || 
             r2.x + r2.w < r1.x || 
             r2.y > r1.y + r1.h ||
             r2.y + r2.h < r1.y);
}

// Hàm phụ trợ để trao thưởng "Né"
function awardNearMiss(player) {
    const bonus = 25;
    player.score += bonus;

    // Thêm combo khi né thành công
    player.combo++;
    player.comboPulse = 1.6; // Kích hoạt hiệu ứng phóng to
    player.comboTimer = 2.0; // Reset thời gian duy trì combo
    floatingTexts.push(new FloatingText(
        `+${bonus} Né!`,
        PLAYER_VIEW_WIDTH - 60,
        canvas.height * 0.6,
        '173, 216, 230', // Light blue
        18,
        player.viewport.x
    ));
}

// Hàm phụ trợ vẽ chữ có viền neon
function drawNeonText(ctx, text, x, y, font, fillColor, glowColor, align = 'center', glowWidth = 4) {
    ctx.font = font;
    ctx.textAlign = align;

    // Vẽ viền
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = glowWidth;
    ctx.strokeText(text, x, y);

    // Vẽ lõi
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
}

// Lắng nghe sự kiện bàn phím
window.addEventListener('keydown', (e) => {
    if (gameOver && e.key === 'Enter') {
        initGame(); // Chơi lại khi game over
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameOver) return;

    // Điều khiển Player 1 (bên trái, dùng A/D)
    if (e.key === 'a' || e.key === 'A') {
        players[0].moveLeft();
    } else if (e.key === 'd' || e.key === 'D') {
        players[0].moveRight();
    }

    // Điều khiển Player 2 (bên phải, dùng phím mũi tên)
    if (e.key === 'ArrowLeft') {
        players[1].moveLeft();
    } else if (e.key === 'ArrowRight') {
        players[1].moveRight();
    }
});


// --- BẮT ĐẦU GAME ---
loadAssets(); // Dòng cuối cùng, khởi chạy quá trình tải ảnh và bắt đầu game