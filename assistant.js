// assistant.js – Floating quiz/typing buddy for CET & HSK pages
(function() {
  // Configuration
  const WORD_BANK = window.CET4_WORDS || window.HSK3_WORDS || []; // fallback

  if (!WORD_BANK.length) return; // nothing to do

  // DOM injection
  const buddyContainer = document.createElement('div');
  buddyContainer.className = 'buddy-container';
  buddyContainer.innerHTML = `
    <div class="buddy-bubble hidden" id="buddyBubble">
      <div class="buddy-header">
        <span><i class="fas fa-robot"></i> Assistant</span>
        <button class="buddy-close" id="closeBuddy"><i class="fas fa-times"></i></button>
      </div>
      <div class="buddy-tabs">
        <button class="buddy-tab active" data-mode="quiz">📝 Quiz</button>
        <button class="buddy-tab" data-mode="typing">⌨️ Typing</button>
      </div>
      <div id="buddyWordDisplay" class="buddy-word">?</div>
      <div class="buddy-controls">
        <button id="speakBuddyWord"><i class="fas fa-volume-up"></i> Speak</button>
        <button id="newBuddyWord"><i class="fas fa-random"></i> Random</button>
      </div>
      <div id="quizPanel" class="quiz-options"></div>
      <div id="typingPanel" class="typing-area" style="display:none;">
        <input type="text" id="typingInput" class="typing-input" placeholder="Type English meaning...">
        <button id="submitTyping" class="typing-submit">Submit</button>
        <div id="typingFeedbackMsg" class="typing-feedback"></div>
      </div>
    </div>
    <div class="buddy-avatar" id="buddyAvatar">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%230d9488'/%3E%3Ccircle cx='35' cy='40' r='5' fill='white'/%3E%3Ccircle cx='65' cy='40' r='5' fill='white'/%3E%3Cpath d='M35 65 Q50 80 65 65' stroke='white' stroke-width='4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" alt="buddy">
    </div>
  `;
  document.body.appendChild(buddyContainer);

  // Styles (injected)
  const style = document.createElement('style');
  style.textContent = `
    .buddy-container { position:fixed; bottom:20px; right:20px; z-index:1000; display:flex; flex-direction:column; align-items:flex-end; }
    .buddy-bubble { position:absolute; bottom:70px; right:0; background:var(--bg-card,#fff); border-radius:24px 24px 12px 24px; padding:1rem; width:300px; max-width:85vw; box-shadow:0 20px 35px rgba(0,0,0,0.25); border:1px solid var(--accent,#0d9488); transition:0.2s; transform-origin:bottom right; visibility:visible; opacity:1; }
    .buddy-bubble.hidden { visibility:hidden; opacity:0; pointer-events:none; }
    .buddy-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid var(--border-light,#a7f3d0); padding-bottom:6px; }
    .buddy-close { background:none; border:none; font-size:1.2rem; cursor:pointer; color:#6b8a9e; }
    .buddy-tabs { display:flex; gap:8px; margin-bottom:12px; }
    .buddy-tab { background:rgba(13,148,136,0.1); border:none; padding:6px 12px; border-radius:40px; cursor:pointer; font-weight:500; flex:1; text-align:center; color:var(--text-primary,#064e3b); }
    .buddy-tab.active { background:var(--accent,#0d9488); color:white; }
    .buddy-word { font-size:1.8rem; font-weight:600; color:var(--text-primary,#064e3b); text-align:center; margin:8px 0; word-break:break-word; }
    .buddy-controls { display:flex; justify-content:center; gap:12px; margin:8px 0; }
    .buddy-controls button { background:rgba(13,148,136,0.1); border:none; padding:8px 16px; border-radius:40px; cursor:pointer; font-weight:500; color:var(--text-primary,#064e3b); }
    .quiz-options { display:flex; flex-direction:column; gap:8px; margin:10px 0; }
    .quiz-opt { background:rgba(13,148,136,0.05); border:1px solid var(--border-light,#a7f3d0); border-radius:30px; padding:8px 12px; cursor:pointer; text-align:center; color:var(--text-primary,#064e3b); }
    .quiz-opt.correct { background:#c6f6d5; border-color:#38a169; color:#2d3748; }
    .quiz-opt.wrong { background:#fed7d7; border-color:#e53e3e; color:#2d3748; }
    .typing-area { display:flex; flex-direction:column; gap:8px; margin:10px 0; }
    .typing-input { padding:10px; border-radius:40px; border:1px solid var(--border-light,#a7f3d0); width:100%; background:var(--bg-card,#fff); color:var(--text-primary,#064e3b); }
    .typing-submit { background:var(--accent,#0d9488); color:white; border:none; padding:8px; border-radius:40px; cursor:pointer; }
    .typing-feedback { font-size:0.85rem; text-align:center; }
    .buddy-avatar { width:60px; height:60px; background:var(--bg-card,#fff); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 20px rgba(0,0,0,0.2); border:2px solid var(--accent,#0d9488); cursor:pointer; transition:transform 0.1s; }
    .buddy-avatar img { width:50px; height:50px; border-radius:50%; }
  `;
  document.head.appendChild(style);

  // Speak function
  function speak(text) {
    if (!text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch(e) {}
  }

  let currentMode = 'quiz';
  let currentWord = null;

  const bubble = document.getElementById('buddyBubble');
  const avatar = document.getElementById('buddyAvatar');
  const wordDisplay = document.getElementById('buddyWordDisplay');
  const closeBtn = document.getElementById('closeBuddy');
  const newWordBtn = document.getElementById('newBuddyWord');
  const speakWordBtn = document.getElementById('speakBuddyWord');
  const quizPanel = document.getElementById('quizPanel');
  const typingPanel = document.getElementById('typingPanel');
  const typingInput = document.getElementById('typingInput');
  const submitTyping = document.getElementById('submitTyping');
  const typingFeedback = document.getElementById('typingFeedbackMsg');
  const tabs = document.querySelectorAll('.buddy-tab');

  function getRandomWord() {
    return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  }

  function setWord(wordObj) {
    currentWord = wordObj;
    wordDisplay.textContent = wordObj ? wordObj.word : '?';
    if (currentMode === 'quiz') generateQuiz(wordObj);
    else resetTyping();
  }

  function generateQuiz(wordObj) {
    if (!wordObj) return;
    const correct = wordObj.meaning;
    let options = [correct];
    while (options.length < 4) {
      const rand = getRandomWord();
      if (!options.includes(rand.meaning) && rand.meaning !== correct) options.push(rand.meaning);
    }
    options = options.sort(() => Math.random() - 0.5);
    quizPanel.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('div');
      btn.className = 'quiz-opt';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quiz-opt').forEach(el => el.style.pointerEvents = 'none');
        if (opt === correct) {
          btn.classList.add('correct');
        } else {
          btn.classList.add('wrong');
          document.querySelectorAll('.quiz-opt').forEach(el => {
            if (el.textContent === correct) el.classList.add('correct');
          });
        }
      });
      quizPanel.appendChild(btn);
    });
  }

  function resetTyping() {
    typingInput.value = '';
    typingFeedback.textContent = '';
  }

  function switchMode(mode) {
    currentMode = mode;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    if (mode === 'quiz') {
      quizPanel.style.display = 'flex';
      typingPanel.style.display = 'none';
      if (currentWord) generateQuiz(currentWord);
    } else {
      quizPanel.style.display = 'none';
      typingPanel.style.display = 'flex';
      resetTyping();
    }
  }

  function toggleBubble(show) {
    bubble.classList.toggle('hidden', !show);
  }

  avatar.addEventListener('click', () => {
    const isHidden = bubble.classList.contains('hidden');
    toggleBubble(!isHidden);
    if (!isHidden && !currentWord) {
      setWord(getRandomWord());
    }
  });

  closeBtn.addEventListener('click', () => toggleBubble(false));

  newWordBtn.addEventListener('click', () => {
    setWord(getRandomWord());
  });

  speakWordBtn.addEventListener('click', () => {
    if (currentWord) speak(currentWord.word);
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  submitTyping.addEventListener('click', () => {
    if (!currentWord) return;
    const answer = typingInput.value.trim().toLowerCase();
    const correct = currentWord.meaning.toLowerCase();
    if (answer === correct) {
      typingFeedback.innerHTML = '<span style="color:#38a169;">✓ Correct!</span>';
    } else {
      typingFeedback.innerHTML = `<span style="color:#e53e3e;">✗ Wrong. Correct: ${currentWord.meaning}</span>`;
    }
  });

  typingInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') submitTyping.click();
  });
})();
