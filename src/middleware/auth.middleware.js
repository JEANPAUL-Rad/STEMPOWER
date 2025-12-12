// import jwt from 'jsonwebtoken'
// import { error } from '../utils/response.util.js';

// export function authenticate(req, res, next) {
//   const authHeader = req.headers.authorization
//   if (!authHeader) return error(res, 'No token provided', 401)
//   const token = authHeader.split(' ')[1]
//   if (!token) return error(res, 'Invalid token', 401)

//   jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//     if (err) return error(res, 'Invalid or expired token', 401)
//     req.user = decoded
//     next()
//   })
// }

// export function requireAdmin(req, res, next) {
//   if (req.user?.role !== 'admin') {
//     return error(res, 'Admin access required', 403)
//   }
//   next()
// }


// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import { error } from '../utils/response.util.js';

/**
 * Authentication middleware that checks both session and JWT token
 */
export function authenticate(req, res, next) {
  // Prefer JWT token first (API requests)
  const token = getTokenFromRequest(req);

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return error(res, 'Invalid or expired token', 401);
      }
      req.user = decoded;
      // Optionally set session, but token remains the source of truth per request
      req.session.user = decoded;
      return next();
    });
    return; // ensure we don't fall through
  }

  // Fallback to session (cookie-based auth)
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }

  return error(res, 'Authentication required. No valid token or session found.', 401);
}

/**
 * Middleware to require admin privileges
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return error(res, 'Authentication required', 401);
  }
  
  if (req.user.role !== 'admin') {
    return error(res, 'Admin access required', 403);
  }
  
  next();
}

/**
 * Middleware to require specific roles
 * @param {string[]} allowedRoles - Array of allowed roles
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return error(res, 'Insufficient privileges', 403);
    }
    
    next();
  };
}

/**
 * Optional authentication middleware
 * Sets req.user if authenticated, but doesn't block if not
 */
export function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
        req.session.user = decoded;
      }
      next();
    });
    return;
  }

  if (req.session?.user) {
    req.user = req.session.user;
  }
  next();
}

/**
 * Helper function to extract token from request
 */
function getTokenFromRequest(req) {
  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 2. Check cookies
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  // 3. Check query parameters (for GET requests)
  if (req.query?.token) {
    return req.query.token;
  }

  return null;
}

/**
 * Middleware to check if user is authenticated (without throwing error)
 * Useful for routes that need to know auth state but don't require it
 */
export function checkAuthState(req, res, next) {
  const token = getTokenFromRequest(req);
  if (token) {
    return jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.json({ isAuthenticated: false });
      req.user = decoded;
      req.session.user = decoded;
      return res.json({ isAuthenticated: true, user: decoded });
    });
  }

  if (req.session?.user) {
    req.user = req.session.user;
    return res.json({ isAuthenticated: true, user: req.user });
  }

  return res.json({ isAuthenticated: false });
}
