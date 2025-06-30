const Expense = require('../models/Expense');

exports.getExpenses = async (req, res) => {
  try {
    const { userId } = req.query;
    const expenses = await Expense.find({ userId }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { name, amount, category, userId } = req.body;
    const expense = new Expense({ name, amount, category, userId });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
