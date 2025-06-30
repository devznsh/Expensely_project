const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

router.post('/set', async (req, res) => {
  const { userId, amount } = req.body;

  try {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const budget = await Budget.findOneAndUpdate(
      { userId, month, year, category: { $exists: false } },
      { userId, amount, month, year },
      { upsert: true, new: true }
    );

    res.json(budget);
  } catch (err) {
    console.error('Error setting budget:', err);
    res.status(500).json({ error: 'Failed to set budget' });
  }
});

router.get('/overview', async (req, res) => {
  const { userId } = req.query;

  try {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    const budgetDoc = await Budget.findOne({
      userId,
      month,
      year,
      category: { $exists: false }
    });

    const budget = budgetDoc ? budgetDoc.amount : 0;

    const expenses = await Expense.find({
      userId,
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = budget - spent;

    res.json({ budget, spent, remaining });
  } catch (err) {
    console.error('Error loading overview:', err);
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

module.exports = router;
