
const crypto = require('crypto');

function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.user_id) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in to continue.'
  });
}


function ensureCsrfToken(req, res, next) {
  if (req.session && !req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  next();
}


function verifyCsrf(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const exemptPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout'
  ];
  if (exemptPaths.includes(req.path)) {
    return next();
  }

  // Check token in custom header or body
  const clientToken = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
  const sessionToken = req.session ? req.session.csrfToken : null;

  if (!sessionToken || !clientToken || clientToken !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Request rejected for security.'
    });
  }

  next();
}

module.exports = {
  requireAuth,
  ensureCsrfToken,
  verifyCsrf
};
