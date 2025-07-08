require('dotenv').config(); 
const nodemailer = require('nodemailer');
// to load EMAIL_USER and EMAIL_PASS

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS, // your App Password (NOT Gmail password)
  },
});

/**
 * Sends a payment reminder email to a group member
 * 
 * @param {string} to - Recipient email address
 * @param {string} groupName - Name of the group
 * @param {string} senderEmail - Email of the user sending reminder
 */
const sendPaymentReminderEmail = async (to, groupName, senderEmail) => {
  const subject = `Payment Reminder - ${groupName}`;
  const html = `
    <p>Hi there,</p>
    <p><strong>${senderEmail}</strong> has sent you a payment reminder for the group <strong>${groupName}</strong>.</p>
    <p>Please check the Expensely app to view and settle your dues.</p>
    <br/>
    <p>Thank you,<br/>Expensely Team</p>
  `;

  const mailOptions = {
    from: `"Expensely" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
};
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);
module.exports = sendPaymentReminderEmail;
