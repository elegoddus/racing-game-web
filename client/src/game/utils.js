import { getLocale } from '../i18n/index.js';

// --- CÁC HÀM TIỆN ÍCH ---

/**
 * Kiểm tra xem hai hình chữ nhật có giao nhau không.
 * @param {object} r1 - { x, y, w, h }
 * @param {object} r2 - { x, y, w, h }
 * @returns {boolean}
 */
export function rectsIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
}

/**
 * Kiểm tra xem chuột có nằm trong hình chữ nhật không.
 * @param {object} mouse - { x, y }
 * @param {object} rect - { x, y, w, h }
 * @returns {boolean}
 */
export function isMouseInRect(mouse, rect) {
    return mouse.x > rect.x && mouse.x < rect.x + rect.w &&
           mouse.y > rect.y && mouse.y < rect.y + rect.h;
}

/**
 * Vẽ chữ có hiệu ứng neon.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {string} fillColor
 * @param {string} glowColor
 * @param {string} align
 * @param {number} glowWidth
 */
export function drawNeonText(ctx, text, x, y, size, fillColor, glowColor, align = 'center', glowWidth = 4) {
    const isEnglish = getLocale() === 'en';
    // Increase size more aggressively for Vietnamese
    const adjustedSize = isEnglish ? size : Math.floor(size * 1.25); 
    const fontName = isEnglish ? "'Press Start 2P'" : "'Noto Sans'";
    
    ctx.font = `${adjustedSize}px ${fontName}`;
    ctx.textAlign = align;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = glowWidth;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
}

// --- CÁC HÀM API ---

/**
 * Gửi điểm số lên server.
 * @param {number} score
 * @param {string} playerName
 */
export async function sendScoreToServer(score, playerName, gameId = null) {
    try {
        // Helpful debug info: include gameId and a short stack trace when sending
        const debugInfo = { gameId };
        console.log('Sending score to server', { score: Math.floor(score), playerName, ...debugInfo });

        const body = {
            score: Math.floor(score),
            playerName: playerName
        };
        if (gameId) body.gameId = gameId;

        const response = await fetch('http://localhost:3001/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        console.log(result.message);
    } catch (error) {
        console.error('Failed to send score:', error);
    }
}

/**
 * Lấy bảng xếp hạng từ server.
 * @returns {Promise<Array>}
 */
export async function fetchLeaderboard() {
    try {
        const response = await fetch('http://localhost:3001/api/leaderboard');
        const scores = await response.json();
        console.log('Leaderboard fetched successfully!');
        return scores;
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return []; // Trả về mảng rỗng nếu có lỗi
    }
}