// server/controllers/memberController.js
const Member = require('../models/Member');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// === Cloudinary config (uses env vars) ===
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// === Multer storage using Cloudinary ===
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'gym_members',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1000, crop: 'limit' }], // limit size on upload
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG/PNG allowed'));
    }
    cb(null, true);
  },
}).single('photo');

exports.upload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image must be smaller than 1MB' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// === Helper: parse incoming form fields (strings or JSON) ===
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

// Note: with Cloudinary we no longer store files on local disk.
// Keep deleteOldPhoto only if you have local files to remove; left here for compatibility.
const deleteOldPhoto = (urlOrFilename) => {
  // if value looks like a cloudinary public_id we could remove, but
  // since we're storing full URL we skip automatic deletion to avoid accidental removal.
  // Implement deletion if you want to actively manage Cloudinary resources.
  return;
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

    // If Cloudinary stored file, multer-cloudinary sets req.file.path to secure_url (string)
    if (req.file && req.file.path) data.photo = req.file.path;

    // Ensure nested objects
    data.previousWeights = data.previousWeights || [];
    data.bodyMeasurements = data.bodyMeasurements || {};

    // Calculate membershipEndDate, normalize to local midnight
    const start = data.membershipStartDate ? new Date(data.membershipStartDate) : new Date();
    if (data.membershipDuration) {
      const end = new Date(start);
      end.setMonth(end.getMonth() + Number(data.membershipDuration));
      end.setHours(0, 0, 0, 0);
      data.membershipEndDate = end;
    }

    const member = new Member(data);
    const saved = await member.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('createMember error:', err);
    res.status(400).json({ message: 'Error creating member', error: err.message });
  }
};

// Update member — preserve existing fields that aren't provided in the update
exports.updateMember = async (req, res) => {
  try {
    let data = parseFormData(req.body);
    const existing = await Member.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Member not found' });

    // Photo handling: if new file uploaded, take its Cloudinary URL; otherwise keep existing
    if (req.file && req.file.path) {
      data.photo = req.file.path;
    } else {
      data.photo = existing.photo;
    }

    // Merge nested bodyMeasurements (don't overwrite)
    data.bodyMeasurements = {
      ...existing.bodyMeasurements,
      ...(data.bodyMeasurements || {}),
    };

    // Preserve previousWeights and append if bodyWeight changed
    data.previousWeights = Array.isArray(existing.previousWeights)
      ? [...existing.previousWeights]
      : [];

    if (data.bodyWeight !== undefined && Number(data.bodyWeight) !== Number(existing.bodyWeight)) {
      if (existing.bodyWeight !== undefined && existing.bodyWeight !== null) {
        data.previousWeights.push({ date: new Date(), weight: existing.bodyWeight });
      }
    } else {
      // if bodyWeight not supplied, keep existing bodyWeight
      data.bodyWeight = existing.bodyWeight;
    }

    // Preserve important top-level fields if not provided
    const preservedFields = [
      'name',
      'address',
      'dob',
      'healthConditions',
      'paidFee',
      'pendingFee',
      'workoutPlan',
      'mobileNumber',
      'emergencyContactNumber',
    ];
    for (const field of preservedFields) {
      if (data[field] === undefined) data[field] = existing[field];
    }

    // membership calculations:
    // If membershipDuration is supplied, recalc end date from membershipStartDate (prefer provided, else existing)
    const startDateToUse = data.membershipStartDate
      ? new Date(data.membershipStartDate)
      : existing.membershipStartDate
      ? new Date(existing.membershipStartDate)
      : new Date();

    if (data.membershipDuration) {
      const end = new Date(startDateToUse);
      end.setMonth(end.getMonth() + Number(data.membershipDuration));
      end.setHours(0, 0, 0, 0);
      data.membershipEndDate = end;
    } else {
      // preserve existing end date if not recalculated
      data.membershipEndDate = existing.membershipEndDate;
      data.membershipDuration = existing.membershipDuration;
      data.membershipStartDate = existing.membershipStartDate;
    }

    const updated = await Member.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) {
    console.error('updateMember error:', err);
    res.status(400).json({ message: 'Error updating member', error: err.message });
  }
};

// Delete member
exports.deleteMember = async (req, res) => {
  try {
    const deleted = await Member.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Member not found' });

    // We do NOT call cloudinary.v2.uploader.destroy here by default.
    // If you want to actively delete Cloudinary resources when members are deleted,
    // extract the public_id from the stored URL and call cloudinary.uploader.destroy(public_id).
    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting member', error: err.message });
  }
};
