const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "adeelimran467@gmail.com",
    pass: "bvfdvstuchpjgcqi",
  },
  debug: true,
});

module.exports = transporter;
