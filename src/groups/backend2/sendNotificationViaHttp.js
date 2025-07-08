const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');

const PROJECT_ID = 'expensely-f4c59';

const keyFilePath = path.resolve(__dirname, '../backend/firebase-admin-config.json');

const getAccessToken = async () => {
  const auth = new GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
};

const sendNotificationViaHttp = async (topic, title, body, data = {}) => {
  const token = await getAccessToken();

  const message = {
    message: {
      topic,
      notification: {
        title,
        body,
      },
      data,
      fcmOptions: {
        analyticsLabel: 'payment_reminder_campaign'
      }
    }
  };

  const response = await axios.post(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    message,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

module.exports = sendNotificationViaHttp;
