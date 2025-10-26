const express = require('express');
const router = express.Router();
const { getLeaderboard, addScore } = require('../controllers/scoreController');

// Định nghĩa các routes
router.get('/leaderboard', getLeaderboard);
router.post('/scores', addScore);

// Một cách viết khác gọn hơn:
// router.route('/leaderboard').get(getLeaderboard);
// router.route('/scores').post(addScore);

module.exports = router;