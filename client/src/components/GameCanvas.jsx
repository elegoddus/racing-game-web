import React, { useRef, useEffect } from 'react';
import { socket } from '../socket';
import { Game } from '../game/Game.js';

const GameCanvas = (props) => {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 1200;
        canvas.height = 800;

        // If a game instance exists, we might need to clean it up first.
        // For simplicity, we assume this effect runs only once or props don't change in a way
        // that requires re-creating the game. A more robust solution would have a cleanup function.

        const game = new Game(canvas, props);
        gameRef.current = game;
        game.start(); // This will load assets and start the game loop.

        let handleGameState = null;

        if (props.mode === 'multi') {
            handleGameState = (newGameState) => {
                if (gameRef.current) {
                    gameRef.current.updateFromServer(newGameState);
                }
            };

            socket.on('gameState', handleGameState);
        }

        // Cleanup function
        return () => {
            if (props.mode === 'multi' && handleGameState) {
                socket.off('gameState', handleGameState);
            }
            // We should also have a method to stop the game loop and remove listeners
            // gameRef.current.destroy(); 
        };
    }, [props]); // The dependency array is important.

    return <canvas ref={canvasRef} />;
};

export default GameCanvas;