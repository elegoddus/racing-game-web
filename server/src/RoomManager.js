const Game = require('./Game.js');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
  }

  createRoom(socket, playerName) {
    const roomId = this.generateRoomId();
    const game = new Game(roomId);
    this.rooms.set(roomId, { players: new Map(), game });
    this.joinRoom(socket, roomId, playerName);
  }

  joinRoom(socket, roomId, playerName) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    socket.join(roomId);
    const playerIndex = room.players.size;
    const player = { name: playerName, id: socket.id, playerIndex };
    room.players.set(socket.id, player);
    room.game.addPlayer(socket.id, playerName);

    // Notify other players in the room
    socket.to(roomId).emit('playerJoined', player);

    // Send the current list of players to the new player
    const players = Array.from(room.players.values());
    socket.emit('roomJoined', { roomId, players, playerIndex });

    console.log(`Player ${playerName} (${socket.id}) joined room ${roomId}`);
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.game) {
      room.game.initGame(); // Initialize the game with all joined players
      room.game.start();
      this.io.to(roomId).emit('gameStarted');
      console.log(`Game started in room ${roomId}`);

      const gameLoop = setInterval(() => {
        room.game.update(1000 / 60); // Assuming 60 FPS
        const gameState = room.game.getGameState();
        this.io.to(roomId).emit('gameState', gameState);

        if (room.game.gameState === 'gameover') {
          clearInterval(gameLoop);
          console.log(`Game over in room ${roomId}`);
        }
      }, 1000 / 60);
    }
  }

  handlePlayerInput(socketId, input) {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) {
        room.game.handlePlayerInput(socketId, input);
        break;
      }
    }
  }

  leaveRoom(socket) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.has(socket.id)) {
        const playerName = room.players.get(socket.id).name;
        room.players.delete(socket.id);
        socket.to(roomId).emit('playerLeft', { playerId: socket.id });
        console.log(`Player ${playerName} (${socket.id}) left room ${roomId}`);

        if (room.players.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Room ${roomId} is empty and has been deleted.`);
        }
        break;
      }
    }
  }

  generateRoomId() {
    return Math.random().toString(36).substr(2, 5).toUpperCase();
  }
}

module.exports = RoomManager;
