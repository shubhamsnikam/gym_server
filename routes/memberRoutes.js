const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// GET all members
router.get('/', memberController.getAllMembers);

// GET a single member
router.get('/:id', memberController.getMemberById);

// POST create a new member
router.post('/', memberController.upload, memberController.createMember);

// PUT update a member
router.put('/:id', memberController.upload, memberController.updateMember);

// DELETE a member
router.delete('/:id', memberController.deleteMember);

module.exports = router;
