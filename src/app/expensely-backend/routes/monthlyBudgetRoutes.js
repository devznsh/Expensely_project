const express = require('express');
const router = express.Router();
const MonthlyBudget = require('../models/MonthlyBudget');
const Expense = require('../models/Expense');

const getMonthString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
};

router.post('/', async (req, res) => {
  const { userId, amount } = req.body;
  const month = getMonthString();

  try {
    const updated = await MonthlyBudget.findOneAndUpdate(
      { userId, month },
      { amount },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error('Error setting monthly budget:', err);
    res.status(500).json({ error: 'Failed to set budget' });
  }
});

router.get('/', async (req, res) => {
  const { userId } = req.query;
  const month = getMonthString();

  try {
    const budget = await MonthlyBudget.findOne({ userId, month });
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const expenses = await Expense.find({
      userId,
      createdAt: { $gte: start, $lt: end }
    });

    const spent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    res.json({
      budget: budget?.amount || 0,
      spent,
      remaining: (budget?.amount || 0) - spent
    });
  } catch (err) {
    console.error('Error fetching budget summary:', err);
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
});

module.exports = router;
