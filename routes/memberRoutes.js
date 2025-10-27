const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// Existing routes
router.get('/', memberController.getAllMembers);
router.get('/:id', memberController.getMemberById);
router.post('/', memberController.upload, memberController.createMember);
router.put('/:id', memberController.upload, memberController.updateMember);
router.delete('/:id', memberController.deleteMember);

// ✅ New Dashboard route
router.get('/stats/dashboard', memberController.getDashboardStats);

module.exports = router;
