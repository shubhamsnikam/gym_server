const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { upload, createMember } = require('../controllers/memberController');

// Apply multer middleware to both POST and PUT
router.post('/', memberController.upload, memberController.createMember);
router.put('/:id', memberController.upload, memberController.updateMember);

// GET all members
router.get('/', memberController.getAllMembers);

// GET a single member
router.get('/:id', memberController.getMemberById);

// POST create a new member
router.post('/', upload, createMember);


// PUT update a member
router.put('/:id', memberController.updateMember);

// DELETE a member
router.delete('/:id', memberController.deleteMember);

module.exports = router;
