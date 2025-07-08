const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const admin = require('./firebaseAdmin');
const ChatMessage = require('./models/ChatMessage');
const Expense = require('./models/Expense'); 

const app = express();
const PORT = 9000;

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/expensely';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log(' MongoDB connected'))
  .catch(err => console.error(' MongoDB error:', err));

app.use(cors());
app.use(bodyParser.json());

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Token error:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Route to handle chat and special intents
app.post('/chat', verifyFirebaseToken, async (req, res) => {
  const { message } = req.body;
  const userId = req.user.uid;

  try {
    let reply = '';

    // 1️⃣ Show last 5 expenses
    if (/last\s*5\s*expenses?/i.test(message)) {
      const expenses = await Expense.find({ userId }).sort({ date: -1 }).limit(5);
      reply = expenses.length === 0
        ? 'You have no recorded expenses yet.'
        : 'Here are your last 5 expenses:\n\n' +
          expenses.map(e => `• ${e.name} - ₹${e.amount} (${e.category}) on ${new Date(e.date).toDateString()}`).join('\n');

    // 2️⃣ How much did I spend this week?
    } else if (/spent.*(this|past)\s*week/i.test(message)) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      const expenses = await Expense.find({ userId, date: { $gte: startOfWeek } });
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      reply = `You spent ₹${total.toFixed(2)} in the past 7 days.`;

    // 3️⃣ Did I exceed my budget? (assume budget = ₹10,000 for now)
    } else if (/exceed.*budget/i.test(message)) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const expenses = await Expense.find({ userId, date: { $gte: startOfMonth } });
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      const budget = 10000; // You can later store this in a Budget model

      reply = total > budget
        ? `Yes, you've exceeded your budget! You spent ₹${total} which is ₹${(total - budget)} over the ₹${budget} limit.`
        : `No, you're within your budget. You've spent ₹${total} out of your ₹${budget} limit.`;

    // 4️⃣ Biggest expense this month
    } else if (/biggest.*(expense|spending).*month/i.test(message)) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const expense = await Expense.findOne({ userId, date: { $gte: startOfMonth } }).sort({ amount: -1 });

      reply = expense
        ? `Your biggest expense this month is ₹${expense.amount} on ${expense.name} (${expense.category})`
        : 'You haven’t recorded any expenses this month.';

    // 5️⃣ Saving tips → Let Ollama AI handle this
    } else if (/tips?.*save.*money/i.test(message)) {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          prompt: 'Give me some personal finance tips to save money.',
          stream: false
        })
      });
      const data = await response.json();
      reply = data.response;

    // 🔄 Fallback to AI for all other prompts
    } else {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          prompt: message,
          stream: false
        })
      });
      const data = await response.json();
      reply = data.response;
    }

    // Save chat
    const chat = new ChatMessage({ userId, prompt: message, response: reply });
    await chat.save();

    return res.json({ reply });

  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
