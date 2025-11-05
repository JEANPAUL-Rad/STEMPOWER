import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.sendMail({
  from: process.env.SMTP_USER,
  to: process.env.SMTP_USER, // send to yourself for test
  subject: 'Test email',
  text: 'If you see this, SMTP is working!',
}).then(() => {
  console.log('Test email sent!');
}).catch(console.error);