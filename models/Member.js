const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  dob: {
    type: Date,
    required: true
  },
  healthConditions: {
    type: String,
    default: ''
  },
  membershipDuration: {
    type: Number,
    required: true,
    enum: [1, 3, 6, 12]
  },
  membershipStartDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  membershipEndDate: {
    type: Date,
    required: true
  },
  paidFee: {
    type: Number,
    required: true
  },
  pendingFee: {
    type: Number,
    default: 0
  },
  workoutPlan: {
    type: String,
    default: ''
  },
  bodyWeight: {
    type: Number
  },
  bodyMeasurements: {
    chest: Number,
    waist: Number,
    hips: Number,
    abs: Number,
    arms: Number
  },
  mobileNumber: {
    type: String,
    required: true
  },
  emergencyContactNumber: {
    type: String,
    required: true
  },
  photo: {
    type: String, // Stores the filename of the uploaded image
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Member', MemberSchema);
