import React, { useRef, useEffect } from 'react';
import { startGame } from '../game';

const GameCanvas = ({ onGameOver, playerNames }) => {
    const canvasRef = useRef(null);
    const gameInstance = useRef(null); // Lưu trữ instance của game để dọn dẹp

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            // Khởi động game và truyền vào các props cần thiết
            gameInstance.current = startGame(canvas, {
                onGameOver: onGameOver,
                playerNames: playerNames
            });
        }

        // Hàm dọn dẹp: sẽ được gọi khi component bị gỡ khỏi cây DOM
        return () => {
            gameInstance.current?.cleanup(); // Gọi hàm dọn dẹp của game
        };
    }, [onGameOver, playerNames]); // Chạy lại effect nếu các props này thay đổi

    return <canvas ref={canvasRef} id="gameCanvas" width="900" height="800"></canvas>;
};

export default GameCanvas;