const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// ✅ Dashboard route must come BEFORE the dynamic ":id" route
router.get('/stats/dashboard', memberController.getDashboardStats);

// Standard CRUD routes
router.get('/', memberController.getAllMembers);
router.post('/', memberController.upload, memberController.createMember);
router.put('/:id', memberController.upload, memberController.updateMember);
router.get('/:id', memberController.getMemberById);
router.delete('/:id', memberController.deleteMember);

module.exports = router;
