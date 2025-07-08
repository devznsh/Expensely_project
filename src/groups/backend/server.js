require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const sendNotificationViaHttp = require('../backend2/sendNotificationViaHttp');
const sendPaymentReminderEmail = require('../backend2/sendEmail');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-admin-config.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to verify Firebase ID token
const authenticate = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (!idToken) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

// In-memory database (replace with Firestore in production)
const groups = {};
const expenses = {};
const userGroups = {};

// Group Management Endpoints
app.post('/api/groups', authenticate, async (req, res) => {
  try {
    const { name, members } = req.body;
    const groupId = uuidv4();
    
    const group = {
      id: groupId,
      name,
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
      // FIX: Ensure consistent member structure
      members: members.map(email => ({ 
        email, 
        joined: email === req.user.email ? true : false,
        name: email.split('@')[0] // Extract name from email prefix
      }))
    };
    
    groups[groupId] = group;
    
    // Add group reference to each user
    members.forEach(email => {
      if (!userGroups[email]) userGroups[email] = [];
      userGroups[email].push(groupId);
    });
    
    // Send invitation notifications only to members who are not the creator
    const membersToInvite = members.filter(email => email !== req.user.email);
    if (membersToInvite.length > 0) {
      await sendGroupInvites(group, req.user.email, membersToInvite);
    }
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.get('/api/groups', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userGroupIds = userGroups[userEmail] || [];
    const userGroupsData = userGroupIds.map(id => groups[id]).filter(Boolean);
    
    res.json(userGroupsData);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Expense Management Endpoints
app.post('/api/groups/:groupId/expenses', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { description, amount, paidBy, splitBetween } = req.body;
    
    if (!groups[groupId]) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const expenseId = uuidv4();
    const expense = {
      id: expenseId,
      groupId,
      description,
      amount: parseFloat(amount),
      paidBy,
      splitBetween,
      createdAt: new Date().toISOString()
    };
    
    expenses[expenseId] = expense;
    
    // Send expense notification to group members (excluding the payer)
    await sendExpenseNotification(groupId, expense, req.user.email);
    
    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Get group expenses
app.get('/api/groups/:groupId/expenses', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    if (!groups[groupId]) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const groupExpenses = Object.values(expenses).filter(expense => 
      expense.groupId === groupId
    );
    
    res.json(groupExpenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Send payment reminder
app.post('/api/groups/:groupId/remind', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    
    if (!groups[groupId]) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // FIX: Pass the correct member email (memberId is actually the email)
    await sendPaymentReminder(groupId, memberId, req.user.email);
    
    res.json({ message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// Get group details
app.get('/api/groups/:groupId', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    if (!groups[groupId]) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json(groups[groupId]);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// FIX: Updated payment reminder function
async function sendPaymentReminder(groupId, memberEmail, senderEmail) {
  const group = groups[groupId];
  const memberToRemind = group.members.find(m => m.email === memberEmail);

  if (!memberToRemind) {
    throw new Error('Member not found');
  }

  // Don't send reminder to yourself
  if (memberEmail === senderEmail) {
    throw new Error('Cannot send reminder to yourself');
  }

  const topic = `user_${memberToRemind.email.replace(/[@.]/g, '_')}`;
  const title = 'Payment Reminder';
  const body = `${senderEmail} sent you a reminder for "${group.name}"`;
  const data = {
    type: 'PAYMENT_REMINDER',
    groupId,
    senderEmail
  };

  try {
    // Send FCM notification
    const result = await sendNotificationViaHttp(topic, title, body, data);
    console.log('FCM HTTP v1 notification sent:', result);

    // FIX: Send email to the member, not the sender
    await sendPaymentReminderEmail(memberToRemind.email, group.name, senderEmail);
    console.log('Payment reminder email sent to', memberToRemind.email);

  } catch (error) {
    console.error('Error sending notification or email:', error?.response?.data || error.message);
    throw error;
  }
}

// Simple chat message endpoint
app.post('/api/groups/:groupId/chat', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;
    
    if (!groups[groupId]) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const chatMessage = {
      id: uuidv4(),
      groupId,
      message,
      senderEmail: req.user.email,
      timestamp: new Date().toISOString()
    };
    
    // Send message to all group members except sender
    await sendChatNotification(groupId, chatMessage);
    
    res.status(201).json(chatMessage);
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Chat notification function
async function sendChatNotification(groupId, chatMessage) {
  const messaging = admin.messaging();
  const group = groups[groupId];
  
  for (const member of group.members) {
    if (member.email !== chatMessage.senderEmail) {
      try {
        const message = {
          notification: {
            title: `Message in ${group.name}`,
            body: `${chatMessage.senderEmail}: ${chatMessage.message}`
          },
          data: {
            type: 'CHAT_MESSAGE',
            groupId,
            groupName: group.name,
            senderEmail: chatMessage.senderEmail,
            message: chatMessage.message
          },
          topic: `user_${member.email.replace(/[@.]/g, '_')}`
        };
        
        await messaging.send(message);
      } catch (error) {
        console.error(`Error sending chat notification to ${member.email}:`, error);
      }
    }
  }
}

// FIX: Updated group invite function
async function sendGroupInvites(group, inviterEmail, membersToInvite) {
  const messaging = admin.messaging();
  
  for (const memberEmail of membersToInvite) {
    try {
      const message = {
        notification: {
          title: 'New Group Invitation',
          body: `${inviterEmail} invited you to join group "${group.name}"`
        },
        data: {
          type: 'GROUP_INVITE',
          groupId: group.id,
          groupName: group.name,
          inviterEmail
        },
        topic: `user_${memberEmail.replace(/[@.]/g, '_')}`
      };
      
      await messaging.send(message);
      console.log(`Group invite sent to ${memberEmail}`);
    } catch (error) {
      console.error(`Error sending invite to ${memberEmail}:`, error);
    }
  }
}

// FIX: Updated expense notification function
async function sendExpenseNotification(groupId, expense, payerEmail) {
  const messaging = admin.messaging();
  const group = groups[groupId];
  
  for (const member of group.members) {
    if (member.email !== payerEmail) {
      try {
        const message = {
          notification: {
            title: 'New Expense Added',
            body: `${payerEmail} added a new expense in "${group.name}": ${expense.description} - $${expense.amount}`
          },
          data: {
            type: 'NEW_EXPENSE',
            groupId,
            groupName: group.name,
            expenseId: expense.id,
            amount: expense.amount.toString(),
            payerEmail,
            description: expense.description
          },
          topic: `user_${member.email.replace(/[@.]/g, '_')}`
        };
        
        await messaging.send(message);
        console.log(`Expense notification sent to ${member.email}`);
      } catch (error) {
        console.error(`Error sending expense notification to ${member.email}:`, error);
      }
    }
  }
}

// Start server
const PORT = process.env.PORT || 1234;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});