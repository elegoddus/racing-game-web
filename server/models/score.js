const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    // Tạm thời chúng ta sẽ dùng một tên người chơi đơn giản
    playerName: {
        type: String,
        required: true,
        default: 'Guest'
    },
    score: { type: Number, required: true },
    gameId: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Score', scoreSchema);