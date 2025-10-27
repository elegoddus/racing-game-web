import { drawNeonText, isMouseInRect } from './utils.js';
import { t } from '../i18n/index.js';

function drawButton(ctx, button, mousePos) {
    const { x, y, w, h } = button.rect;
    const isHovered = isMouseInRect(mousePos, button.rect);

    ctx.fillStyle = isHovered ? 'rgba(0, 150, 255, 0.4)' : 'rgba(0, 120, 200, 0.3)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isHovered ? '#00ffff' : '#00aaff';
    ctx.strokeRect(x, y, w, h);
    let label = button.text || t(button.textKey);
    drawNeonText(ctx, label, x + w / 2, y + h / 2 + 8, 20, isHovered ? '#fff' : '#ccc', isHovered ? '#00ffff' : '#00aaff');
}

export function setupUI(canvas) {
    const buttonWidth = 300;
    const buttonHeight = 60;
    const centerX = canvas.width / 2;

    const buttons = {};

    // Main Menu Buttons
    buttons.mainMenu = {
        start: { rect: { x: centerX - buttonWidth / 2, y: canvas.height / 2 + 20, w: buttonWidth, h: buttonHeight }, textKey: 'start' },
        settings: { rect: { x: centerX - buttonWidth / 2, y: canvas.height / 2 + 100, w: buttonWidth, h: buttonHeight }, textKey: 'settings' }
    };

    // In-Game App Buttons
    buttons.app = {
        settingsIcon: { rect: { x: canvas.width - 64, y: 12, w: 52, h: 36 }, text: '⚙' }
    };

    // Game Over Buttons
    buttons.gameOver = {
        restart: { rect: { x: centerX - buttonWidth / 2, y: canvas.height - 180, w: buttonWidth, h: buttonHeight }, textKey: 'restart' },
        menu: { rect: { x: centerX - buttonWidth / 2, y: canvas.height - 110, w: buttonWidth, h: buttonHeight }, textKey: 'mainMenu' }
    };

    // Pause Menu Buttons
    const pauseWidth = 700;
    const pauseHeight = 450;
    const pauseX = (canvas.width - pauseWidth) / 2;
    const pauseY = (canvas.height - pauseHeight) / 2;
    const pauseButtonWidth = 220;
    const pauseButtonHeight = 50;

    buttons.pause = {
        resume: { rect: { x: centerX - pauseButtonWidth / 2, y: pauseY + 80, w: pauseButtonWidth, h: pauseButtonHeight }, textKey: 'resume' },
        restart: { rect: { x: centerX - pauseButtonWidth / 2, y: pauseY + 150, w: pauseButtonWidth, h: pauseButtonHeight }, textKey: 'restart' },
        endGame: { rect: { x: centerX - pauseButtonWidth / 2, y: pauseY + 220, w: pauseButtonWidth, h: pauseButtonHeight }, textKey: 'endGame' },
        mainMenu: { rect: { x: centerX - pauseButtonWidth / 2, y: pauseY + 290, w: pauseButtonWidth, h: pauseButtonHeight }, textKey: 'mainMenu' },
        
        // Settings within the pause menu
        lang_en: { rect: { x: pauseX + 30, y: pauseY + pauseHeight - 60, w: 80, h: 40 }, textKey: 'lang_en' },
        lang_vi: { rect: { x: pauseX + 120, y: pauseY + pauseHeight - 60, w: 80, h: 40 }, textKey: 'lang_vi' },
    };

    return buttons;
}

export function drawMainMenu(ctx, buttons, mousePos, canvas) {
    ctx.fillStyle = 'rgb(30, 32, 40)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawNeonText(ctx, 'Racing Car', canvas.width / 2, canvas.height / 2 - 100, 60, '#fff', '#00ffff');
    if (buttons.mainMenu) {
        drawButton(ctx, buttons.mainMenu.start, mousePos);
        drawButton(ctx, buttons.mainMenu.settings, mousePos);
    }
}

export function drawPauseMenu(ctx, buttons, mousePos, canvas) {
    const pauseWidth = 700;
    const pauseHeight = 450;
    const x = (canvas.width - pauseWidth) / 2;
    const y = (canvas.height - pauseHeight) / 2;

    // Backdrop
    ctx.fillStyle = 'rgba(10, 12, 14, 0.95)';
    ctx.fillRect(x, y, pauseWidth, pauseHeight);
    ctx.strokeStyle = '#444';
    ctx.strokeRect(x, y, pauseWidth, pauseHeight);

    // Title
    drawNeonText(ctx, t('gamePaused'), canvas.width / 2, y + 45, 36, '#fff', '#00ffff');

    // Draw main pause buttons
    if (buttons) {
        drawButton(ctx, buttons.resume, mousePos);
        drawButton(ctx, buttons.restart, mousePos);
        drawButton(ctx, buttons.endGame, mousePos);
        drawButton(ctx, buttons.mainMenu, mousePos);

        // Draw language buttons
        ['lang_en', 'lang_vi'].forEach((k) => {
            const b = buttons[k];
            const isHovered = isMouseInRect(mousePos, b.rect);
            ctx.fillStyle = isHovered ? 'rgba(0,150,255,0.3)' : 'rgba(0,120,200,0.18)';
            ctx.fillRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
            ctx.strokeStyle = isHovered ? '#00ffff' : '#00aaff';
            ctx.strokeRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
            drawNeonText(ctx, t(b.textKey), b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2 + 8, 18, '#fff', '#00ffff');
        });
    }
}

export function drawGameOver(ctx, players, leaderboardData, buttons, mousePos, canvas) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawNeonText(ctx, t('gameOver'), canvas.width / 2, 120, 40, '#fff', '#ff3333');
    if (players && players.length > 0) {
        drawNeonText(ctx, t('playerScore', { n: 1, score: Math.floor(players[0].score) }), canvas.width / 2, 180, 22, '#fff', '#00ffff');
        drawNeonText(ctx, t('playerScore', { n: 2, score: Math.floor(players[1].score) }), canvas.width / 2, 220, 22, '#fff', '#00ffff');
    }
    drawNeonText(ctx, t('leaderboard'), canvas.width / 2, 280, 20, '#fff', '#ffff00');
    if (leaderboardData && leaderboardData.length > 0) {
        leaderboardData.forEach((entry, index) => {
            const yPos = 320 + index * 30;
            const text = `${index + 1}. ${entry.playerName} - ${entry.score}`;
            drawNeonText(ctx, text, canvas.width / 2, yPos, 16, '#ddd', '#00ffff');
        });
    } else {
        drawNeonText(ctx, t('loading'), canvas.width / 2, 320, 16, '#aaa', '#888');
    }

    if (buttons.gameOver) {
        drawButton(ctx, buttons.gameOver.restart, mousePos);
        drawButton(ctx, buttons.gameOver.menu, mousePos);
    }
}
