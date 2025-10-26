// tools/clear_scores.js
// Usage: node tools/clear_scores.js
// This script will connect to the MongoDB specified in server/.env and delete all documents
// from the `scores` collection. Use with care (works on Atlas). Back up if needed.

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

async function run() {
  // Try to read MONGO_URI from environment first, otherwise parse server/.env
  let uri = process.env.MONGO_URI;
  if (!uri) {
    const envPath = path.resolve(__dirname, '../server/.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/MONGO_URI\s*=\s*"?([^"\n]+)"?/);
      if (match) uri = match[1].trim();
    }
  }
  if (!uri) {
    console.error('MONGO_URI not found in server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const Score = require('../server/models/score');
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
