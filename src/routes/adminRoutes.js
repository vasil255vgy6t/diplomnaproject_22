const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  login,
  getDashboardStats,
  getResults,
  createTest,
  updateTest,
  deleteTest,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAdmins,
  createAdmin,
  deleteAdmin
} = require('../controllers/adminController');

const router = express.Router();

router.post('/login', login);
router.get('/dashboard', authMiddleware, getDashboardStats);
router.get('/results', authMiddleware, getResults);
router.post('/tests', authMiddleware, createTest);
router.put('/tests/:id', authMiddleware, updateTest);
router.delete('/tests/:id', authMiddleware, deleteTest);
router.post('/questions', authMiddleware, createQuestion);
router.put('/questions/:id', authMiddleware, updateQuestion);
router.delete('/questions/:id', authMiddleware, deleteQuestion);
router.get('/admins', authMiddleware, getAdmins);
router.post('/admins', authMiddleware, createAdmin);
router.delete('/admins/:id', authMiddleware, deleteAdmin);

module.exports = router;
