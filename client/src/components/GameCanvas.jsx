import React, { useRef, useEffect } from 'react';
import { socket } from '../socket';
import { Game } from '../game/Game.js';

const GameCanvas = (props) => {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        let game;

        const resizeCanvas = () => {
            // Set a maximum width for the canvas
            const maxWidth = 1200;
            const containerWidth = container.clientWidth;
            const scale = window.devicePixelRatio || 1;

            // Use the smaller of the container width and the max width
            const newWidth = Math.min(containerWidth, maxWidth);
            const newHeight = newWidth * (9 / 16); // Maintain a 16:9 aspect ratio

            canvas.style.width = `${newWidth}px`;
            canvas.style.height = `${newHeight}px`;

            canvas.width = Math.floor(newWidth * scale);
            canvas.height = Math.floor(newHeight * scale);

            // Re-initialize or update the game with new dimensions
            if (gameRef.current) {
                gameRef.current.resize(canvas.width, canvas.height);
            }
        };

        // Setup ResizeObserver
        const resizeObserver = new ResizeObserver(resizeCanvas);
        if (container) {
            resizeObserver.observe(container);
        }

        // Initial resize
        resizeCanvas();

        // Create and start the game
        game = new Game(canvas, props);
        gameRef.current = game;
        game.start();

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
            if (container) {
                resizeObserver.unobserve(container);
            }
            if (props.mode === 'multi' && handleGameState) {
                socket.off('gameState', handleGameState);
            }
            if (gameRef.current) {
                gameRef.current.destroy();
                gameRef.current = null;
            }
        };
    }, [props.mode, props.numPlayers, props.isMultiplayer]); // More specific dependencies

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <canvas ref={canvasRef} />
        </div>
    );
};

export default GameCanvas;