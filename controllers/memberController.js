const Member = require('../models/Member');
const multer = require('multer');
const path = require('path');

// Multer config
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });
exports.upload = upload.single('photo');

// Get all members
exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching members', error: error.message });
  }
};

// Get a single member
exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching member', error: error.message });
  }
};

// Create a new member
exports.createMember = async (req, res) => {
  try {
    const photo = req.file ? req.file.filename : null;
    const newMember = new Member({
      ...req.body,
      photo,
    });

    const savedMember = await newMember.save();
    res.status(201).json(savedMember);
  } catch (error) {
    res.status(400).json({ message: 'Error creating member', error: error.message });
  }
};

// Update a member
exports.updateMember = async (req, res) => {
  try {
    const photo = req.file ? req.file.filename : null;
    const updateData = { ...req.body };

    if (photo) {
      updateData.photo = photo;
    }

    const updatedMember = await Member.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.status(200).json(updatedMember);
  } catch (error) {
    res.status(400).json({ message: 'Error updating member', error: error.message });
  }
};

// Delete a member
exports.deleteMember = async (req, res) => {
  try {
    const deletedMember = await Member.findByIdAndDelete(req.params.id);
    if (!deletedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.status(200).json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting member', error: error.message });
  }
};
