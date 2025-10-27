const User = require('../models/User');
const PendingUser = require('../models/PendingUsers');
const Metric = require('../models/Metric');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// ==============================
//  SMTP CONFIGURATION
// ==============================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ==============================
//  HELPER: Generate 6-digit OTP
// ==============================
function genOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// =========================================================
//  STEP 1 — REGISTER (Send OTP, store in PendingUser table)
// =========================================================
exports.register = async (req, res) => {
  try {
    const { username, name, email, password, phone, role = 'staff' } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: 'Missing required fields' });

    // Check if already registered
    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res.status(409).json({ message: 'Email already registered' });

    // Create hashed password + OTP
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = genOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

    // Store or update pending registration
    await PendingUser.upsert({
      email,
      username,
      name,
      passwordHash,
      phone,
      role,
      otp,
      expires,
    });

    // Send OTP email
    await transporter.sendMail({
      to: email,
      from: process.env.SMTP_USER,
      subject: 'Your Registration OTP',
      text: `Your MANIFEST Registration OTP is ${otp}. It expires in 15 minutes.`,
    });

    return res.status(200).json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Register Error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

// =================================================================
//  STEP 2 — VERIFY REGISTRATION (Validate OTP, create actual User)
// =================================================================
exports.verifyRegistration = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const pending = await PendingUser.findByPk(email);

    if (!pending)
      return res.status(400).json({ message: 'No registration found for this email' });
    if (pending.otp !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > pending.expires)
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });

    // Check duplicate
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      await pending.destroy();
      return res.status(400).json({ message: 'User already registered.' });
    }

    // Create actual user
    const user = await User.create({
      username: pending.username,
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      phone: pending.phone,
      role: pending.role,
      otp: pending.otp,
      otpExpires: pending.expires,
    });

    // ✅ Safely update metrics
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const [metric, created] = await Metric.findOrCreate({
        where: { date: today },
        defaults: { totalUsers: 1, totalSales: 0, totalConversions: 0 },
      });

      if (!created) {
        metric.totalUsers += 1;
        await metric.save();
      }
    } catch (metricErr) {
      console.warn('⚠️ Metric update failed (non-blocking):', metricErr.message);
    }

    // Clean up pending record
    await pending.destroy();

    return res.status(201).json({ message: 'Registration successful', userId: user.id });
  } catch (err) {
    console.error('Verify Registration Error:', err);
    return res.status(500).json({ message: 'Server error verifying OTP' });
  }
};

// ====================================
//  LOGIN
// ====================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Missing credentials' });

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(401).json({ message: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ message: 'Invalid password' });

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// ============================================================
//  STEP 3 — RESEND OTP (for unverified PendingUser registrations)
// ============================================================
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: 'Email is required' });

    const pending = await PendingUser.findByPk(email);
    if (!pending)
      return res.status(400).json({ message: 'No pending registration found for this email' });

    const newOtp = genOTP();
    pending.otp = newOtp;
    pending.expires = new Date(Date.now() + 15 * 60 * 1000);
    await pending.save();

    await transporter.sendMail({
      to: email,
      from: process.env.SMTP_USER,
      subject: 'Your New OTP',
      text: `Your new OTP is ${newOtp}. It expires in 15 minutes.`,
    });

    return res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    console.error('Resend OTP Error:', err);
    return res.status(500).json({ message: 'Server error resending OTP' });
  }
};

// ======================================================
//  STEP 4 — VERIFY OTP & RESET PASSWORD (for forgot password)
// ======================================================
exports.verifyOtpReset = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: 'Email, OTP and new password required' });

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Verify OTP Reset Error:', err);
    return res.status(500).json({ message: 'Server error verifying OTP reset' });
  }
};
