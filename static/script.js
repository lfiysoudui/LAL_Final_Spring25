let conversation = [];

function appendMessage(role, content) {
  const chat = document.getElementById('chat');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg ' + (role === 'user' ? 'user' : role === 'gemini' ? 'gemini' : 'translate');
  msgDiv.innerHTML = `<b>${role === 'user' ? 'user' : role === 'gemini' ? 'gemini' : 'translate'}:</b> ${content}`;
  if (role === 'translate') {
    msgDiv.style.display = 'none';
    document.getElementById('grade-btn').addEventListener('click', () => {
      const translateMessages = chat.querySelectorAll('.translate');
      translateMessages.forEach(msg => msg.style.display = 'block');
    });
  }
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
    appendMessage('translate', data.translated_reply);
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

function gradeAttempt() {
  const attempt = document.getElementById('attempt').value.trim();
  const goal = document.getElementById('goal-sentence').textContent.trim();
  if (!attempt) return;
  if (!window.confirm("Are you sure you want to submit this answer for grading?")) return;

  document.getElementById('grade-btn').disabled = true;
  document.getElementById('attempt').disabled = true;
  document.getElementById('grade-result').textContent = "Grading...";

  fetch('/grade', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({attempt, goal})
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById('grade-result').textContent = `Score: ${data.score} / 10. ${data.feedback}`;
    document.getElementById('replay-btn').style.display = 'inline-block';
    document.getElementById('grade-btn').style.display = 'none';
    // Disable chat input and send button
    document.getElementById('input').disabled = true;
    document.querySelector('#input-row button').disabled = true;
  })
  .catch(() => {
    document.getElementById('grade-result').textContent = "Sorry, grading failed.";
    document.getElementById('grade-btn').disabled = false;
    document.getElementById('attempt').disabled = false;
  });
}

document.getElementById('replay-btn').onclick = () => {
  window.location.href = '/select_language';
};

function showReplayButton() {
  let replay = document.getElementById('replay-btn');
  if (!replay) {
    replay = document.createElement('button');
    replay.id = 'replay-btn';
    replay.textContent = 'Replay';
    replay.style.marginTop = '16px';
    replay.onclick = () => window.location.reload();
    document.getElementById('grade-container').appendChild(replay);
  }
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