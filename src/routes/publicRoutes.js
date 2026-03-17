const express = require('express');
const { getTests, getTestQuestions, submitTest } = require('../controllers/publicController');

const router = express.Router();

router.get('/tests', getTests);
router.get('/tests/:id/questions', getTestQuestions);
router.post('/tests/submit', submitTest);

module.exports = router;
