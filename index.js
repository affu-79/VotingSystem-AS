require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const mysql = require("mysql2");
const CryptoJS = require("crypto-js");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static("public")); // for static files like index.html
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// MySQL DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS.trim(), // remove accidental space
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("MySQL Connected!");
  }
});

// Route: Signup POST
app.post("/signup", (req, res) => {
  const { name, email, password, key } = req.body;

  if (!name || !email || !password || !key) {
    return res.status(400).send("Missing fields");
  }

  const encryptedPassword = CryptoJS.AES.encrypt(password, key).toString();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const sql = "INSERT INTO users (name, email, password, otp) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, email, encryptedPassword, otp], (err) => {
    if (err) {
      console.error("Insert error:", err.message);
      return res.status(500).send("Error saving user");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "VotingSystem AS: Your OTP",
      text: `Hello ${name}, your OTP is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email error:", error);
        return res.status(500).send("OTP email failed");
      }
      console.log("Email sent: " + info.response);
      res.status(200).send("Signup successful. OTP sent to email.");
    });
  });
});




// Verify OTP Route
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const sql = "UPDATE users SET verified = true WHERE email = ? AND otp = ?";

  db.query(sql, [email, otp], (err, result) => {
    if (result.affectedRows === 1) {
      res.json({ success: true, message: "Account verified successfully." });
    } else {
      res.json({ success: false, message: "Invalid OTP." });
    }
  });
});

app.post("/login", (req, res) => {
    const { email, password, key } = req.body;
    const sql = "SELECT password, verified FROM users WHERE email = ?";
  
    db.query(sql, [email], (err, results) => {
      if (err || results.length === 0)
        return res.json({ success: false, message: "User not found." });
  
      const user = results[0];
      if (!user.verified)
        return res.json({ success: false, message: "Email not verified." });
  
      try {
        const decrypted = CryptoJS.AES.decrypt(user.password, key);
        const decryptedPass = decrypted.toString(CryptoJS.enc.Utf8);
  
        if (decryptedPass === password) {
          return res.json({ success: true, message: "Authenticated successfully." });
        } else {
          return res.json({ success: false, message: "Invalid credentials." });
        }
      } catch (e) {
        return res.json({ success: false, message: "Decryption error." });
      }
    });
  });
  


// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });