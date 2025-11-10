// --- QUẢN LÝ TÀI SẢN GAME ---

// 1. Import tất cả các hình ảnh như các module
import playerImg from '../assets/image/player.png';
import coinImg from '../assets/image/coin_sprite.png';
import treeImg from '../assets/image/tree.png';
import logImg from '../assets/image/log.png';
import pitImg from '../assets/image/pit1.png';
import crateImg from '../assets/image/crate.png';
import rockImg from '../assets/image/rock.png';
import shieldImg from '../assets/image/shield.png';
import shieldEffectImg from '../assets/image/shield_effect.png';
import magnetImg from '../assets/image/magnet.png';

// 2. Sử dụng các URL đã import để tạo assetSources
// Vite sẽ tự động xử lý các đường dẫn này
export const assetSources = {
    player: playerImg,
    coin: coinImg,
    obstacle_tree: treeImg,
    obstacle_log: logImg,
    obstacle_pit: pitImg,
    obstacle_crate: crateImg,
    obstacle_rock: rockImg,
    powerup_shield: shieldImg,
    shield_effect: shieldEffectImg,
    powerup_magnet: magnetImg
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
            } else if (key === 'player' || key.startsWith('powerup_') || key === 'shield_effect' || key === 'coin') {
                processedImage = processImageTransparency(img, {r: 255, g: 255, b: 255});
            }
            resolve({ key, image: processedImage });
        };
        img.onerror = () => reject(`Không thể tải được ảnh: ${src}`);
    });
}

export async function loadAssets() {
    const promises = Object.entries(assetSources).map(([key, src]) => loadAsset(key, src));
    const loadedAssets = await Promise.all(promises);
    const assets = {};
    loadedAssets.forEach(asset => {
        assets[asset.key] = asset.image;
    });
    console.log("Tất cả hình ảnh đã được tải thành công!");
    return assets;
}