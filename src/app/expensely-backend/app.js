const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const expenseRoutes = require('./routes/expenseRoutes');
const groupRoutes = require('./routes/groupRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const monthlyBudgetRoutes = require('./routes/monthlyBudgetRoutes');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/monthly-budget', monthlyBudgetRoutes);
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/budget', require('./routes/budgetRoutes'));

app.get('/', (req, res) => {
  res.send('Expensely API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
