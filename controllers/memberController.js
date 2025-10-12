const Member = require('../models/Member');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// === Multer Setup ===
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG/PNG allowed'));
  },
});
exports.upload = upload.single('photo');

// === Helper: Parse form data ===
const parseFormData = (body) => {
  const result = {};
  for (let key in body) {
    let val = body[key];
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try {
        val = JSON.parse(val);
      } catch {}
    }
    if (!isNaN(val) && val !== '' && val !== true && val !== false) val = Number(val);
    result[key] = val === '' ? undefined : val;
  }
  return result;
};

// === Helper: Delete old photo file safely ===
const deleteOldPhoto = (filename) => {
  if (!filename) return;
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (!err) {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('❌ Failed to delete old photo:', unlinkErr);
        else console.log('🗑️ Deleted old photo:', filename);
      });
    }
  });
};

// ===== Controllers =====

// Get all members
exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.status(200).json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching members', error: err.message });
  }
};

// Get member by ID
exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching member', error: err.message });
  }
};

// Create new member
exports.createMember = async (req, res) => {
  try {
    let data = parseFormData(req.body);
    if (req.file) data.photo = req.file.filename;

    // Ensure nested objects
    data.previousWeights = data.previousWeights || [];
    data.bodyMeasurements = data.bodyMeasurements || {};

    // Calculate membershipEndDate
    const start = data.membershipStartDate ? new Date(data.membershipStartDate) : new Date();
    if (data.membershipDuration) {
      const end = new Date(start);
      end.setMonth(end.getMonth() + Number(data.membershipDuration));
      data.membershipEndDate = end;
    }

    const member = new Member(data);
    const saved = await member.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error creating member', error: err.message });
  }
};

// Update member
exports.updateMember = async (req, res) => {
  try {
    let data = parseFormData(req.body);
    const existing = await Member.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Member not found' });

    // If new photo uploaded → delete old one
    if (req.file) {
      if (existing.photo) deleteOldPhoto(existing.photo);
      data.photo = req.file.filename;
    }

    // Ensure nested objects
    data.previousWeights = Array.isArray(data.previousWeights) ? data.previousWeights : [];
    data.bodyMeasurements = data.bodyMeasurements || {};

    // Track previous weights
    if (data.bodyWeight && Number(data.bodyWeight) !== existing.bodyWeight) {
      existing.previousWeights = existing.previousWeights || [];
      if (existing.bodyWeight !== undefined && existing.bodyWeight !== null) {
        existing.previousWeights.push({ date: new Date(), weight: existing.bodyWeight });
      }
      data.previousWeights = existing.previousWeights;
    }

    // Auto-update membershipEndDate if duration changed
    if (data.membershipDuration) {
      const baseDate = existing.membershipEndDate ? new Date(existing.membershipEndDate) : new Date();
      baseDate.setMonth(baseDate.getMonth() + Number(data.membershipDuration));
      data.membershipEndDate = baseDate;
    }

    const updated = await Member.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error updating member', error: err.message });
  }
};

// Delete member
exports.deleteMember = async (req, res) => {
  try {
    const deleted = await Member.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Member not found' });

    // 🗑️ Delete photo file when member deleted
    if (deleted.photo) deleteOldPhoto(deleted.photo);

    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting member', error: err.message });
  }
};
