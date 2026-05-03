// assistant.js – Interactive vocabulary assistant (fixed + new features)
(function() {
  const WORD_BANK = window.CET4_WORDS || window.HSK3_WORDS || [];

  if (!WORD_BANK.length) return;

  // ========== DOM injection ==========
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
        <button class="buddy-tab" data-mode="wordoftheday">🌟 Daily Word</button>
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
      <div id="wotdPanel" class="wotd-panel" style="display:none;">
        <div class="wotd-meaning"></div>
        <div class="wotd-phonetic"></div>
        <div class="wotd-example"></div>
      </div>
    </div>
    <div class="buddy-avatar" id="buddyAvatar">
      <i class="fas fa-robot"></i>
    </div>
  `;
  document.body.appendChild(buddyContainer);

  // ========== Styles (fixed z-index & layout) ==========
  const style = document.createElement('style');
  style.textContent = `
    .buddy-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }
    .buddy-avatar {
      width: 60px;
      height: 60px;
      background: var(--accent, #0d9488);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 20px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s;
      color: white;
      font-size: 1.8rem;
      pointer-events: auto;
      border: 3px solid white;
    }
    .buddy-avatar:hover {
      transform: scale(1.1);
    }
    .buddy-bubble {
      position: absolute;
      bottom: 80px;
      right: 0;
      background: var(--bg-card, #fff);
      border-radius: 20px 20px 5px 20px;
      padding: 1rem;
      width: 310px;
      max-width: 85vw;
      box-shadow: 0 20px 35px rgba(0,0,0,0.3);
      border: 1px solid var(--accent, #0d9488);
      transition: opacity 0.2s, transform 0.2s;
      transform-origin: bottom right;
      pointer-events: auto;
      opacity: 1;
      transform: scale(1);
    }
    .buddy-bubble.hidden {
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
    }
    .buddy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--border-light, #a7f3d0);
      padding-bottom: 6px;
    }
    .buddy-header span {
      font-weight: 700;
      color: var(--text-primary, #064e3b);
    }
    .buddy-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #6b8a9e;
    }
    .buddy-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .buddy-tab {
      background: rgba(13,148,136,0.1);
      border: none;
      padding: 5px 10px;
      border-radius: 40px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.85rem;
      color: var(--text-primary, #064e3b);
    }
    .buddy-tab.active {
      background: var(--accent, #0d9488);
      color: white;
    }
    .buddy-word {
      font-size: 1.8rem;
      font-weight: 600;
      color: var(--text-primary, #064e3b);
      text-align: center;
      margin: 8px 0;
      word-break: break-word;
    }
    .buddy-controls {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 8px 0;
    }
    .buddy-controls button {
      background: rgba(13,148,136,0.1);
      border: none;
      padding: 6px 14px;
      border-radius: 40px;
      cursor: pointer;
      font-weight: 500;
      color: var(--text-primary, #064e3b);
    }
    .quiz-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 10px 0;
    }
    .quiz-opt {
      background: rgba(13,148,136,0.05);
      border: 1px solid var(--border-light, #a7f3d0);
      border-radius: 30px;
      padding: 8px 12px;
      cursor: pointer;
      text-align: center;
      color: var(--text-primary, #064e3b);
      transition: 0.1s;
    }
    .quiz-opt:hover {
      background: rgba(13,148,136,0.1);
    }
    .quiz-opt.correct {
      background: #c6f6d5;
      border-color: #38a169;
      color: #2d3748;
    }
    .quiz-opt.wrong {
      background: #fed7d7;
      border-color: #e53e3e;
      color: #2d3748;
    }
    .typing-area {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 10px 0;
    }
    .typing-input {
      padding: 10px;
      border-radius: 40px;
      border: 1px solid var(--border-light, #a7f3d0);
      width: 100%;
      background: var(--bg-card, #fff);
      color: var(--text-primary, #064e3b);
    }
    .typing-submit {
      background: var(--accent, #0d9488);
      color: white;
      border: none;
      padding: 8px;
      border-radius: 40px;
      cursor: pointer;
    }
    .typing-feedback {
      font-size: 0.85rem;
      text-align: center;
      min-height: 1.2rem;
    }
    .wotd-panel {
      margin-top: 10px;
      font-size: 0.9rem;
      color: var(--text-primary, #064e3b);
    }
    .wotd-panel div {
      margin-bottom: 6px;
    }
  `;
  document.head.appendChild(style);

  // ========== TTS ==========
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

  // ========== State ==========
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
  const wotdPanel = document.getElementById('wotdPanel');
  const tabs = document.querySelectorAll('.buddy-tab');

  // ========== Helper Functions ==========
  function getRandomWord() {
    return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  }

  function setWord(wordObj) {
    currentWord = wordObj;
    wordDisplay.textContent = wordObj ? wordObj.word : '?';
    if (currentMode === 'quiz') generateQuiz(wordObj);
    else if (currentMode === 'typing') resetTyping();
    else if (currentMode === 'wordoftheday') showWordOfTheDay(wordObj);
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
        // Automatically advance to next word after 2 seconds
        setTimeout(() => setWord(getRandomWord()), 2000);
      });
      quizPanel.appendChild(btn);
    });
  }

  function resetTyping() {
    typingInput.value = '';
    typingFeedback.textContent = '';
  }

  function showWordOfTheDay(wordObj) {
    if (!wordObj) return;
    wotdPanel.innerHTML = `
      <div><strong>Meaning:</strong> ${wordObj.meaning}</div>
      <div><strong>Phonetic:</strong> ${wordObj.phonetic || ''}</div>
      ${wordObj.example ? `<div><strong>Example:</strong> ${wordObj.example}</div>` : ''}
    `;
  }

  function switchMode(mode) {
    currentMode = mode;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    quizPanel.style.display = mode === 'quiz' ? 'flex' : 'none';
    typingPanel.style.display = mode === 'typing' ? 'flex' : 'none';
    wotdPanel.style.display = mode === 'wordoftheday' ? 'block' : 'none';
    if (currentWord) {
      if (mode === 'quiz') generateQuiz(currentWord);
      else if (mode === 'typing') resetTyping();
      else if (mode === 'wordoftheday') showWordOfTheDay(currentWord);
    }
  }

  // ========== Event Listeners ==========
  // Toggle bubble on avatar click
  avatar.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = bubble.classList.contains('hidden');
    if (isHidden) {
      bubble.classList.remove('hidden');
      if (!currentWord) setWord(getRandomWord());
    } else {
      bubble.classList.add('hidden');
    }
  });

  closeBtn.addEventListener('click', () => bubble.classList.add('hidden'));

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!buddyContainer.contains(e.target)) {
      bubble.classList.add('hidden');
    }
  });

  newWordBtn.addEventListener('click', () => setWord(getRandomWord()));
  speakWordBtn.addEventListener('click', () => { if (currentWord) speak(currentWord.word); });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  submitTyping.addEventListener('click', () => {
    if (!currentWord) return;
    const answer = typingInput.value.trim().toLowerCase();
    const correct = currentWord.meaning.toLowerCase();
    if (answer === correct) {
      typingFeedback.innerHTML = '<span style="color:#38a169;">✓ Correct!</span>';
      setTimeout(() => setWord(getRandomWord()), 1500);
    } else {
      typingFeedback.innerHTML = `<span style="color:#e53e3e;">✗ Wrong. Correct: ${currentWord.meaning}</span>`;
    }
  });

  typingInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') submitTyping.click();
  });

  // ========== Word of the Day (persisted) ==========
  const today = new Date().toDateString();
  const storedWotd = JSON.parse(localStorage.getItem('cet4_wotd') || '{}');
  let wotdWord = null;
  if (storedWotd.date === today && storedWotd.word) {
    wotdWord = WORD_BANK.find(w => w.word === storedWotd.word) || null;
  }
  if (!wotdWord) {
    wotdWord = getRandomWord();
    localStorage.setItem('cet4_wotd', JSON.stringify({ date: today, word: wotdWord.word }));
  }
  // Pre-load the word of the day
  if (!currentWord) {
    currentWord = wotdWord;
    wordDisplay.textContent = wotdWord.word;
  }
})();
