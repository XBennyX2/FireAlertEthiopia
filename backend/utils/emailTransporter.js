const nodemailer = require('nodemailer');

module.exports = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  socketTimeout: 10000,
  greetingTimeout: 10000,
  connectionTimeout: 10000,
  localAddress: '0.0.0.0',
});