const pool = require('../config/db');
const { evaluateResult } = require('../services/scoringService');

async function getTests(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, title, description, created_at FROM tests ORDER BY created_at DESC');
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Помилка завантаження тестів.' });
  }
}

async function getTestQuestions(req, res) {
  const { id } = req.params;

  try {
    const [tests] = await pool.query('SELECT id, title, description FROM tests WHERE id = ?', [id]);
    if (!tests.length) {
      return res.status(404).json({ message: 'Тест не знайдено.' });
    }

    const [questions] = await pool.query(
      `SELECT q.id, q.question_text, q.question_type,
              ao.id AS option_id, ao.answer_text, ao.score
       FROM questions q
       LEFT JOIN answers_options ao ON ao.question_id = q.id
       WHERE q.test_id = ?
       ORDER BY q.id, ao.id`,
      [id]
    );

    const grouped = questions.reduce((acc, item) => {
      const existing = acc.find((q) => q.id === item.id);
      if (existing) {
        existing.options.push({
          id: item.option_id,
          answer_text: item.answer_text,
          score: item.score
        });
      } else {
        acc.push({
          id: item.id,
          question_text: item.question_text,
          question_type: item.question_type,
          options: item.option_id
            ? [{ id: item.option_id, answer_text: item.answer_text, score: item.score }]
            : []
        });
      }
      return acc;
    }, []);

    return res.json({ ...tests[0], questions: grouped });
  } catch (error) {
    return res.status(500).json({ message: 'Помилка отримання питань тесту.' });
  }
}

async function submitTest(req, res) {
  const { testId, answers } = req.body;

  if (!testId || !Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ message: 'Некоректні дані для відправки тесту.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const optionIds = answers.map((a) => a.selected_answer_id);
    const [optionRows] = await connection.query(
      'SELECT id, question_id, score FROM answers_options WHERE id IN (?)',
      [optionIds]
    );

    if (optionRows.length !== answers.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Частина відповідей невалідна.' });
    }

    const totalScore = optionRows.reduce((sum, row) => sum + row.score, 0);
    const result = evaluateResult(totalScore);

    const [insertResult] = await connection.query(
      `INSERT INTO test_results (test_id, total_score, result_level, recommendation)
       VALUES (?, ?, ?, ?)`,
      [testId, totalScore, result.level, result.recommendation]
    );

    const resultId = insertResult.insertId;

    for (const answer of answers) {
      await connection.query(
        `INSERT INTO result_answers (result_id, question_id, selected_answer_id)
         VALUES (?, ?, ?)`,
        [resultId, answer.question_id, answer.selected_answer_id]
      );
    }

    await connection.commit();
    return res.status(201).json({
      message: 'Тест успішно завершено.',
      totalScore,
      resultLevel: result.level,
      recommendation: result.recommendation
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: 'Не вдалося зберегти результат тесту.' });
  } finally {
    connection.release();
  }
}

module.exports = {
  getTests,
  getTestQuestions,
  submitTest
};
