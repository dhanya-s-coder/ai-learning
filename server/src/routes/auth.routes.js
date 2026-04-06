import { Router } from "express";
import { User } from "../../models/User.js";
import {
  comparePassword,
  generateResetToken,
  hashPassword,
  signRefreshToken,
  signToken,
  validatePasswordRules,
  verifyRefreshToken
} from "../../lib/auth.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
  signupSchema
} from "../validators/auth.validators.js";
import { authLimiter } from "../middleware/rate-limit.middleware.js";
import { safeAsync } from "../middleware/error.middleware.js";

const router = Router();

router.post("/signup", authLimiter, safeAsync(async (req, res) => {
  const { name, email, password } = signupSchema.parse(req.body);
  if (!validatePasswordRules(password)) {
    return res.status(400).json({ error: "Password must be at least 8 chars and include uppercase, lowercase, and a number." });
  }
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ error: "Email already exists." });
  }
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password)
  });
  const token = signToken({ id: user._id.toString(), name: user.name, email: user.email });
  const refreshToken = signRefreshToken({ id: user._id.toString() });
  user.refreshTokens.push({ token: refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  await user.save();
  res.json({ token, refreshToken, user: { id: user._id.toString(), name: user.name, email: user.email } });
}));

router.post("/login", authLimiter, safeAsync(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  const token = signToken({ id: user._id.toString(), name: user.name, email: user.email });
  const refreshToken = signRefreshToken({ id: user._id.toString() });
  user.refreshTokens.push({ token: refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  await user.save();
  res.json({ token, refreshToken, user: { id: user._id.toString(), name: user.name, email: user.email } });
}));

router.post("/refresh", safeAsync(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub);
  if (!user || !user.refreshTokens.some((item) => item.token === refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token." });
  }
  const token = signToken({ id: user._id.toString(), name: user.name, email: user.email });
  res.json({ token });
}));

router.post("/forgot-password", authLimiter, safeAsync(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (user) {
    user.resetToken = {
      token: generateResetToken(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    };
    await user.save();
  }
  res.json({
    ok: true,
    debugResetToken: process.env.NODE_ENV === "production" ? undefined : user?.resetToken?.token
  });
}));

router.post("/reset-password", authLimiter, safeAsync(async (req, res) => {
  const { email, resetToken, password } = resetPasswordSchema.parse(req.body);
  if (!validatePasswordRules(password)) {
    return res.status(400).json({ error: "Password must be at least 8 chars and include uppercase, lowercase, and a number." });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.resetToken || user.resetToken.token !== resetToken || user.resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid or expired reset token." });
  }
  user.passwordHash = await hashPassword(password);
  user.resetToken = null;
  user.refreshTokens = [];
  await user.save();
  res.json({ ok: true });
}));

export default router;
