// --- CÁC HẰNG SỐ VÀ CẤU HÌNH GAME ---
export const GAME_CONFIG = {
    RESPAWN_TIME: 10,
    INVINCIBLE_TIME_AFTER_RESPAWN: 3,
    SHIELD_DURATION: 7,
    MAGNET_DURATION: 8,
    VIEWPORT_GAP: 50,
    COIN_BASE_SCORE: 100,
    NEAR_MISS_BONUS: 25,
    COMBO_DURATION: 2.0,
    COMBO_SCORE_MULTIPLIER_STEP: 5,
    // combo scaling: grows with combo up to 10 combos (max +30%)
    COMBO_SCALE_STEP: 0.03, // per combo add scale increment (0.03 * 10 = 0.3 => +30%)
    COMBO_MAX_SCALE: 1.3, // cap scale (1.0 is base, 1.3 is +30%)
    INITIAL_FALL_SPEED: 300,
    FALL_SPEED_INCREASE_RATE: 0.1,
    LANE_DASH_LENGTH: 40,
    LANE_DASH_GAP: 20,
    ROAD_OFFSET_LOOP: 60,
    SHAKE_DURATION: 0.3,
    SHAKE_INTENSITY: 5,
    // Visual effect tuning
    COMBO_LIGHTNING_PARTICLES: 18,
    COMBO_FIRE_PARTICLES: 22,
};

export const PLAYER_COUNT = 2;
export const VIEWPORT_GAP = 50;
export const LANE_COUNT = 5;

export const obstaclePatterns = [
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
