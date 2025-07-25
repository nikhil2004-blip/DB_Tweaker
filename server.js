// Production server entry point
require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('frontend'));

// Import routes
const authRoutes = require('./backend/routes/auth');
const apiRoutes = require('./backend/routes/api');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Basic route to verify server is running
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/frontend/index.html');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
