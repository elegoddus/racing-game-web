import { drawNeonText, isMouseInRect } from './utils.js';
import { t, getLocale } from '../i18n/index.js';

export function setupUI(canvas) {
    const buttonWidth = 300;
    const buttonHeight = 60;
    const centerX = canvas.width / 2;

    const buttons = {};
    buttons.mainMenu = {
        start: {
            rect: { x: centerX - buttonWidth / 2, y: canvas.height / 2 + 20, w: buttonWidth, h: buttonHeight },
            textKey: 'start'
        }
    };
    // small app-level settings icon (top-right) so Settings is always reachable
    buttons.app = {
        settingsIcon: { rect: { x: canvas.width - 64, y: 12, w: 52, h: 36 }, text: '⚙' }
    };
    // settings button on main menu
    buttons.mainMenu.settings = {
        rect: { x: centerX - buttonWidth / 2, y: canvas.height / 2 + 100, w: buttonWidth, h: buttonHeight },
        textKey: 'settings'
    };
    buttons.gameOver = {
        restart: {
            rect: { x: centerX - buttonWidth / 2, y: canvas.height - 180, w: buttonWidth, h: buttonHeight },
            textKey: 'restart'
        },
        menu: {
            rect: { x: centerX - buttonWidth / 2, y: canvas.height - 110, w: buttonWidth, h: buttonHeight },
            textKey: 'mainMenu'
        }
    };
    // settings panel interactive rects (used when showing settings screen)
    const settingsLeft = canvas.width / 2 - 260;
    const settingsTop = canvas.height / 2 - 120;
    buttons.settings = {
        back: { rect: { x: canvas.width / 2 - 60, y: canvas.height - 120, w: 120, h: 48 }, textKey: 'back' },
        lang_en: { rect: { x: settingsLeft + 20, y: settingsTop + 20, w: 120, h: 40 }, textKey: 'lang_en' },
        lang_vi: { rect: { x: settingsLeft + 160, y: settingsTop + 20, w: 120, h: 40 }, textKey: 'lang_vi' },
        p1_left: { rect: { x: settingsLeft + 20, y: settingsTop + 90, w: 220, h: 40 }, label: 'P1 Left' },
        p1_right: { rect: { x: settingsLeft + 260, y: settingsTop + 90, w: 220, h: 40 }, label: 'P1 Right' },
        p2_left: { rect: { x: settingsLeft + 20, y: settingsTop + 150, w: 220, h: 40 }, label: 'P2 Left' },
        p2_right: { rect: { x: settingsLeft + 260, y: settingsTop + 150, w: 220, h: 40 }, label: 'P2 Right' }
    };
    return buttons;
}

function drawButton(ctx, button, mousePos) {
    const { x, y, w, h } = button.rect;
    const isHovered = isMouseInRect(mousePos, button.rect);

    ctx.fillStyle = isHovered ? 'rgba(0, 150, 255, 0.4)' : 'rgba(0, 120, 200, 0.3)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isHovered ? '#00ffff' : '#00aaff';
    ctx.strokeRect(x, y, w, h);
    let label = button.text;
    if (button.textKey) label = t(button.textKey);
    // special-case language toggle
    if (button.key === 'langToggle') {
        // show localized short label (EN/VI) depending on current locale
        label = getLocale() === 'en' ? t('lang_en') : t('lang_vi');
    }
    drawNeonText(ctx, label, x + w / 2, y + h / 2 + 8, 20, isHovered ? '#fff' : '#ccc', isHovered ? '#00ffff' : '#00aaff');
}

export function drawMainMenu(ctx, buttons, mousePos, canvas) {
    ctx.fillStyle = 'rgb(30, 32, 40)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawNeonText(ctx, 'Racing Car', canvas.width / 2, canvas.height / 2 - 100, 60, '#fff', '#00ffff');

    if (buttons.mainMenu && buttons.mainMenu.start) {
        drawButton(ctx, buttons.mainMenu.start, mousePos);
    }
    if (buttons.mainMenu && buttons.mainMenu.settings) {
        drawButton(ctx, buttons.mainMenu.settings, mousePos);
    }
}

export function drawSettings(ctx, buttons, mousePos, canvas, controls, awaitingKey) {
    // backdrop
    ctx.fillStyle = 'rgba(10,12,14,0.95)';
    const w = 560;
    const h = 320;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#444';
    ctx.strokeRect(x, y, w, h);

    // Title
    drawNeonText(ctx, 'Settings', canvas.width / 2, y + 36, 28, '#fff', '#00ffff');

    // Language buttons
    ['lang_en', 'lang_vi'].forEach((k) => {
        const b = buttons[k];
        const isHovered = isMouseInRect(mousePos, b.rect);
        ctx.fillStyle = isHovered ? 'rgba(0,150,255,0.3)' : 'rgba(0,120,200,0.18)';
        ctx.fillRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
        ctx.strokeStyle = isHovered ? '#00ffff' : '#00aaff';
        ctx.strokeRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
        drawNeonText(ctx, t(b.textKey), b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2 + 8, 18, '#fff', '#00ffff');
    });

    // Control fields
    const fields = ['p1_left','p1_right','p2_left','p2_right'];
    fields.forEach((k) => {
        const b = buttons[k];
        const isHovered = isMouseInRect(mousePos, b.rect);
        ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
        ctx.strokeStyle = isHovered ? '#888' : '#333';
        ctx.strokeRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);

        const label = b.label;
        drawNeonText(ctx, label, b.rect.x + 12 + 80, b.rect.y + b.rect.h / 2 + 8, 16, '#ddd', '#00ffff', 'left');
        // value
        const val = controls && controls[k] ? controls[k] : '';
        const display = awaitingKey && awaitingKey.key === k ? 'Press any key...' : val.toUpperCase();
        drawNeonText(ctx, display, b.rect.x + b.rect.w - 12, b.rect.y + b.rect.h / 2 + 8, 16, '#fff', '#00ffff', 'right');
    });

    // Back button
    drawButton(ctx, buttons.back, mousePos);
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