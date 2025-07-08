const admin = require('firebase-admin');
const serviceAccount = require('./expensely-f4c59-firebase-adminsdk-fbsvc-b0299fab54.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
