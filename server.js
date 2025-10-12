const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// === Ensure uploads folder exists ===
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// === Middleware ===
app.use(cors());
app.use(express.json());

// === Serve static files ===
app.use(
  '/uploads',
  express.static(uploadsDir, {
    fallthrough: true, // allows next route to handle missing files
  })
);

// === Fallback route for missing images ===
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If image not found, return default placeholder
      return res.sendFile(path.join(__dirname, 'public', 'no-image.png'));
    } else {
      return res.sendFile(filePath);
    }
  });
});

// === API Routes ===
const memberRoutes = require('./routes/memberRoutes');
app.use('/api/members', memberRoutes);

// === Default root route ===
app.get('/', (req, res) => {
  res.send('✅ Sai Fitness Gym Server is running 💪');
});

// === Connect to MongoDB ===
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

// === Start server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
