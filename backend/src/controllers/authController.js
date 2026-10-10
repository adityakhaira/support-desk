const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken, setAuthCookie } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { registerSchema, loginSchema } = require('../validators');

async function register(req, res) {
  try {
    const parsed = registerSchema.parse(req.body);
    const email = parsed.email.trim().toLowerCase();

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return errorResponse(res, 409, 'A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const role = 'CUSTOMER';

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [parsed.name.trim(), email, passwordHash, role]
    );

    const [rows] = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users WHERE id = ?`,
      [result.insertId]
    );

    const user = rows[0];
    const token = signToken(user);
    setAuthCookie(res, token);

    return successResponse(res, 201, {
      message: 'Registration successful.',
      token,
      user
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'A user with this email already exists.');
    }
    console.error('Registration failed:', error);
    return errorResponse(res, 500, 'Unable to register user.');
  }
}

async function login(req, res) {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = parsed.email.trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!rows.length) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    const user = rows[0];
    if (!user.is_active) {
      return errorResponse(res, 401, 'User is inactive.');
    }

    const valid = await bcrypt.compare(parsed.password, user.password_hash);
    if (!valid) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    };

    const token = signToken(safeUser);
    setAuthCookie(res, token);

    return successResponse(res, 200, {
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    console.error('Login failed:', error);
    return errorResponse(res, 500, 'Unable to log in.');
  }
}

function logout(req, res) {
  res.clearCookie('supportdesk_token');
  return successResponse(res, 200, { message: 'Logged out successfully.' });
}

async function me(req, res) {
  return successResponse(res, 200, { user: req.user });
}

module.exports = { register, login, logout, me };
