import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';

// Middleware to protect routes that require user authentication
export const protectUser = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
        req.user = await User.findByPk(decoded.id, { attributes: { exclude: ["password"] } }); // Attach user to request, exclude password
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to protect routes that require admin or reviewer roles
export const authorizeAdminOrReviewer = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'reviewer')) {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin or reviewer' });
  }
};

// Middleware to protect routes that require admin role only
export const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// Middleware to optionally authenticate user if token is provided
export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      // If user not found for a valid token, req.user will be null.
    } catch (error) {
      console.warn('OptionalAuth: Token verification failed or user not found for token.', error.name); 
      req.user = null; // Explicitly set to null on error or if user not found
    }
  }
  next(); 
};
