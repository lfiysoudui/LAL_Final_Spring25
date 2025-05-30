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






const wordListEl = document.getElementById('word-list');
const inputEl = document.getElementById('input');

function loadWordList() {
  const data = localStorage.getItem('wordList');
  return data ? JSON.parse(data) : [];
}

function saveWordList(words) {
  localStorage.setItem('wordList', JSON.stringify(words));
}

function renderWordList() {
  wordListEl.innerHTML = '';
  const words = loadWordList();

  words.forEach(({ word, translation }, index) => {
    const entryContainer = document.createElement('div');
    entryContainer.className = 'word-entry-container';

    const entry = document.createElement('div');
    entry.className = 'word-entry';

    const wordSpan = document.createElement('span');
    wordSpan.className = 'editable';
    wordSpan.contentEditable = 'true';
    wordSpan.textContent = word;
    wordSpan.addEventListener('input', () => updateWord(index, wordSpan.textContent, translationSpan.textContent));

    const translationSpan = document.createElement('span');
    translationSpan.className = 'editable';
    translationSpan.contentEditable = 'true';
    translationSpan.textContent = translation;
    translationSpan.addEventListener('input', () => updateWord(index, wordSpan.textContent, translationSpan.textContent));

    const insertBtn = document.createElement('button');
    insertBtn.textContent = '➕';
    insertBtn.title = 'Insert word';
    insertBtn.onclick = () => {
      inputEl.value += (inputEl.value ? ' ' : '') + wordSpan.textContent;
      inputEl.focus();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '❌';
    deleteBtn.title = 'Delete word';
    deleteBtn.onclick = () => {
      words.splice(index, 1);
      saveWordList(words);
      renderWordList();
    };

    entry.appendChild(wordSpan);
    entry.appendChild(translationSpan);
    entry.appendChild(insertBtn);
    entry.appendChild(deleteBtn);

    entryContainer.appendChild(entry);

    wordListEl.appendChild(entryContainer);
  });
}

function updateWord(index, newWord, newTranslation) {
  const words = loadWordList();
  words[index] = { word: newWord, translation: newTranslation };
  saveWordList(words);
}

function addWord() {
  const word = document.getElementById('new-word').value.trim();
  const translation = document.getElementById('new-translation').value.trim();
  if (!word || !translation) return;

  const words = loadWordList();
  words.push({ word, translation });
  saveWordList(words);
  renderWordList();

  document.getElementById('new-word').value = '';
  document.getElementById('new-translation').value = '';
}

function clearWordList() {
  if (confirm('Are you sure you want to clear all saved words?')) {
    localStorage.removeItem('wordList');
    renderWordList();
  }
}

// Setup
document.addEventListener('DOMContentLoaded', () => {
  renderWordList();
  document.getElementById('clear-list-btn').onclick = clearWordList;
});
