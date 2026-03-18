const testsList = document.getElementById('testsList');
const testSection = document.getElementById('testSection');
const testTitle = document.getElementById('testTitle');
const testDescription = document.getElementById('testDescription');
const testForm = document.getElementById('testForm');
const submitTestBtn = document.getElementById('submitTestBtn');
const resultSection = document.getElementById('resultSection');

const scoreValue = document.getElementById('scoreValue');
const levelValue = document.getElementById('levelValue');
const recommendationValue = document.getElementById('recommendationValue');

let currentTest = null;

async function loadTests() {
  const response = await fetch('/api/tests');
  const tests = await response.json();

  testsList.innerHTML = tests.map((test) => `
    <article class="card">
      <h3>${test.title}</h3>
      <p class="muted">${test.description}</p>
      <button class="btn small" onclick="startTest(${test.id})">Почати тест</button>
    </article>
  `).join('');
}

window.startTest = async function startTest(testId) {
  const response = await fetch(`/api/tests/${testId}/questions`);
  const data = await response.json();
  currentTest = data;

  testTitle.textContent = data.title;
  testDescription.textContent = data.description;

  testForm.innerHTML = data.questions.map((question, qIndex) => `
    <div class="card" style="margin-bottom:12px;">
      <p><strong>${qIndex + 1}. ${question.question_text}</strong></p>
      ${question.options.map((option) => `
        <label style="display:block; margin:8px 0;">
          <input type="radio" name="question_${question.id}" value="${option.id}" required />
          ${option.answer_text}
        </label>
      `).join('')}
    </div>
  `).join('');

  testSection.classList.remove('hidden');
  testSection.scrollIntoView({ behavior: 'smooth' });
};

submitTestBtn.addEventListener('click', async () => {
  if (!currentTest) return;

  const answers = currentTest.questions.map((question) => {
    const selected = document.querySelector(`input[name="question_${question.id}"]:checked`);
    return {
      question_id: question.id,
      selected_answer_id: selected ? Number(selected.value) : null
    };
  });

  if (answers.some((answer) => !answer.selected_answer_id)) {
    alert('Будь ласка, дайте відповідь на всі питання.');
    return;
  }

  const response = await fetch('/api/tests/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testId: currentTest.id, answers })
  });

  const result = await response.json();

  if (!response.ok) {
    alert(result.message || 'Сталася помилка при збереженні результату.');
    return;
  }

  scoreValue.textContent = result.totalScore;
  levelValue.textContent = result.resultLevel;
  recommendationValue.textContent = result.recommendation;
  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth' });
});

loadTests();
