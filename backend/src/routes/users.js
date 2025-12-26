const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - Get all users
router.get('/', userController.getAllUsers);

// GET /api/users/top - Get top users by online time
router.get('/top', userController.getTopUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', userController.getUserById);

module.exports = router;
