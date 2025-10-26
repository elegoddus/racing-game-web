const mongoose = require('mongoose');

// Hàm kết nối đến MongoDB
const connectDB = async () => {
    try {
        // Lấy chuỗi kết nối từ biến môi trường
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1); // Thoát khỏi tiến trình nếu không kết nối được DB
    }
};

module.exports = connectDB;