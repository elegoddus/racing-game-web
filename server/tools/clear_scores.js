// server/tools/clear_scores.js
// Safe script to delete all documents from the scores collection.
// Run with: node tools/clear_scores.js (from server/)

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not found in server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const Score = require('../models/score');
    const res = await Score.deleteMany({});
    console.log('Deleted documents:', res.deletedCount);

    await mongoose.disconnect();
    console.log('Disconnected. Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
}

run();
