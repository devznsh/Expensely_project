const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: String,
  prompt: String,
  response: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
