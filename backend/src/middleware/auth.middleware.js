const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access forbidden: insufficient role' });
  }
  next();
};

// BUG FIX #3: borrowerDataGuard was blocking borrowers from accessing /api/alerts/:id
// because req.params.id is the MongoDB _id, not a borrowerId — the guard was
// incorrectly comparing the MongoDB alert _id against req.user.borrowerId.
// Fix: Only apply borrowerId guard when req.params.borrowerId is present (borrower routes).
// The alerts route does its own borrowerId check in the handler.
const borrowerDataGuard = (req, res, next) => {
  if (req.user.role === 'borrower') {
    const requestedBorrowerId = req.params.borrowerId;
    if (requestedBorrowerId && requestedBorrowerId !== req.user.borrowerId) {
      return res.status(403).json({ message: 'Access denied: you can only view your own data' });
    }
    // Inject their own borrowerId for list queries
    req.query.borrowerId = req.user.borrowerId;
  } else if (req.user.role === 'analyst') {
    req.assignedBorrowers = req.user.assignedBorrowers;
  }
  next();
};

module.exports = { authenticate, authorize, borrowerDataGuard };
