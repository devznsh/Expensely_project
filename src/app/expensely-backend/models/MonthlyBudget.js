const mongoose = require('mongoose');

const monthlyBudgetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  month: { type: String, required: true }, // Format: "2025-06"
  amount: { type: Number, required: true },
});

monthlyBudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyBudget', monthlyBudgetSchema);
