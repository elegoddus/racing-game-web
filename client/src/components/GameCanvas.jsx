import React, { useRef, useEffect } from 'react';
import { Game } from '../game/Game.js';

const GameCanvas = ({ playerNames }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 1200;
        canvas.height = 800;

        const game = new Game(canvas, playerNames);
        game.start();

    }, [playerNames]);

    return <canvas ref={canvasRef} />;
};

export default GameCanvas;