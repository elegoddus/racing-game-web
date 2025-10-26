require('dotenv').config(); // Tải các biến môi trường từ file .env

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // Import hàm kết nối DB
const scoreRoutes = require('./routes/scoreRoutes');

// Kết nối đến MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares ---
app.use(cors()); // Cho phép cross-origin requests
app.use(express.json()); // Cho phép server nhận dữ liệu dạng JSON

// --- API Routes (Điểm cuối API) ---
// Khi có bất kỳ request nào đến '/api', nó sẽ được chuyển đến scoreRoutes để xử lý
app.use('/api', scoreRoutes);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));