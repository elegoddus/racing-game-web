const Score = require('../models/score.js');

/**
 * @desc   Thêm điểm số mới
 * @route  POST /api/scores
 * @access Public
 */
const addScore = async (req, res) => {
    try {
    const { playerName, score, gameId } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (score === undefined) {
            return res.status(400).json({ message: 'Score is required' });
        }

        // Prevent accidental duplicate inserts: if an identical score from the
        // same player has been saved very recently (e.g. within 5 seconds),
        // skip inserting again.
        const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
        // Prefer idempotency by gameId if provided: if same gameId + playerName
        // already saved, ignore duplicate.
        if (gameId) {
            const existingWithGame = await Score.findOne({ playerName: playerName || 'Guest', gameId: gameId });
            if (existingWithGame) {
                return res.status(200).json({ message: 'Duplicate score ignored (same gameId).' });
            }
        }

        // If there is an existing best score for this player, compare:
        // - If existingBest.score >= incoming score -> ignore incoming (no update)
        // - If incoming score > existingBest.score -> remove existing entries for that player and insert the new higher score
        const player = playerName || 'Guest';
        const existingBest = await Score.findOne({ playerName: player }).sort({ score: -1 });

        if (existingBest) {
            if (existingBest.score >= score) {
                // existing score is higher or equal, skip storing the lower/equal score
                return res.status(200).json({ message: 'Existing higher or equal score present; not added.' });
            } else {
                // incoming score is higher: remove older records for this player
                await Score.deleteMany({ playerName: player });
            }
        } else {
            // No existing record for this player; but still check very recent identical to avoid accidental double posts
            const recentDuplicate = await Score.findOne({
                playerName: player,
                score: score,
                createdAt: { $gt: fiveSecondsAgo }
            });
            if (recentDuplicate) {
                return res.status(200).json({ message: 'Duplicate score ignored (recent identical entry).' });
            }
        }

        const newScore = new Score({
            playerName: player,
            score: score,
            gameId: gameId || undefined
        });

        await newScore.save();
        res.status(201).json({ message: 'Score added successfully', data: newScore });
    } catch (error) {
        console.error('Error adding score:', error);
        res.status(500).json({ message: 'Server error while adding score' });
    }
};

/**
 * @desc   Lấy bảng xếp hạng (top 10)
 * @route  GET /api/leaderboard
 * @access Public
 */
const getLeaderboard = async (req, res) => {
    try {
        const scores = await Score.find({}).sort({ score: -1 }).limit(10);
        res.status(200).json(scores);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Server error while fetching leaderboard' });
    }
};

module.exports = { addScore, getLeaderboard };