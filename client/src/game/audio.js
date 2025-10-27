const SFX = {
    click: '/audio/click.mp3', // click nút
    navigate: '/audio/navigate.mp3', // chuyển trang
    laneChange: '/audio/lane_change.ogg', // chuyển lane
    dodge: '/audio/dodge.mp3', // né thành công
    coin: '/audio/coin.ogg', // ăn vàng
    shield: '/audio/shield.ogg', // ăn khiên
    magnet: '/audio/magnet.mp3', // nam châm
    crash: '/audio/crash.mp3', // đâm xe chết
    start: '/audio/start.mp3', // bắt đầu game/ hồi sinh
    gameOver: '/audio/game_over.mp3', // game over
};

const BGM = {
    menu: '/audio/menu_bgm.mp3', // nhạc nền menu
    game: '/audio/game_bgm.mp3', // nhạc nền lúc chạy game
};

let sfxAudio = {};
let bgmAudio = {};

let sfxVolume = 1.0;
let bgmVolume = 0.5; // Start BGM at 50% volume by default
let isMuted = false;

export const loadAudio = () => {
    for (const key in SFX) {
        sfxAudio[key] = new Audio(SFX[key]);
        sfxAudio[key].volume = sfxVolume;
        sfxAudio[key].load();
    }
    for (const key in BGM) {
        bgmAudio[key] = new Audio(BGM[key]);
        bgmAudio[key].volume = bgmVolume;
        bgmAudio[key].loop = true;
        bgmAudio[key].load();
    }
};

export const playSFX = (name) => {
    if (isMuted || !sfxAudio[name]) return;
    sfxAudio[name].currentTime = 0;
    sfxAudio[name].volume = sfxVolume; // Ensure volume is up-to-date
    sfxAudio[name].play().catch(e => console.error("Error playing SFX:", e));
};

export const playBGM = (name) => {
    if (isMuted || !bgmAudio[name]) return;
    stopAllBGM();
    bgmAudio[name].volume = bgmVolume; // Ensure volume is up-to-date
    bgmAudio[name].play().catch(e => console.error("Error playing BGM:", e));
};

export const stopAllBGM = () => {
    for (const key in bgmAudio) {
        bgmAudio[key].pause();
        bgmAudio[key].currentTime = 0;
    }
};

export const setSFXVolume = (level) => {
    sfxVolume = Math.max(0, Math.min(1, level));
    for (const key in sfxAudio) {
        sfxAudio[key].volume = sfxVolume;
    }
};

export const setBGMVolume = (level) => {
    bgmVolume = Math.max(0, Math.min(1, level));
    for (const key in bgmAudio) {
        bgmAudio[key].volume = bgmVolume;
    }
};

export const getSFXVolume = () => sfxVolume;
export const getBGMVolume = () => bgmVolume;

export const toggleMute = () => {
    isMuted = !isMuted;
    if (isMuted) {
        stopAllBGM();
        for (const key in sfxAudio) {
            sfxAudio[key].pause();
            sfxAudio[key].currentTime = 0;
        }
    } else {
        // Optional: resume BGM if needed, for now we just allow new sounds to be played
    }
    return isMuted;
};

export const getIsMuted = () => {
    return isMuted;
};
