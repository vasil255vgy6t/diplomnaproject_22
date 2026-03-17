const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function login(req, res) {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ message: 'Вкажіть логін/пошту та пароль.' });
  }

  try {
    const [admins] = await pool.query(
      'SELECT id, username, email, password_hash FROM admins WHERE username = ? OR email = ? LIMIT 1',
      [login, login]
    );

    if (!admins.length) {
      return res.status(401).json({ message: 'Невірні облікові дані.' });
    }

    const admin = admins[0];
    const passwordOk = await bcrypt.compare(password, admin.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ message: 'Невірні облікові дані.' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, email: admin.email },
      process.env.JWT_SECRET || 'dev_secret_key',
      { expiresIn: '8h' }
    );

    return res.json({ token, admin: { id: admin.id, username: admin.username, email: admin.email } });
  } catch (error) {
    return res.status(500).json({ message: 'Помилка авторизації.' });
  }
}

async function getDashboardStats(req, res) {
  try {
    const [[testsCount]] = await pool.query('SELECT COUNT(*) AS value FROM tests');
    const [[resultsCount]] = await pool.query('SELECT COUNT(*) AS value FROM test_results');
    const [[avgScore]] = await pool.query('SELECT ROUND(AVG(total_score), 2) AS value FROM test_results');

    const [levelStats] = await pool.query(
      `SELECT result_level, COUNT(*) AS count
       FROM test_results
       GROUP BY result_level
       ORDER BY count DESC`
    );

    const [dailyStats] = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM test_results
       GROUP BY DATE(created_at)
       ORDER BY day DESC
       LIMIT 14`
    );

    return res.json({
      summary: {
        tests: testsCount.value,
        results: resultsCount.value,
        averageScore: avgScore.value || 0
      },
      levelStats,
      dailyStats: dailyStats.reverse()
    });
  } catch (error) {
    return res.status(500).json({ message: 'Помилка завантаження статистики.' });
  }
}

async function getResults(req, res) {
  const { from, to, testId, level } = req.query;

  const conditions = [];
  const params = [];

  if (from) {
    conditions.push('tr.created_at >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('tr.created_at <= ?');
    params.push(`${to} 23:59:59`);
  }
  if (testId) {
    conditions.push('tr.test_id = ?');
    params.push(testId);
  }
  if (level) {
    conditions.push('tr.result_level = ?');
    params.push(level);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(
      `SELECT tr.id, tr.test_id, t.title AS test_title, tr.total_score, tr.result_level, tr.recommendation, tr.created_at
       FROM test_results tr
       JOIN tests t ON t.id = tr.test_id
       ${whereClause}
       ORDER BY tr.created_at DESC`,
      params
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Помилка завантаження результатів.' });
  }
}

async function createTest(req, res) {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'Назва і опис тесту обов’язкові.' });
  }

  try {
    const [result] = await pool.query('INSERT INTO tests (title, description) VALUES (?, ?)', [title, description]);
    return res.status(201).json({ id: result.insertId, title, description });
  } catch (error) {
    return res.status(500).json({ message: 'Не вдалося створити тест.' });
  }
}

async function updateTest(req, res) {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    await pool.query('UPDATE tests SET title = ?, description = ? WHERE id = ?', [title, description, id]);
    return res.json({ message: 'Тест оновлено.' });
  } catch (error) {
    return res.status(500).json({ message: 'Не вдалося оновити тест.' });
  }
}

async function deleteTest(req, res) {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM tests WHERE id = ?', [id]);
    return res.json({ message: 'Тест видалено.' });
  } catch (error) {
    return res.status(500).json({ message: 'Не вдалося видалити тест.' });
  }
}

async function createQuestion(req, res) {
  const { test_id, question_text, question_type, options } = req.body;

  if (!test_id || !question_text || !Array.isArray(options) || !options.length) {
    return res.status(400).json({ message: 'Неповні дані для створення питання.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [qRes] = await conn.query(
      'INSERT INTO questions (test_id, question_text, question_type) VALUES (?, ?, ?)',
      [test_id, question_text, question_type || 'single']
    );

    const questionId = qRes.insertId;
    for (const option of options) {
      await conn.query(
        'INSERT INTO answers_options (question_id, answer_text, score) VALUES (?, ?, ?)',
        [questionId, option.answer_text, option.score]
      );
    }

    await conn.commit();
    return res.status(201).json({ message: 'Питання створено.' });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: 'Не вдалося створити питання.' });
  } finally {
    conn.release();
  }
}


async function updateQuestion(req, res) {
  const { id } = req.params;
  const { question_text, question_type } = req.body;

  try {
    await pool.query('UPDATE questions SET question_text = ?, question_type = ? WHERE id = ?', [
      question_text,
      question_type || 'single',
      id
    ]);
    return res.json({ message: 'Питання оновлено.' });
  } catch (error) {
    return res.status(500).json({ message: 'Не вдалося оновити питання.' });
  }
}

async function deleteQuestion(req, res) {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM questions WHERE id = ?', [id]);
    return res.json({ message: 'Питання видалено.' });
  } catch (error) {
    return res.status(500).json({ message: 'Не вдалося видалити питання.' });
  }
}

async function getAdmins(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, username, email, created_at FROM admins ORDER BY created_at DESC');
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Помилка завантаження адміністраторів.' });
  }
}

async function createAdmin(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Заповніть всі поля.' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO admins (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, password_hash]
    );

    return res.status(201).json({ id: result.insertId, username, email });
  } catch (error) {
    return res.status(500).json({ message: 'Не вдалося створити адміністратора.' });
  }
}

async function deleteAdmin(req, res) {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM admins WHERE id = ?', [id]);
    return res.json({ message: 'Адміністратора видалено.' });
  } catch (error) {
    return res.status(500).json({ message: 'Не вдалося видалити адміністратора.' });
  }
}

module.exports = {
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
};
