// server.js
require('dotenv').config(); // Load environment variables first
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const app = express();

// === ✅ CORS Setup ===
const allowedOrigins = [
  'http://localhost:3000', // for local testing
  'https://gym-client-aux3.onrender.com', // your deployed frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed from this origin: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// === Middleware ===
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// === API Routes ===
const memberRoutes = require('./routes/memberRoutes');
app.use('/api/members', memberRoutes);

// === Root Route ===
app.get('/', (req, res) => res.send('✅ Sai Fitness Gym Server is running 💪'));

// === MongoDB Connection ===
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// === Cloudinary Configuration ===
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test Cloudinary connection
cloudinary.api.ping()
  .then(() => console.log('✅ Cloudinary connected'))
  .catch(err => console.error('❌ Cloudinary connection failed:', err.message || err));

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
