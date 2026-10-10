const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured.');
  }
  return secret;
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

function setAuthCookie(res, token) {
  const payload = jwt.decode(token);
  const maxAge = payload && payload.exp
    ? Math.max(0, payload.exp * 1000 - Date.now())
    : 24 * 60 * 60 * 1000;
  res.cookie('supportdesk_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/'
  });
}

module.exports = { signToken, setAuthCookie, getJwtSecret };
