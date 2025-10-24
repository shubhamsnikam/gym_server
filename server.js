const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve fallback static assets
app.use('/public', express.static(path.join(__dirname, 'public')));

// API routes
const memberRoutes = require('./routes/memberRoutes');
app.use('/api/members', memberRoutes);

// Root
app.get('/', (req, res) => res.send('✅ Sai Fitness Gym Server is running 💪'));

// MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
