const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  dob: { type: Date, required: true },
  healthConditions: { type: String, default: '' },
  
  // ✅ Updated: Allow all 1–12 month durations
  membershipDuration: { 
    type: Number, 
    required: true, 
    enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] 
  },

  membershipStartDate: { type: Date, required: true, default: Date.now },
  membershipEndDate: { type: Date }, // Calculated automatically
  paidFee: { type: Number, required: true },
  pendingFee: { type: Number, default: 0 },
  workoutPlan: { type: String, default: '' },
  bodyWeight: { type: Number },
  bodyMeasurements: { type: Object, default: {} },
  mobileNumber: { type: String, required: true, match: /^[0-9]{10}$/ },
  emergencyContactNumber: { type: String, required: true, match: /^[0-9]{10}$/ },
  photo: { type: String, default: null },
  previousWeights: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Virtual: Membership Status
MemberSchema.virtual('membershipStatus').get(function() {
  if (!this.membershipEndDate) return 'Unknown';
  return new Date() > this.membershipEndDate ? 'Expired' : 'Active';
});

module.exports = mongoose.model('Member', MemberSchema);
