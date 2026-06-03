require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth.routes');
const borrowerRoutes = require('./routes/borrower.routes');
const alertRoutes = require('./routes/alert.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// DB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(' MongoDB error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/borrowers', borrowerRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
