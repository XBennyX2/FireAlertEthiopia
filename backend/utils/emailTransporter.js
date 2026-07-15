const nodemailer = require('nodemailer');

module.exports = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  socketTimeout:     30000,
  greetingTimeout:   30000,
  connectionTimeout: 30000,
});