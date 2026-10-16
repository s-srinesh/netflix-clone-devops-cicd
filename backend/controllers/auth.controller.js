import crypto from 'crypto';
import { Op } from 'sequelize';
import User from '../models/user.model.js';
import { ENV_VARS } from '../config/env.config.js';
import { generateTokenAndSetCookie, generateVerificationToken } from '../helpers/helper.js';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
} from '../services/mailtrap.service.js';

/**
 * Handles the signup request by validating user input, checking for existing users,
 * generating a verification token, sending a verification email, creating a new user in MySQL,
 * and returning a success message with the user's information.
 */
export const signup = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // validate request body fields and format data
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }

    // validate password
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // check if username already exists
    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    // check if email already exists
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // generate the token for email verification
    const verificationToken = generateVerificationToken();
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (mailError) {
      console.warn('Mailtrap send failed, proceeding with registration:', mailError.message);
    }

    // create new user and save to MySQL database
    const newUser = await User.create({
      username,
      email,
      password,
      isVerified: !ENV_VARS.MAILTRAP_TOKEN,
      verificationToken,
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // create token and set token to cookie
    const token = generateTokenAndSetCookie(newUser.id, res);

    const userData = newUser.toJSON();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        ...userData,
        accessToken: token,
      },
    });
  } catch (error) {
    console.error('Error in signup controller', error.message);
    const isDbError =
      error.name?.includes('Sequelize') ||
      error.message?.includes('Access denied') ||
      error.message?.includes('ECONNREFUSED');
    const message = isDbError
      ? `Database connection error: ${error.message}. Please check DB_PASSWORD and DB_HOST in your .env file.`
      : error.message || 'Internal Server Error';
    res.status(500).json({ success: false, message });
  }
};

/**
 * Handles the login request by validating user input, checking credentials against MySQL,
 * and returning a success message with user information and JWT cookie.
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // validate request body fields
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // create token and set to cookie
    const token = generateTokenAndSetCookie(user.id, res);

    // update lastLogin field
    user.lastLogin = new Date();
    await user.save();

    const userData = user.toJSON();
    delete userData.password;

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: {
        ...userData,
        accessToken: token,
      },
    });
  } catch (error) {
    console.error('Error in login controller', error.message);
    const isDbError =
      error.name?.includes('Sequelize') ||
      error.message?.includes('Access denied') ||
      error.message?.includes('ECONNREFUSED');
    const message = isDbError
      ? `Database connection error: ${error.message}. Please check DB_PASSWORD and DB_HOST in your .env file.`
      : error.message || 'Internal Server Error';
    res.status(500).json({ success: false, message });
  }
};

/**
 * Handles the logout request by clearing authentication cookie.
 */
export const logout = async (req, res) => {
  res.clearCookie('netflixToken');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

/**
 * Handles email verification request using 6-digit code.
 */
export const verifyEmail = async (req, res) => {
  const { code } = req.body;

  try {
    const user = await User.findOne({
      where: {
        verificationToken: code,
        verificationExpiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // update user account to verified
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;
    await user.save();

    try {
      await sendWelcomeEmail(user.email, user.username);
    } catch (mailError) {
      console.warn('Welcome email sending failed:', mailError.message);
    }

    const userData = user.toJSON();
    delete userData.password;

    res.status(200).json({
      status: 'success',
      message: 'Account verified successfully',
      user: userData,
    });
  } catch (error) {
    console.error('Error in verifyEmail controller', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Handles forgot password request by creating reset token and emailing link.
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await user.save();

    const resetPasswordUrl = `${ENV_VARS.CLIENT_URL}/reset/password/${resetToken}`;
    try {
      await sendPasswordResetEmail(user.email, resetPasswordUrl);
    } catch (mailError) {
      console.warn('Password reset email sending failed:', mailError.message);
    }

    res.status(200).json({ success: true, message: 'Password reset link sent' });
  } catch (error) {
    console.error('Error in forgot password controller', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Handles password reset submission.
 */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (password?.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    try {
      await sendPasswordResetSuccessEmail(user.email);
    } catch (mailError) {
      console.warn('Reset confirmation email sending failed:', mailError.message);
    }

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in reset password controller', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Checks if user is authenticated and returns sanitized profile.
 */
export const checkAuth = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user: user.toJSON() });
  } catch (error) {
    console.error('Error in checkAuth controller', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
