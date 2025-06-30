const Budget = require('../models/Budget');

// Get budgets for a user
exports.getBudgets = async (req, res) => {
  const { userId } = req.query;
  try {
    const budgets = await Budget.find({ userId });
    res.json(budgets);
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

// Create a new budget
exports.createBudget = async (req, res) => {
  const { userId, category, limit } = req.body;
  try {
    const newBudget = new Budget({
      userId,
      category,
      limit,
      spent: 0,
    });
    await newBudget.save();
    res.status(201).json(newBudget);
  } catch (err) {
    console.error('Error creating budget:', err);
    res.status(500).json({ error: 'Failed to create budget' });
  }
};

// Update a budget (limit or spent)
exports.updateBudget = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updated = await Budget.findByIdAndUpdate(id, updates, { new: true });
    res.json(updated);
  } catch (err) {
    console.error('Error updating budget:', err);
    res.status(500).json({ error: 'Failed to update budget' });
  }
};

// Delete a budget
exports.deleteBudget = async (req, res) => {
  const { id } = req.params;
  try {
    await Budget.findByIdAndDelete(id);
    res.json({ message: 'Budget deleted successfully' });
  } catch (err) {
    console.error('Error deleting budget:', err);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
};

exports.setMonthlyBudget = async (req, res) => {
  const { userId, amount, month, year } = req.body;

  try {
    const existing = await Budget.findOne({ userId, month, year });

    if (existing) {
      existing.amount = amount;
      await existing.save();
      res.json({ message: 'Monthly budget updated', budget: existing });
    } else {
      const budget = new Budget({ userId, amount, month, year });
      await budget.save();
      res.status(201).json({ message: 'Monthly budget set', budget });
    }
  } catch (err) {
    console.error('Error setting monthly budget:', err);
    res.status(500).json({ error: 'Failed to set monthly budget' });
  }
};

exports.getRemainingMonthlyBudget = async (req, res) => {
  const { userId, month, year } = req.query;

  try {
    const monthlyBudget = await Budget.findOne({ userId, month, year });

    if (!monthlyBudget) {
      return res.json({ total: 0, remaining: 0 });
    }

    // Fetch expenses for that month
    const start = new Date(year, month, 1);
    const end = new Date(year, parseInt(month) + 1, 0, 23, 59, 59);

    const expenses = await require('../models/Expense').find({
      userId,
      date: { $gte: start, $lte: end }
    });

    const spent = expenses.reduce((sum, item) => sum + item.amount, 0);
    const remaining = monthlyBudget.amount - spent;

    res.json({ total: monthlyBudget.amount, spent, remaining });
  } catch (err) {
    console.error('Error fetching monthly budget:', err);
    res.status(500).json({ error: 'Failed to get monthly budget' });
  }
};
