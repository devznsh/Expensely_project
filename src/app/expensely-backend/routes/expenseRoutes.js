const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');

// Standard expense routes
router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

router.get('/total', async (req, res) => {
  const { userId } = req.query;
  try {
    const expenses = await Expense.find({ userId });
    const total = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    res.json({ total });
  } catch (err) {
    console.error('Error calculating total:', err);
    res.status(500).json({ error: 'Failed to calculate total' });
  }
});

module.exports = router;
