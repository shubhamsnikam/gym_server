const Member = require('../models/Member');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// === Cloudinary Config ===
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// === Multer + Cloudinary ===
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'gym_members',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1000, crop: 'limit' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only JPG/PNG allowed'));
    cb(null, true);
  },
}).single('photo');

exports.upload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ message: 'Image must be smaller than 1MB' });
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// === Helper: Parse Form Data ===
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

// ===== Controllers =====

// GET all members
exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.status(200).json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching members', error: err.message });
  }
};

// GET member by ID
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

// CREATE member
exports.createMember = async (req, res) => {
  try {
    let data = parseFormData(req.body);
    if (req.file && req.file.path) data.photo = req.file.path;

    data.previousWeights = data.previousWeights || [];
    data.bodyMeasurements = data.bodyMeasurements || {};

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

// UPDATE member
exports.updateMember = async (req, res) => {
  try {
    let data = parseFormData(req.body);
    const existing = await Member.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Member not found' });

    if (req.file && req.file.path) data.photo = req.file.path;
    else data.photo = existing.photo;

    data.bodyMeasurements = {
      ...existing.bodyMeasurements,
      ...(data.bodyMeasurements || {}),
    };

    data.previousWeights = Array.isArray(existing.previousWeights)
      ? [...existing.previousWeights]
      : [];

    if (data.bodyWeight !== undefined && Number(data.bodyWeight) !== Number(existing.bodyWeight)) {
      if (existing.bodyWeight !== undefined && existing.bodyWeight !== null)
        data.previousWeights.push({ date: new Date(), weight: existing.bodyWeight });
    } else {
      data.bodyWeight = existing.bodyWeight;
    }

    const preservedFields = [
      'name', 'address', 'dob', 'healthConditions', 'paidFee',
      'pendingFee', 'workoutPlan', 'mobileNumber', 'emergencyContactNumber'
    ];
    for (const f of preservedFields) if (data[f] === undefined) data[f] = existing[f];

    const startDate = data.membershipStartDate
      ? new Date(data.membershipStartDate)
      : existing.membershipStartDate
      ? new Date(existing.membershipStartDate)
      : new Date();

    if (data.membershipDuration) {
      const end = new Date(startDate);
      end.setMonth(end.getMonth() + Number(data.membershipDuration));
      end.setHours(0, 0, 0, 0);
      data.membershipEndDate = end;
    } else {
      data.membershipStartDate = existing.membershipStartDate;
      data.membershipEndDate = existing.membershipEndDate;
      data.membershipDuration = existing.membershipDuration;
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

// DELETE member
exports.deleteMember = async (req, res) => {
  try {
    const deleted = await Member.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Member not found' });
    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting member', error: err.message });
  }
};
