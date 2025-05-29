let conversation = [];

function appendMessage(role, content) {
  const chat = document.getElementById('chat');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg ' + (role === 'user' ? 'user' : 'gemini');
  msgDiv.innerHTML = `<b>${role === 'user' ? 'You' : 'Gemini'}:</b> ${content}`;
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
}

function send() {
  const input = document.getElementById('input');
  const msg = input.value.trim();
  if (!msg) return;
  appendMessage('user', msg);
  conversation.push({role: "user", content: msg});
  input.value = '';
  input.disabled = true;
  document.querySelector('button').disabled = true;

  fetch('/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({message: msg, conversation})
  })
  .then(res => res.json())
  .then(data => {
    conversation = data.conversation;
    appendMessage('gemini', data.reply);
  })
  .catch(() => {
    appendMessage('gemini', 'Sorry, something went wrong.');
  })
  .finally(() => {
    input.disabled = false;
    document.querySelector('button').disabled = false;
    input.focus();
  });
}

// --- Grading logic ---
function gradeAttempt() {
  const attempt = document.getElementById('attempt').value.trim();
  const goal = document.getElementById('goal-sentence').textContent.trim();
  if (!attempt) return;
  document.getElementById('grade-btn').disabled = true;
  document.getElementById('grade-result').textContent = "Grading...";

  fetch('/grade', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({attempt, goal})
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById('grade-result').textContent = `Score: ${data.score} / 10. ${data.feedback}`;
  })
  .catch(() => {
    document.getElementById('grade-result').textContent = "Sorry, grading failed.";
  })
  .finally(() => {
    document.getElementById('grade-btn').disabled = false;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') send();
  });
  document.querySelector('button').addEventListener('click', send);

  document.getElementById('attempt').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') gradeAttempt();
  });
  document.getElementById('grade-btn').addEventListener('click', gradeAttempt);
});