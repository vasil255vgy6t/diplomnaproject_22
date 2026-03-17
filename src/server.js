const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
