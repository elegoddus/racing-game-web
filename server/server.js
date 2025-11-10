// require('dotenv').config(); // Tải các biến môi trường từ file .env

const express = require('express');
const cors = require('cors');
// const connectDB = require('./config/db'); // Import hàm kết nối DB
// const scoreRoutes = require('./routes/scoreRoutes');

// Kết nối đến MongoDB
// connectDB();

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*", // Cho phép tất cả các origin, bạn có thể thay đổi thành origin của frontend
    methods: ["GET", "POST"]
  }
});
const RoomManager = require('./src/RoomManager.js');

const roomManager = new RoomManager(io);
const PORT = process.env.PORT || 3001;

// --- Middlewares ---
app.use(cors()); // Cho phép cross-origin requests
app.use(express.json()); // Cho phép server nhận dữ liệu dạng JSON

// --- API Routes (Điểm cuối API) ---
// Khi có bất kỳ request nào đến '/api', nó sẽ được chuyển đến scoreRoutes để xử lý
// app.use('/api', scoreRoutes);

// --- Socket.IO Connection ---
io.on('connection', (socket) => {
  console.log('A user connected with socket id:', socket.id);

  socket.on('createRoom', ({ playerName }) => {
    roomManager.createRoom(socket, playerName);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    roomManager.joinRoom(socket, roomId, playerName);
  });

  socket.on('startGame', ({ roomId }) => {
    roomManager.startGame(roomId);
  });

  socket.on('playerInput', (input) => {
    roomManager.handlePlayerInput(socket.id, input);
  });

  socket.on('leaveRoom', () => {
    roomManager.leaveRoom(socket);
  });

  socket.on('disconnect', () => {
    roomManager.leaveRoom(socket);
    console.log('User disconnected with socket id:', socket.id);
  });
});


http.listen(PORT, () => console.log(`Server started on port ${PORT}`));