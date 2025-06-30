const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  month: Number,
  year: Number,
  category: String,
  limit: Number,
  spent: Number,
}, {
  timestamps: true
});

module.exports = mongoose.model('Budget', budgetSchema);
