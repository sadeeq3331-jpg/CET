// cet_assistant.js – Chinese-to-English Learning Assistant v1.0
(function() {
    const STORAGE_KEY = 'cet_assistant_conversations';
    const FLASHCARD_KEY = 'cet_assistant_flashcards';
    const STREAK_KEY = 'cet_assistant_streak';
    const LAST_ADD_KEY = 'cet_assistant_last_flashcard_add';
    const MAX_MESSAGE_LENGTH = 1000;
    const MAX_HISTORY_MESSAGES = 20;

    let conversations = [];
    let currentConvId = null;
    let isWaiting = false;
    let pinnedMessages = [];
    let currentSearch = '';
    let fontSize = 18;
    let panelDarkMode = false;
    let languageMode = 'chinese'; // 'chinese' or 'english'
    let sidebarOpen = false;
    let currentModelId = null;
    let flashcards = [];
    let streak = 0;
    let lastActiveDate = '';
    let lastFlashcardAdd = '';

    // ---------- CET Level Segments ----------
    const CET_SEGMENTS = {
        1: { label: 'CET-4', focus: 'Essential Vocabulary & Grammar', segments: ['🎧 Listening Practice', '📖 Reading Comprehension', '✍️ Basic Writing'], writing: true },
        2: { label: 'CET-6', focus: 'Advanced Vocabulary & Academic English', segments: ['🎧 Academic Listening', '📖 Advanced Reading', '✍️ Essay Writing'], writing: true },
        3: { label: 'Daily Conversation', focus: 'Practical Speaking & Listening', segments: ['🎧 Everyday Dialogues', '📖 Real-world Phrases', '💬 Speaking Practice'], writing: false }
    };

    function getCETSegments(level) {
        return CET_SEGMENTS[level] || CET_SEGMENTS[1];
    }

    // ---------- Theme Colors (Futuristic Blue/Teal) ----------
    const CET_THEMES = {
        accent: '#2dd4bf',
        accentHover: '#14b8a6',
        gradient: 'linear-gradient(145deg, #0f172a, #1e293b)',
        glow: 'rgba(45,212,191,0.3)',
        darkAccent: '#5eead4'
    };

    function getTheme() { return CET_THEMES; }

    function applyThemeToPanel() {
        const panel = document.querySelector('.cet-panel');
        if (!panel) return;
        const theme = getTheme();
        const isDark = document.body.classList.contains('dark') || panelDarkMode;
        const accent = isDark ? theme.darkAccent : theme.accent;
        const accentHover = isDark ? theme.accent : theme.accentHover;
        panel.style.setProperty('--cet-accent', accent);
        panel.style.setProperty('--cet-accent-hover', accentHover);
        panel.style.setProperty('--cet-gradient', theme.gradient);
        panel.style.setProperty('--cet-glow', theme.glow);
        const header = panel.querySelector('.cet-panel-header');
        if (header) header.style.background = theme.gradient;
        const sendBtn = panel.querySelector('#cet-send');
        if (sendBtn) sendBtn.style.background = accent;
        const quizBtn = panel.querySelector('#quiz-btn');
        if (quizBtn) quizBtn.style.background = accent;
        document.querySelectorAll('.cet-toast').forEach(el => el.style.background = accent);
        updateLevelBadge();
    }

    function updateLevelBadge() {
        const badge = document.getElementById('level-badge');
        if (!badge) return;
        const segments = getCETSegments(1);
        badge.textContent = segments.segments.join(' · ');
        badge.style.color = getTheme().accent;
    }

    // ---------- Language Mode Toggle ----------
    function getLanguageModePrompt() {
        if (languageMode === 'chinese') {
            return `You are an English tutor for Chinese students. Your main job is to help Chinese students learn English, especially for CET (College English Test) preparation.

IMPORTANT: Respond in CHINESE for all explanations, grammar points, corrections, and instructions. Chinese students should understand everything clearly.

Guidelines:
- Provide clear, accurate, and useful answers in Chinese.
- When explaining vocabulary, give the English word, its pronunciation (IPA or phonetic), and a detailed Chinese explanation.
- ALWAYS provide example sentences in ENGLISH, followed by a Chinese translation in parentheses.
- Example format: "I go to school every day. (我每天去学校。)"
- Focus on CET-4 and CET-6 vocabulary, common phrases, and daily conversation.
- Help students understand English grammar through Chinese explanations.
- Provide memory techniques: roots, prefixes, suffixes, associations.
- Keep a friendly, encouraging tone.

CRITICAL: All explanations MUST be in Chinese. Only example sentences and their Chinese translations should contain English.`;
        } else {
            return `You are an English tutor for Chinese students. Your main job is to help Chinese students learn English, especially for CET (College English Test) preparation.

IMPORTANT: Respond in ENGLISH for all explanations, grammar points, corrections, and instructions. Chinese students should improve their English comprehension through exposure.

Guidelines:
- Provide clear, accurate, and useful answers in English.
- When explaining vocabulary, give the English word, its pronunciation (IPA or phonetic), and a detailed English explanation.
- ALWAYS provide example sentences in ENGLISH, followed by a Chinese translation in parentheses.
- Example format: "I go to school every day. (我每天去学校。)"
- Focus on CET-4 and CET-6 vocabulary, common phrases, and daily conversation.
- Help students understand English grammar through English explanations with simple language.
- Provide memory techniques: roots, prefixes, suffixes, associations.
- Keep a friendly, encouraging tone.

CRITICAL: All explanations MUST be in English. Only example sentences and their Chinese translations should contain Chinese.`;
        }
    }

    // ---------- Text Formatting ----------
    function formatText(text) {
        if (!text) return text;
        let html = text;
        html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul class="bullet-list">$1</ul>');
        html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
        html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, function(match) {
            if (match.match(/<li>.*<\/li>/g) && match.match(/\d/)) return '<ol>' + match + '</ol>';
            return '<ul class="bullet-list">' + match + '</ul>';
        });
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    // ---------- Tips ----------
    const TIPS = [
        "Tip: 'Affect' is usually a verb (影响), 'Effect' is usually a noun (效果).",
        "Tip: Use 'a' before consonant sounds (a university), 'an' before vowel sounds (an hour).",
        "Tip: 'I look forward to' + noun/gerund, not infinitive: 'I look forward to seeing you.'",
        "Tip: 'Although' and 'but' cannot be used together in the same sentence.",
        "Tip: 'Since' can mean 'because' or 'from that time'. Context matters!",
        "Tip: 'Lay' means 'to put down' (放置) – it takes an object. 'Lie' means 'to recline' (躺) – it doesn't.",
        "Tip: 'Fewer' is for countable nouns (fewer apples), 'Less' is for uncountable (less water).",
        "Tip: 'The number of' takes a singular verb. 'A number of' takes a plural verb.",
        "Tip: 'Who' is for people, 'That' is for things or people, 'Which' is for things only.",
        "Tip: 'Its' is possessive (它的), 'It's' is a contraction of 'it is'.",
        "Tip: 'There', 'Their', 'They're' – learn the difference for CET writing.",
        "Tip: Use 'into' for movement toward the inside, 'in' for location.",
        "Tip: 'Between' is for two items, 'Among' is for three or more.",
        "Tip: 'Farther' is for physical distance, 'Further' is for metaphorical distance.",
        "Tip: 'Who' is for subjects, 'Whom' is for objects (rarely used in casual speech).",
        "Tip: 'Prevent' is followed by 'from' + gerund: 'Prevent me from going'.",
        "Tip: 'Suggest' is followed by a gerund, not infinitive: 'I suggest studying'.",
        "Tip: 'Enjoy' is always followed by a gerund: 'I enjoy swimming', not 'I enjoy to swim'.",
        "Tip: 'Used to' = past habit. 'Be used to' = accustomed to.",
        "Tip: 'Would rather' is followed by a bare infinitive: 'I would rather go'.",
        "Tip: 'Had better' is followed by a bare infinitive: 'You had better leave'.",
        "Tip: 'So...that' shows result, 'Such...that' shows degree.",
        "Tip: 'Too...to' means 'so...that not': 'too tired to continue'.",
        "Tip: 'Enough' comes before nouns but after adjectives: 'enough time' but 'big enough'.",
        "Tip: 'All' can be singular or plural depending on context: 'All is well' vs 'All are here'.",
        "Tip: 'Each' is always singular: 'Each student is responsible'.",
        "Tip: 'Neither' and 'Either' are singular: 'Neither is correct'.",
        "Tip: 'One of the' + plural noun + singular verb: 'One of the students is late'.",
        "Tip: 'By the time' requires perfect tense: 'By the time he arrived, she had left'.",
        "Tip: 'No sooner...than' is used with inversion: 'No sooner had I left than it rained'."
    ];

    function getDailyTip() {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        return TIPS[dayOfYear % TIPS.length];
    }

    // ---------- Streak & Flashcard ----------
    function updateStreak() {
        const today = new Date().toDateString();
        if (lastActiveDate !== today) {
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            if (lastActiveDate === yesterday.toDateString()) streak += 1;
            else streak = 1;
            lastActiveDate = today;
            localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, lastActiveDate }));
            checkStreakCelebration();
        }
    }

    function loadStreak() {
        try {
            const data = JSON.parse(localStorage.getItem(STREAK_KEY));
            if (data) {
                streak = data.streak || 0;
                lastActiveDate = data.lastActiveDate || '';
                const today = new Date().toDateString();
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                if (lastActiveDate !== today && lastActiveDate !== yesterday.toDateString()) streak = 0;
            }
        } catch(e) { streak = 0; }
    }

    function checkStreakCelebration() {
        if (streak >= 7) {
            const celebration = document.createElement('div');
            celebration.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                font-size: 4rem; animation: cetConfetti 2s ease-out forwards;
            `;
            celebration.innerHTML = '🎉🔥 Amazing! ' + streak + '-day streak! Keep it up! 🔥🎉';
            if (!document.getElementById('cet-confetti-style')) {
                const style = document.createElement('style');
                style.id = 'cet-confetti-style';
                style.textContent = `@keyframes cetConfetti { 0% { opacity:0; transform:scale(0.5) rotate(0deg); } 20% { opacity:1; transform:scale(1.2) rotate(5deg); } 100% { opacity:0; transform:scale(1.5) rotate(10deg) translateY(-80px); } }`;
                document.head.appendChild(style);
            }
            document.body.appendChild(celebration);
            setTimeout(() => celebration.remove(), 2500);
        }
    }

    function loadFlashcards() {
        try { flashcards = JSON.parse(localStorage.getItem(FLASHCARD_KEY)) || []; } catch(e) { flashcards = []; }
        lastFlashcardAdd = localStorage.getItem(LAST_ADD_KEY) || '';
    }
    function saveFlashcards() { localStorage.setItem(FLASHCARD_KEY, JSON.stringify(flashcards)); renderSidebar(); }
    function addFlashcard(word) {
        if (!word || word.trim().length === 0) return;
        const trimmed = word.trim();
        if (!flashcards.includes(trimmed)) {
            flashcards.push(trimmed);
            localStorage.setItem(LAST_ADD_KEY, new Date().toISOString());
            lastFlashcardAdd = localStorage.getItem(LAST_ADD_KEY);
            saveFlashcards();
            showToast('✅ Added "' + trimmed + '" to flashcards');
        } else showToast('"' + trimmed + '" already in flashcards');
    }
    function removeFlashcard(word) {
        flashcards = flashcards.filter(w => w !== word);
        saveFlashcards();
        renderSidebar();
    }
    function daysSinceLastFlashcard() {
        if (!lastFlashcardAdd) return Infinity;
        return (Date.now() - new Date(lastFlashcardAdd).getTime()) / (1000 * 60 * 60 * 24);
    }

    // ---------- Core Helpers ----------
    function extractPuterMessage(raw) {
        if (typeof raw === 'string') {
            try { return JSON.parse(raw).message?.content || raw; } catch { return raw; }
        }
        return raw?.message?.content || raw?.content || JSON.stringify(raw);
    }
    function truncateText(text, maxLen) {
        if (text.length <= maxLen) return text;
        return text.substring(0, maxLen) + '…';
    }
    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'cet-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    function loadConversations() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                conversations = JSON.parse(stored);
                conversations.forEach(c => { if (!c.id) c.id = Date.now() + Math.random(); if (!c.name) c.name = 'Chat'; if (!c.messages) c.messages = []; });
            } catch(e) { conversations = []; }
        }
        if (conversations.length === 0) {
            conversations.push({
                id: Date.now(),
                name: 'New Chat',
                messages: [{ role: 'assistant', content: '👋 Hi! I\'m your CET English tutor. Ask me about vocabulary, grammar, or anything about learning English!', timestamp: Date.now() }]
            });
        }
        if (!currentConvId) currentConvId = conversations[0].id;
        const storedPinned = localStorage.getItem('cet_pinned');
        if (storedPinned) pinnedMessages = JSON.parse(storedPinned);
    }
    function saveConversations() { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); }
    function getCurrentConv() { return conversations.find(c => c.id === currentConvId); }
    function addMessage(role, content) {
        const conv = getCurrentConv();
        if (!conv) return;
        conv.messages.push({ role, content, timestamp: Date.now() });
        saveConversations();
        renderMessages();
        renderSidebar();
        updateStats();
        if (role === 'user') { updateStreak(); renderSidebar(); }
    }
    function deleteMessage(index) {
        const conv = getCurrentConv();
        if (!conv) return;
        pinnedMessages = pinnedMessages.filter(p => p.convId !== currentConvId || p.idx !== index);
        conv.messages.splice(index, 1);
        saveConversations();
        savePinned();
        renderMessages();
        renderSidebar();
        updateStats();
    }
    function editUserMessage(index, newContent) {
        if (!newContent) return;
        const conv = getCurrentConv();
        if (!conv || conv.messages[index]?.role !== 'user') return;
        conv.messages[index].content = newContent;
        if (index + 1 < conv.messages.length && conv.messages[index+1].role === 'assistant') conv.messages.splice(index+1, 1);
        saveConversations();
        renderMessages();
        sendMessage(newContent, true);
    }
    function togglePinMessage(idx) {
        const conv = getCurrentConv();
        const msg = conv.messages[idx];
        if (!msg || msg.role !== 'assistant') return;
        const existingIdx = pinnedMessages.findIndex(p => p.convId === currentConvId && p.idx === idx);
        if (existingIdx !== -1) pinnedMessages.splice(existingIdx, 1);
        else pinnedMessages.push({ convId: currentConvId, idx, content: msg.content });
        savePinned();
        renderSidebar();
        renderMessages();
    }
    function savePinned() { localStorage.setItem('cet_pinned', JSON.stringify(pinnedMessages)); }
    function isPinned(idx) { return pinnedMessages.some(p => p.convId === currentConvId && p.idx === idx); }

    // ---------- Render Sidebar ----------
    function renderSidebar() {
        const sidebar = document.getElementById('cet-sidebar');
        if (!sidebar) return;
        let html = '<div class="sidebar-section"><div class="section-title">📋 Chats</div><div class="conv-list">';
        conversations.forEach(c => {
            const active = c.id === currentConvId ? 'active' : '';
            html += `<div class="conv-item ${active}" data-id="${c.id}" ondblclick="window.renameConversationPrompt(${c.id})">
                <span class="conv-name">${escapeHtml(c.name)}</span>
                <span class="conv-actions"><button class="icon-btn delete-conv" data-id="${c.id}" title="Delete">🗑️</button></span>
            </div>`;
        });
        html += `</div><button class="icon-btn new-chat-sidebar" id="new-chat-sidebar">➕ New Chat</button></div>`;

        html += '<div class="sidebar-section pinned-section-sidebar"><div class="section-title">📌 Saved Notes</div>';
        const pinnedForConv = pinnedMessages.filter(p => p.convId === currentConvId);
        if (pinnedForConv.length === 0) html += '<div class="muted">No saved notes</div>';
        else {
            pinnedForConv.forEach(p => {
                const snippet = truncateText(p.content, 60);
                html += `<div class="pinned-note-item" onclick="window.scrollToMessage(${p.idx})">📌 ${escapeHtml(snippet)}</div>`;
            });
        }
        html += '</div>';

        html += `<div class="sidebar-section flashcards-section"><div class="section-title">📇 Word Cards (${flashcards.length})</div>`;
        if (flashcards.length === 0) html += '<div class="muted">No word cards yet – click 📇 on messages to add</div>';
        else {
            flashcards.forEach(word => {
                html += `<div class="flashcard-item">
                    <span class="flashcard-word">${escapeHtml(word)}</span>
                    <button class="icon-btn flashcard-ask" data-word="${escapeHtml(word)}" title="Ask Tutor">💬</button>
                    <button class="icon-btn flashcard-remove" data-word="${escapeHtml(word)}" title="Remove">✕</button>
                </div>`;
            });
        }
        html += '</div>';

        html += '<div class="sidebar-section settings-section"><div class="section-title">⚙️ Settings</div>';
        html += `<div class="setting-row"><label>Tutor Mode</label><select id="sidebar-personality">
            <option value="general" ${personality === 'general' ? 'selected' : ''}>📘 General Tutor</option>
            <option value="grammar" ${personality === 'grammar' ? 'selected' : ''}>📝 Grammar Focus</option>
            <option value="vocab" ${personality === 'vocab' ? 'selected' : ''}>📚 Vocabulary Builder</option>
            <option value="conversation" ${personality === 'conversation' ? 'selected' : ''}>💬 Conversation Practice</option>
        </select></div>`;
        html += `<div class="setting-row"><span>Dark Mode</span><label class="toggle-switch"><input type="checkbox" id="sidebar-dark-toggle" ${panelDarkMode ? 'checked' : ''}><span class="slider"></span></label></div>`;
        html += `<div class="setting-row"><span>Font Size</span><div class="font-controls"><button id="font-minus">A-</button><button id="font-plus">A+</button></div></div>`;
        html += '</div>';

        sidebar.innerHTML = html;

        document.querySelectorAll('.conv-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                if (e.target.closest('.delete-conv')) return;
                const id = Number(this.dataset.id);
                if (id !== currentConvId) {
                    currentConvId = id;
                    saveConversations();
                    renderAll();
                    if (window.innerWidth < 768) toggleSidebar(false);
                }
            });
        });
        document.querySelectorAll('.delete-conv').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = Number(this.dataset.id);
                deleteConversation(id);
            });
        });
        document.getElementById('new-chat-sidebar')?.addEventListener('click', function(e) {
            e.stopPropagation();
            newConversation();
            if (window.innerWidth < 768) toggleSidebar(false);
        });
        document.getElementById('sidebar-personality')?.addEventListener('change', function(e) { personality = e.target.value; });
        document.getElementById('sidebar-dark-toggle')?.addEventListener('change', togglePanelDarkMode);
        document.getElementById('font-minus')?.addEventListener('click', function(e) { e.stopPropagation(); setFontSize(-2); });
        document.getElementById('font-plus')?.addEventListener('click', function(e) { e.stopPropagation(); setFontSize(2); });

        document.querySelectorAll('.flashcard-ask').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const word = this.dataset.word;
                if (word) {
                    document.getElementById('cet-input').value = 'Explain the usage of "' + word + '"';
                    sendMessage();
                }
            });
        });
        document.querySelectorAll('.flashcard-remove').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const word = this.dataset.word;
                if (word) removeFlashcard(word);
            });
        });
    }

    // ---------- Toggle Sidebar ----------
    function toggleSidebar(open) {
        const sidebar = document.getElementById('cet-sidebar');
        const overlay = document.getElementById('cet-sidebar-overlay');
        if (!sidebar) return;
        const isOpen = open !== undefined ? open : !sidebarOpen;
        sidebarOpen = isOpen;
        sidebar.style.transform = isOpen ? 'translateX(0)' : 'translateX(-100%)';
        if (overlay) overlay.style.display = isOpen ? 'block' : 'none';
    }

    // ---------- Render Functions ----------
    let renderScheduled = false;
    function renderAll() {
        if (renderScheduled) return;
        renderScheduled = true;
        requestAnimationFrame(() => {
            renderSidebar();
            renderMessages();
            updateStats();
            updateContextSuggestions();
            updateWordOfDay();
            updateBubbleReminders();
            const modeToggle = document.getElementById('mode-toggle');
            if (modeToggle) modeToggle.checked = (languageMode === 'english');
            applyThemeToPanel();
            updateLevelBadge();
            renderScheduled = false;
        });
    }

    function renderMessages() {
        const msgsDiv = document.getElementById('cet-messages');
        if (!msgsDiv) return;
        const conv = getCurrentConv();
        if (!conv) return;
        let filtered = conv.messages;
        if (currentSearch) filtered = conv.messages.filter(m => m.content.toLowerCase().includes(currentSearch));
        let html = '';
        filtered.forEach((msg, filteredIdx) => {
            const originalIdx = conv.messages.indexOf(msg);
            const isUser = msg.role === 'user';
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const avatar = isUser ? '👤' : '📘';
            const fullContent = msg.content;
            const isLong = fullContent.length > 400;
            const contentHtml = isLong ? truncateText(fullContent, 400) : formatText(fullContent);
            const pinned = isPinned(originalIdx);
            html += `<div class="message ${msg.role}" data-idx="${originalIdx}">
                <div class="avatar">${avatar}</div>
                <div class="bubble-wrapper">
                    <div class="message-bubble" style="font-size:${fontSize}px">
                        <div class="message-content ${isLong ? 'truncated' : ''}" id="msg-content-${originalIdx}">${contentHtml}</div>
                        ${isLong ? `<button class="read-more" data-idx="${originalIdx}">Read more</button>` : ''}
                    </div>
                    <div class="message-actions">
                        ${!isUser ? `<button class="icon-btn pin-btn" data-idx="${originalIdx}" title="${pinned ? 'Unpin' : 'Pin'}">${pinned ? '📌' : '📍'}</button>` : ''}
                        ${!isUser ? `<button class="icon-btn flashcard-add-btn" data-msgidx="${originalIdx}" title="Add to word cards">📇</button>` : ''}
                        <button class="icon-btn copy-btn" data-idx="${originalIdx}" title="Copy">📋</button>
                        ${isUser ? `<button class="icon-btn edit-btn" data-idx="${originalIdx}" title="Edit">✏️</button>` : `<button class="icon-btn quote-btn" data-idx="${originalIdx}" title="Quote reply">💬</button>`}
                        <button class="icon-btn delete-btn" data-idx="${originalIdx}" title="Delete">🗑️</button>
                    </div>
                    <div class="timestamp">${time}</div>
                </div>
            </div>`;
        });
        if (isWaiting) {
            html += `<div class="message assistant typing"><div class="avatar">📘</div><div class="bubble-wrapper"><div class="message-bubble typing-indicator"><span>.</span><span>.</span><span>.</span></div></div></div>`;
        }
        msgsDiv.innerHTML = html;

        msgsDiv.querySelectorAll('.read-more').forEach(btn => {
            btn.addEventListener('click', function(e) { e.stopPropagation(); const idx = parseInt(this.dataset.idx); window.toggleReadMore(idx); });
        });
        msgsDiv.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', function(e) { e.stopPropagation(); window.togglePinMessage(parseInt(this.dataset.idx)); });
        });
        msgsDiv.querySelectorAll('.flashcard-add-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.msgidx);
                const conv = getCurrentConv();
                if (!conv || !conv.messages[idx]) return;
                const msg = conv.messages[idx].content;
                const words = msg.match(/[A-Za-z]{3,}/g);
                const word = words && words.length > 0 ? prompt('Add word to cards (select or type):', words[0]) : prompt('Enter the word to add:');
                if (word && word.trim()) addFlashcard(word.trim());
            });
        });
        msgsDiv.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function(e) { e.stopPropagation(); window.copyMessageContent(parseInt(this.dataset.idx)); });
        });
        msgsDiv.querySelectorAll('.quote-btn').forEach(btn => {
            btn.addEventListener('click', function(e) { e.stopPropagation(); window.quoteMessage(parseInt(this.dataset.idx)); });
        });
        msgsDiv.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) { e.stopPropagation(); window.deleteMessage(parseInt(this.dataset.idx)); });
        });
        msgsDiv.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                const conv = getCurrentConv();
                if (!conv || !conv.messages[idx]) return;
                const newContent = prompt('Edit your message:', conv.messages[idx].content);
                if (newContent && newContent.trim()) window.editUserMessage(idx, newContent.trim());
            });
        });

        msgsDiv.scrollTop = msgsDiv.scrollHeight;
    }

    window.toggleReadMore = function(idx) {
        const conv = getCurrentConv();
        if (!conv || !conv.messages[idx]) return;
        const contentEl = document.getElementById('msg-content-' + idx);
        if (!contentEl) return;
        if (contentEl.classList.contains('truncated')) {
            contentEl.innerHTML = formatText(conv.messages[idx].content);
            contentEl.classList.remove('truncated');
        } else {
            contentEl.innerHTML = truncateText(conv.messages[idx].content, 400);
            contentEl.classList.add('truncated');
        }
    };

    function updateStats() {
        const conv = getCurrentConv();
        if (!conv) return;
        const msgCount = conv.messages.length;
        const wordCount = conv.messages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
        const statsEl = document.getElementById('cet-stats');
        if (statsEl) statsEl.innerText = msgCount + ' msgs · ~' + wordCount + ' words · 🔥 ' + streak + 'd streak';
    }

    function updateContextSuggestions() {
        const container = document.getElementById('suggestions');
        if (!container) return;
        const suggestions = [
            'What is the difference between "affect" and "effect"?',
            'How to use "although" in a sentence?',
            'Common CET-4 vocabulary list',
            'How to improve English speaking?',
            'Practice daily conversation: "How are you?"',
            'Explain "present perfect tense" with examples',
        ];
        container.innerHTML = suggestions.slice(0,5).map(s =>
            `<div class="suggestion-chip" data-question="${escapeHtml(s)}">📖 ${escapeHtml(s)}</div>`
        ).join('');
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', function(e) {
                e.stopPropagation();
                const q = this.getAttribute('data-question');
                if (q) {
                    document.getElementById('cet-input').value = q;
                    sendMessage(q);
                }
            });
        });
    }

    // ---------- Word of the Day ----------
    let wordOfDay = '', wordOfDayMeaning = '';
    function updateWordOfDay() {
        const wodEl = document.getElementById('word-of-day');
        if (!wodEl) return;
        const words = [
            { word: 'library', meaning: '图书馆' },
            { word: 'teacher', meaning: '老师' },
            { word: 'study', meaning: '学习' },
            { word: 'help', meaning: '帮助' },
            { word: 'friend', meaning: '朋友' },
            { word: 'hospital', meaning: '医院' },
            { word: 'school', meaning: '学校' },
            { word: 'eat', meaning: '吃' },
            { word: 'happy', meaning: '快乐' },
            { word: 'weather', meaning: '天气' },
        ];
        const idx = new Date().getDate() % words.length;
        const chosen = words[idx];
        wordOfDay = chosen.word;
        wordOfDayMeaning = chosen.meaning;
        wodEl.innerHTML = `📖 Word of the Day: <strong>${chosen.word}</strong> (${chosen.meaning}) <button class="wod-ask">❓</button>`;
        wodEl.querySelector('.wod-ask')?.addEventListener('click', function() {
            document.getElementById('cet-input').value = 'Explain the word "' + chosen.word + '" with examples';
            sendMessage();
        });
    }

    // ---------- Bubble Reminders ----------
    function updateBubbleReminders() {
        const bubble = document.querySelector('.cet-bubble');
        if (!bubble) return;
        const oldReminder = bubble.querySelector('.cet-reminder');
        if (oldReminder) oldReminder.remove();

        const reminder = document.createElement('div');
        reminder.className = 'cet-reminder';
        reminder.style.cssText = `
            position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%);
            background: rgba(10,41,66,0.95); color: #ffd966;
            padding: 3px 12px; border-radius: 30px; font-size: 0.6rem;
            font-weight: 600; white-space: nowrap; border: 1px solid #ffd966;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            cursor: pointer; pointer-events: auto;
            transition: background 0.2s;
            animation: cetPulse 2s infinite ease-in-out;
        `;
        reminder.addEventListener('mouseenter', function() { this.style.background = 'rgba(10,41,66,1)'; });
        reminder.addEventListener('mouseleave', function() { this.style.background = 'rgba(10,41,66,0.95)'; });

        if (!document.getElementById('cet-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'cet-pulse-style';
            style.textContent = `@keyframes cetPulse { 0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.05); } }`;
            document.head.appendChild(style);
        }

        const daysSince = daysSinceLastFlashcard();
        let reminderText, tipContent;
        if (daysSince > 3 && flashcards.length > 0) {
            reminderText = '📇 Add new words!';
            tipContent = '📇 Reminder: You haven\'t added any new flashcards in a while. Try adding a new word to your deck!';
        } else {
            const tip = getDailyTip();
            reminderText = '💡 ' + tip.substring(0, 30) + '…';
            tipContent = 'Daily tip: ' + tip;
        }
        reminder.textContent = reminderText;

        reminder.addEventListener('click', function(e) {
            e.stopPropagation();
            const panel = document.querySelector('.cet-panel');
            if (panel) {
                panel.style.display = 'flex';
                const input = document.getElementById('cet-input');
                if (input) { input.value = tipContent; setTimeout(() => input.focus(), 200); }
            }
        });

        bubble.appendChild(reminder);
    }

    // ---------- Language Mode Toggle Animation ----------
    function animateModeToggle() {
        const toggle = document.getElementById('mode-toggle');
        if (!toggle) return;
        toggle.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        toggle.style.boxShadow = '0 0 30px var(--cet-glow, rgba(45,212,191,0.6))';
        setTimeout(() => { toggle.style.boxShadow = 'none'; }, 500);
        const modeText = languageMode === 'english' ? 'English Mode' : '中文模式';
        showToast('📚 Switched to ' + modeText);
    }

    // ---------- Quick Quiz ----------
    function startQuickQuiz() {
        let quizText = '🎯 **Quick English Quiz**\n\n';

        const questions = [
            { q: 'What is the past tense of "go"?', options: ['A. goed', 'B. went', 'C. gone', 'D. going'], correct: 1 },
            { q: 'Choose the correct sentence:', options: ['A. I am agree.', 'B. I agree.', 'C. I am agreeing.', 'D. I agrees.'], correct: 1 },
            { q: 'What does "challenge" mean?', options: ['A. 挑战', 'B. 变化', 'C. 机会', 'D. 成功'], correct: 0 },
            { q: 'Fill in the blank: "She is ____ than her sister."', options: ['A. tall', 'B. taller', 'C. tallest', 'D. most tall'], correct: 1 },
            { q: 'What is the opposite of "expensive"?', options: ['A. cheap', 'B. costly', 'C. pricey', 'D. valuable'], correct: 0 },
        ];

        const shuffled = questions.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 5);

        selected.forEach((q, i) => {
            quizText += (i+1) + '. ' + q.q + '\n';
            q.options.forEach(opt => {
                quizText += '   ' + opt + '\n';
            });
            quizText += '   ✅ Answer: ' + q.options[q.correct] + '\n\n';
        });

        quizText += '💡 Keep practicing! Ask me for more quizzes.';

        addMessage('user', '🎯 Quick English Quiz');
        addMessage('assistant', quizText);
    }

    // ---------- Quote / Copy / Speech ----------
    function quoteMessage(idx) {
        const conv = getCurrentConv();
        if (!conv || !conv.messages[idx]) return;
        const msg = conv.messages[idx];
        const quoted = '> ' + msg.content.replace(/\n/g, '\n> ');
        const input = document.getElementById('cet-input');
        if (input) { input.value = input.value ? input.value + '\n' + quoted : quoted; input.focus(); }
    }
    function copyMessageContent(idx) {
        const conv = getCurrentConv();
        if (!conv) return;
        navigator.clipboard.writeText(conv.messages[idx].content).then(() => showToast('Copied!')).catch(() => showToast('Copy failed'));
    }

    function startPronunciationCheck() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showToast('Your browser does not support speech recognition');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('cet-input').value = 'Please evaluate my pronunciation: "' + transcript + '"';
            sendMessage();
        };
        recognition.onerror = function(e) { showToast('Speech error: ' + e.error); };
        recognition.start();
        showToast('🎤 Speak English...');
    }

    // ---------- Model Selection ----------
    async function getBestModel() {
        if (currentModelId) return currentModelId;
        try {
            const models = await puter.ai.listModels();
            const preferred = ['google/gemini-3.1-flash-lite', 'google/gemini-2.5-flash-lite-001', 'google/gemini-2.0-flash-lite-001', 'gpt-5.4-nano'];
            for (const preferredId of preferred) {
                if (models.some(m => m.id === preferredId)) { currentModelId = preferredId; return currentModelId; }
            }
            const geminiModel = models.find(m => m.id.toLowerCase().includes('gemini'));
            if (geminiModel) { currentModelId = geminiModel.id; return currentModelId; }
            if (models.length > 0) { currentModelId = models[0].id; return currentModelId; }
            throw new Error('No chat models available');
        } catch (err) {
            console.warn('Model listing failed, using safe default', err);
            currentModelId = 'google/gemini-3.1-flash-lite';
            return currentModelId;
        }
    }

    // ---------- Send Message ----------
    async function sendMessage(initialText, isRegenerate) {
        const input = document.getElementById('cet-input');
        const text = initialText || (input ? input.value.trim() : '');
        if (!text || isWaiting) return;

        let puterReady = false;
        for (let i = 0; i < 5; i++) {
            if (window.puter && window.puter.ai) { puterReady = true; break; }
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!puterReady) {
            addMessage('assistant', 'Tutor is not ready. Please refresh the page.');
            return;
        }
        if (input) input.value = '';
        if (!isRegenerate) addMessage('user', text);
        isWaiting = true;
        renderMessages();

        let personalityInstruction = '';
        if (personality === 'grammar') personalityInstruction = 'Focus on grammar analysis. Explain sentence structure, parts of speech, and common errors. Provide corrected versions and examples.';
        else if (personality === 'vocab') personalityInstruction = 'Focus on vocabulary building. Give synonyms, antonyms, collocations, word roots, and mnemonic tips. Offer example sentences in different contexts.';
        else if (personality === 'conversation') personalityInstruction = 'Focus on daily conversation. Provide practical dialogues, common phrases, and speaking tips. Help students sound natural in everyday situations.';
        else personalityInstruction = 'Act as a friendly English tutor. Explain vocabulary usage, correct mistakes, provide mnemonics, and give contextual examples. Encourage the student and make learning fun.';

        const systemPrompt = getLanguageModePrompt() + '\n\n' + personalityInstruction;

        const conv = getCurrentConv();
        if (!conv) { isWaiting = false; return; }

        const history = [];
        const messagesToInclude = conv.messages.slice(-MAX_HISTORY_MESSAGES);
        for (const msg of messagesToInclude) {
            if (isRegenerate && msg.role === 'assistant' && msg === conv.messages[conv.messages.length-1]) continue;
            history.push({ role: msg.role, content: msg.content });
        }

        const chatMessages = [{ role: 'system', content: systemPrompt }, ...history];

        try {
            const modelId = await getBestModel();
            const raw = await puter.ai.chat(chatMessages, { model: modelId });
            const clean = extractPuterMessage(raw);
            isWaiting = false;
            addMessage('assistant', clean);
        } catch (e) {
            isWaiting = false;
            addMessage('assistant', 'Tutor error: ' + e.message);
        }
    }

    // ---------- Conversation Management ----------
    function newConversation() {
        const id = Date.now();
        conversations.push({
            id: id,
            name: 'Chat ' + (conversations.length + 1),
            messages: [{ role: 'assistant', content: '👋 Hi! I\'m your CET English tutor. Ask me about vocabulary, grammar, or anything about learning English!', timestamp: Date.now() }]
        });
        currentConvId = id;
        saveConversations();
        renderAll();
    }

    function deleteConversation(id) {
        if (conversations.length <= 1) return;
        const idx = conversations.findIndex(c => c.id === id);
        if (idx === -1) return;
        conversations.splice(idx, 1);
        if (currentConvId === id) currentConvId = conversations[0].id;
        pinnedMessages = pinnedMessages.filter(p => p.convId !== id);
        saveConversations();
        savePinned();
        renderAll();
    }

    window.renameConversationPrompt = function(id) {
        const conv = conversations.find(c => c.id === id);
        if (!conv) return;
        const newName = prompt('Rename conversation:', conv.name);
        if (newName && newName.trim()) {
            conv.name = newName.trim();
            saveConversations();
            renderSidebar();
            const headerName = document.getElementById('current-conv-name');
            if (headerName && currentConvId === id) headerName.textContent = conv.name;
        }
    };

    function exportConversation() {
        const conv = getCurrentConv();
        if (!conv) return;
        let text = 'Conversation: ' + conv.name + '\nExported: ' + new Date().toLocaleString() + '\n\n';
        conv.messages.forEach(function(m) {
            const role = m.role === 'user' ? 'You' : 'Tutor';
            const time = new Date(m.timestamp).toLocaleTimeString();
            text += '[' + role + '] (' + time + '):\n' + m.content + '\n\n';
        });
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cet-tutor-' + conv.name.replace(/\s+/g, '_') + '.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    function shareConversation() {
        const conv = getCurrentConv();
        if (!conv) return;
        let text = 'CET Tutor Chat: ' + conv.name + '\n\n';
        conv.messages.forEach(function(m) {
            text += (m.role === 'user' ? 'You' : 'Tutor') + ': ' + m.content + '\n\n';
        });
        navigator.clipboard.writeText(text).then(function() { showToast('Copied!'); }).catch(function() { showToast('Copy failed'); });
    }

    function setFontSize(delta) {
        fontSize = Math.min(32, Math.max(14, fontSize + delta));
        document.querySelectorAll('.message-bubble').forEach(function(el) { el.style.fontSize = fontSize + 'px'; });
    }

    function togglePanelDarkMode() {
        panelDarkMode = !panelDarkMode;
        const panel = document.querySelector('.cet-panel');
        if (panel) {
            if (panelDarkMode) { panel.classList.add('dark'); document.body.classList.add('dark'); }
            else { panel.classList.remove('dark'); document.body.classList.remove('dark'); }
        }
        const toggleInput = document.getElementById('sidebar-dark-toggle');
        if (toggleInput) toggleInput.checked = panelDarkMode;
        applyThemeToPanel();
    }

    // ---------- Create Widget (Full UI) ----------
    function createWidget() {
        const container = document.createElement('div');
        container.id = 'cet-container';
        container.innerHTML = `
<style>
    #cet-container * { box-sizing: border-box; font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; }
    :root {
        --cet-primary: #2dd4bf; --bg-glass: rgba(255,255,255,0.7); --bg-sidebar: rgba(248,252,255,0.85);
        --border-light: rgba(0,0,0,0.08); --shadow-lg: 0 25px 60px rgba(0,0,0,0.15);
        --text-primary: #1a202c; --text-secondary: #4a5568; --text-muted: #718096;
        --radius: 16px;
    }
    .dark { --bg-glass: rgba(20,20,30,0.9); --bg-sidebar: rgba(15,15,25,0.95); --border-light: rgba(255,255,255,0.08);
        --text-primary: #e2e8f0; --text-secondary: #a0aec0; --text-muted: #718096; }
    .cet-bubble {
        position: fixed; bottom: 20px; left: 20px; width: 60px; height: 60px; border-radius: 50%;
        background: linear-gradient(145deg, #0f172a, #1e293b);
        color: white; display: flex; align-items: center; justify-content: center; cursor: pointer;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3), 0 0 40px rgba(45,212,191,0.15);
        z-index: 10000; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 2px solid #2dd4bf; touch-action: manipulation; padding: 0;
    }
    .cet-bubble svg { width: 38px; height: 38px; display: block; }
    .cet-bubble:hover { transform: scale(1.08) rotate(-5deg); box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 60px rgba(45,212,191,0.25); }
    .cet-bubble .tooltip {
        position: absolute; top: -34px; left: 50%; transform: translateX(-50%);
        background: rgba(10,41,66,0.95); color: white;
        padding: 4px 14px; border-radius: 30px; font-size: 0.7rem; opacity: 0;
        transition: opacity 0.3s; pointer-events: none; white-space: nowrap;
    }
    .cet-bubble:hover .tooltip { opacity: 1; }
    .cet-panel {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: var(--bg-glass); backdrop-filter: blur(20px);
        display: none; flex-direction: column; z-index: 10001;
        overflow: hidden; border: none;
        transition: background 0.3s;
    }
    .dark .cet-panel { background: rgba(15,15,25,0.95); }
    .cet-panel-header {
        background: linear-gradient(145deg, #0f172a, #1e293b);
        color: white; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0; min-height: 56px; transition: background 0.4s; gap: 8px; flex-wrap: wrap;
        border-bottom: 1px solid rgba(45,212,191,0.15);
    }
    .cet-panel-header h3 { margin:0; font-size:1rem; font-weight:700; display:flex; align-items:center; gap:8px; }
    .cet-panel-header h3 i { color: #2dd4bf; }
    .panel-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .panel-btn {
        background: rgba(255,255,255,0.08); border: none; color: white;
        width: 36px; height: 36px; border-radius: 30px; font-size: 0.85rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; min-width: 44px; min-height: 44px;
        border: 1px solid rgba(45,212,191,0.1);
    }
    .panel-btn:hover { background: rgba(45,212,191,0.2); transform: scale(1.05); }
    .cet-body { display: flex; flex: 1; overflow: hidden; position: relative; }
    .cet-sidebar {
        position: absolute; top: 0; left: 0; height: 100%;
        width: 280px; background: var(--bg-sidebar); backdrop-filter: blur(12px);
        border-right: 1px solid var(--border-light);
        display: flex; flex-direction: column;
        overflow-y: auto; z-index: 50;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        padding-bottom: 20px;
    }
    .dark .cet-sidebar { background: rgba(15,15,25,0.98); }
    @media (min-width: 769px) {
        .cet-sidebar { position: relative; transform: translateX(0) !important; width: 240px; flex-shrink: 0; }
        .cet-sidebar-overlay { display: none !important; }
    }
    .cet-sidebar-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.2); z-index: 40; display: none;
    }
    .sidebar-section { padding: 14px 12px; border-bottom: 1px solid var(--border-light); }
    .section-title { font-weight: 600; opacity: 0.6; margin-bottom: 10px; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); }
    .conv-list { display: flex; flex-direction: column; gap: 3px; }
    .conv-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer;
        transition: all 0.15s; font-size: 0.82rem;
        color: var(--text-primary); min-height: 40px;
    }
    .conv-item:hover { background: rgba(0,0,0,0.04); }
    .dark .conv-item:hover { background: rgba(255,255,255,0.04); }
    .conv-item.active { background: #2dd4bf; color: white; }
    .conv-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .conv-actions { display: none; gap: 4px; }
    .conv-item:hover .conv-actions { display: flex; }
    .new-chat-sidebar {
        background: transparent; border: 1.5px dashed #2dd4bf;
        border-radius: 30px; color: #2dd4bf;
        padding: 8px 12px; margin-top: 8px; width: 100%; cursor: pointer;
        font-weight: 600; transition: all 0.2s; font-size: 0.85rem;
    }
    .new-chat-sidebar:hover { background: #2dd4bf; color: white; }
    .flashcard-item { display: flex; align-items: center; gap: 4px; padding: 4px 0; font-size: 0.8rem; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
    .flashcard-item .flashcard-word { flex:1; cursor:pointer; font-weight:500; }
    .flashcard-item .flashcard-word:hover { color: #2dd4bf; }
    .flashcard-item button { background: none; border: none; cursor: pointer; font-size: 0.8rem; opacity: 0.5; padding: 4px 6px; }
    .flashcard-item button:hover { opacity: 1; }
    .pinned-note-item { padding: 4px 0; cursor: pointer; font-size: 0.75rem; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
    .pinned-note-item:hover { color: #2dd4bf; }
    .setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .setting-row label { font-size: 0.8rem; color: var(--text-secondary); }
    .setting-row select { background: var(--bg-glass); border: 1px solid var(--border-light); border-radius: 20px; padding: 4px 10px; font-size: 0.8rem; color: var(--text-primary); }
    .toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top:0; left:0; right:0; bottom:0; background: #ccc; border-radius: 20px; transition: 0.3s; }
    .slider:before { position: absolute; content:""; height: 16px; width: 16px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: 0.3s; }
    input:checked + .slider { background: #2dd4bf; }
    input:checked + .slider:before { transform: translateX(16px); }
    .font-controls { display: flex; gap: 4px; }
    .font-controls button { background: #2dd4bf; color: white; border: none; border-radius: 20px; padding: 3px 10px; cursor: pointer; font-weight:600; font-size:0.8rem; min-height:32px; }
    .cet-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
    .chat-header {
        padding: 8px 12px; display: flex; align-items: center; gap: 6px;
        border-bottom: 1px solid var(--border-light); flex-shrink: 0; flex-wrap: wrap;
        background: var(--bg-glass); color: var(--text-primary); min-height: 50px;
    }
    .chat-header .wod { font-size: 0.65rem; color: var(--text-secondary); flex-shrink:0; display: none; }
    @media (min-width: 600px) { .chat-header .wod { display: inline; } }
    .chat-header input {
        flex: 1; padding: 6px 12px; border-radius: 30px; border: 1px solid var(--border-light);
        background: rgba(255,255,255,0.5); min-width: 60px; font-size:0.8rem; outline:none; color: var(--text-primary);
        min-height: 36px;
    }
    .dark .chat-header input { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .chat-header .mode-toggle-container {
        display: flex; align-items: center; gap: 4px;
        flex-shrink: 0; background: var(--bg-glass);
        border: 1px solid var(--border-light); border-radius: 30px;
        padding: 2px 8px; font-size: 0.6rem; font-weight: 700;
        color: var(--text-secondary); min-height: 36px;
    }
    .chat-header .mode-toggle-container label { cursor: pointer; display: flex; align-items: center; }
    .mode-toggle-switch { position: relative; display: inline-block; width: 30px; height: 16px; flex-shrink: 0; }
    .mode-toggle-switch input { opacity: 0; width: 0; height: 0; }
    .mode-slider {
        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background: #ccc; transition: 0.3s; border-radius: 16px;
    }
    .mode-slider:before {
        position: absolute; content: ""; height: 12px; width: 12px;
        left: 2px; bottom: 2px; background: white; transition: 0.3s; border-radius: 50%;
    }
    input:checked + .mode-slider { background: #2dd4bf; }
    input:checked + .mode-slider:before { transform: translateX(14px); }
    .mode-label { font-size: 0.55rem; font-weight: 700; min-width: 18px; }
    .level-badge {
        font-size: 0.55rem; background: var(--bg-glass); border: 1px solid var(--border-light);
        border-radius: 30px; padding: 1px 8px; color: var(--text-secondary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 120px; flex-shrink: 1; min-height: 24px; display: flex; align-items: center;
    }
    @media (min-width: 600px) { .level-badge { max-width: 200px; font-size: 0.6rem; } }
    .cet-messages { flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .message { display: flex; gap: 10px; align-items: flex-start; }
    .message.user { flex-direction: row-reverse; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: #e6f0fa; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
    .user .avatar { background: #2dd4bf; color: white; }
    .bubble-wrapper { max-width: 85%; position: relative; }
    .message-bubble {
        padding: 8px 14px; border-radius: 16px;
        background: rgba(255,255,255,0.85); backdrop-filter: blur(4px);
        box-shadow: 0 2px 6px rgba(0,0,0,0.03); line-height: 1.6; word-wrap: break-word;
        color: var(--text-primary); font-size: 0.9rem;
    }
    .dark .message-bubble { background: rgba(50,50,70,0.9); color: #e2e8f0; }
    .user .message-bubble { background: #2dd4bf; color: white; }
    .message-actions {
        position: absolute; top: -10px; right: 6px; display: flex; gap: 2px;
        opacity: 0; transform: translateY(4px); transition: all 0.2s;
        background: rgba(255,255,255,0.9); border-radius: 16px; padding: 2px 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .dark .message-actions { background: rgba(40,40,60,0.9); }
    .message:hover .message-actions { opacity: 1; transform: translateY(0); }
    .icon-btn { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; font-size: 0.75rem; padding: 2px 4px; min-width: 28px; min-height: 28px; }
    .icon-btn:hover { opacity: 1; }
    .timestamp { font-size: 0.55rem; opacity: 0.4; margin-top: 2px; text-align: right; color: var(--text-muted); }
    .read-more { background: none; border: none; color: #2dd4bf; cursor: pointer; font-size: 0.75rem; margin-top: 4px; font-weight:500; }
    .typing .message-bubble { background: #e6f0fa; display: flex; gap: 4px; padding: 10px 14px; }
    .dark .typing .message-bubble { background: rgba(50,50,70,0.9); }
    .typing-indicator span { animation: blink 1.4s infinite; font-size: 1rem; }
    @keyframes blink { 0% { opacity:0.2; } 20% { opacity:1; } 100% { opacity:0.2; } }
    .input-area {
        padding: 8px 12px; border-top: 1px solid var(--border-light);
        display: flex; gap: 6px; align-items: flex-end;
        background: var(--bg-glass); backdrop-filter: blur(4px);
        flex-shrink: 0; flex-wrap: wrap;
    }
    .input-area textarea {
        flex: 1; padding: 8px 14px; border-radius: 30px;
        border: 1px solid var(--border-light); background: rgba(255,255,255,0.6);
        resize: none; font-size: 0.85rem; outline: none; max-height: 100px;
        transition: border-color 0.2s; min-height: 40px; color: var(--text-primary);
    }
    .dark .input-area textarea { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .input-area textarea::placeholder { color: var(--text-muted); }
    .input-area textarea:focus { border-color: #2dd4bf; }
    .input-area button {
        border: none; border-radius: 50%; width: 40px; height: 40px;
        display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08); flex-shrink: 0;
        transition: all 0.2s; min-width: 44px; min-height: 44px;
    }
    .input-area button:hover { transform: scale(1.05); }
    .send-btn { background: #2dd4bf; color: white; }
    .send-btn:hover { box-shadow: 0 6px 20px rgba(45,212,191,0.3); }
    .share-btn { background: #555; color: white; }
    .mic-btn { background: #4a9eff; color: white; }
    .quiz-btn { background: #2dd4bf; color: white; }
    .suggestions {
        display: flex; gap: 6px; padding: 4px 12px; overflow-x: auto;
        white-space: nowrap; flex-wrap: nowrap; border-top: 1px solid var(--border-light);
        background: var(--bg-glass); scrollbar-width: none; -ms-overflow-style: none;
        flex-shrink: 0; min-height: 32px;
    }
    .suggestions::-webkit-scrollbar { display: none; }
    .suggestion-chip {
        flex-shrink: 0; background: rgba(0,0,0,0.04); border-radius: 30px;
        padding: 3px 12px; font-size: 0.7rem; cursor: pointer; transition: all 0.2s;
        border: 1px solid transparent; color: var(--text-primary); min-height: 28px; display: flex; align-items: center;
    }
    .dark .suggestion-chip { background: rgba(255,255,255,0.04); }
    .suggestion-chip:hover { background: #2dd4bf; color: white; border-color: #2dd4bf; transform: scale(1.02); }
    .cet-stats { font-size: 0.55rem; opacity: 0.4; padding: 2px 12px 4px; text-align: right; color: var(--text-muted); flex-shrink: 0; }
    .cet-toast {
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: #2dd4bf; color: white; padding: 8px 20px; border-radius: 30px;
        z-index: 99999; box-shadow: 0 4px 16px rgba(0,0,0,0.2); animation: fadeInUp 0.3s;
        font-size: 0.85rem; max-width: 90vw; text-align: center;
    }
    @keyframes fadeInUp { from { opacity:0; transform:translate(-50%,20px); } to { opacity:1; transform:translate(-50%,0); } }
    @keyframes cetTooltipPop { 0% { opacity:0; transform:translateX(-50%) scale(0.8); } 100% { opacity:1; transform:translateX(-50%) scale(1); } }
    .muted { opacity: 0.5; font-size: 0.75rem; color: var(--text-muted); }
    .bullet-list, ol { margin: 4px 0 4px 20px; padding: 0; }
    .bullet-list li, ol li { margin-bottom: 2px; }
    h2, h3, h4 { margin: 6px 0 4px; color: var(--text-primary); }
    h2 { font-size: 1.2rem; }
    h3 { font-size: 1.05rem; }
    h4 { font-size: 0.95rem; }
    @media (max-width: 768px) {
        .cet-panel { border-radius: 0; }
        .cet-panel-header { padding: 8px 12px; }
        .cet-panel-header h3 { font-size: 0.9rem; }
        .chat-header { padding: 6px 10px; gap: 4px; }
        .chat-header .wod { display: none; }
        .chat-header input { font-size: 0.75rem; padding: 4px 10px; min-height: 32px; }
        .chat-header .mode-toggle-container { padding: 2px 6px; font-size: 0.55rem; min-height: 32px; }
        .mode-toggle-switch { width: 26px; height: 14px; }
        .mode-slider:before { height: 10px; width: 10px; left: 2px; bottom: 2px; }
        input:checked + .mode-slider:before { transform: translateX(12px); }
        .mode-label { font-size: 0.5rem; min-width: 12px; }
        .level-badge { font-size: 0.5rem; max-width: 80px; min-height: 20px; }
        .cet-messages { padding: 8px; }
        .message-bubble { font-size: 0.85rem; padding: 6px 12px; }
        .input-area button { width: 36px; height: 36px; font-size: 0.85rem; min-width: 40px; min-height: 40px; }
        .input-area textarea { font-size: 0.8rem; padding: 6px 12px; min-height: 36px; }
        .suggestion-chip { font-size: 0.65rem; padding: 2px 10px; min-height: 24px; }
        .cet-bubble { width: 54px; height: 54px; bottom: 16px; left: 16px; }
        .cet-bubble svg { width: 34px; height: 34px; }
        .cet-toast { font-size: 0.75rem; bottom: 70px; padding: 6px 16px; }
        .bullet-list, ol { margin-left: 16px; }
    }
    @media (max-width: 420px) {
        .chat-header .mode-toggle-container { font-size: 0.5rem; padding: 1px 4px; }
        .level-badge { max-width: 60px; font-size: 0.45rem; }
        .chat-header input { font-size: 0.7rem; min-width: 40px; }
        .cet-panel-header h3 { font-size: 0.8rem; }
        .panel-btn { min-width: 36px; min-height: 36px; font-size: 0.75rem; }
        .input-area button { min-width: 36px; min-height: 36px; width: 32px; height: 32px; font-size: 0.75rem; }
    }
</style>
<div class="cet-bubble">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
        <path d="M8 15h4" />
    </svg>
    <span class="tooltip">CET Tutor</span>
</div>
<div class="cet-panel">
    <div class="cet-panel-header">
        <h3><i class="fas fa-graduation-cap"></i> CET Tutor</h3>
        <div class="panel-actions">
            <button class="panel-btn" id="sidebar-toggle" title="Toggle sidebar">☰</button>
            <button class="panel-btn" id="export-chat" title="Export">📥</button>
            <button class="panel-btn" id="minimize-panel" title="Minimize">─</button>
            <button class="panel-btn" id="close-panel" title="Close">✕</button>
        </div>
    </div>
    <div class="cet-body">
        <div class="cet-sidebar-overlay" id="cet-sidebar-overlay"></div>
        <div class="cet-sidebar" id="cet-sidebar"></div>
        <div class="cet-main" id="cet-main">
            <div class="chat-header">
                <span id="current-conv-name" style="font-weight:600; flex-shrink:0; font-size:0.85rem;">New Chat</span>
                <div class="mode-toggle-container">
                    <span class="mode-label">中文</span>
                    <label class="mode-toggle-switch">
                        <input type="checkbox" id="mode-toggle">
                        <span class="mode-slider"></span>
                    </label>
                    <span class="mode-label">Eng</span>
                </div>
                <span class="level-badge" id="level-badge">🎧 Listening · 📖 Reading · ✍️ Writing</span>
                <span class="wod" id="word-of-day">📖 Word of the Day: --</span>
                <input type="text" id="cet-search" placeholder="🔍 Search...">
            </div>
            <div class="cet-messages" id="cet-messages"></div>
            <div class="suggestions" id="suggestions"></div>
            <div class="input-area">
                <button class="mic-btn" id="mic-btn" title="Voice input">🎙️</button>
                <textarea id="cet-input" placeholder="Type your English question..." rows="1" maxlength="1000"></textarea>
                <button class="share-btn" id="share-conv" title="Share chat">🔗</button>
                <button class="quiz-btn" id="quiz-btn" title="Quick Quiz">🎯</button>
                <button class="send-btn" id="cet-send">➤</button>
            </div>
            <div class="cet-stats" id="cet-stats"></div>
        </div>
    </div>
</div>`;

        document.body.appendChild(container);

        const panel = container.querySelector('.cet-panel');
        const bubble = container.querySelector('.cet-bubble');

        // Force bubble visibility
        if (bubble) {
            bubble.style.display = 'flex';
            bubble.style.zIndex = '999999';
            console.log('✅ CET Tutor bubble fixed');
        }

        bubble.addEventListener('click', function(e) {
            e.stopPropagation();
            if (panel.style.display === 'flex') {
                panel.style.display = 'none';
                if (window.innerWidth < 768) toggleSidebar(false);
            } else {
                panel.style.display = 'flex';
                if (window.innerWidth < 768) toggleSidebar(false);
            }
        });

        document.addEventListener('click', function(e) {
            if (panel.style.display === 'flex' &&
                !panel.contains(e.target) &&
                e.target !== bubble &&
                !e.target.closest('#cet-selection-popup')) {
                panel.style.display = 'none';
                if (window.innerWidth < 768) toggleSidebar(false);
            }
        });

        // Sidebar toggle
        const sidebarToggleBtn = document.getElementById('sidebar-toggle');
        const sidebarOverlay = document.getElementById('cet-sidebar-overlay');
        sidebarToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar(!sidebarOpen);
        });
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() { toggleSidebar(false); });
        }

        // Language mode toggle
        const modeToggle = document.getElementById('mode-toggle');
        modeToggle.addEventListener('change', function(e) {
            languageMode = this.checked ? 'english' : 'chinese';
            animateModeToggle();
            renderAll();
        });

        document.getElementById('minimize-panel').onclick = function() {
            panel.style.display = 'none';
            if (window.innerWidth < 768) toggleSidebar(false);
        };
        document.getElementById('close-panel').onclick = function() {
            panel.style.display = 'none';
            if (window.innerWidth < 768) toggleSidebar(false);
        };
        document.getElementById('export-chat').onclick = exportConversation;
        document.getElementById('share-conv').onclick = shareConversation;
        document.getElementById('cet-send').onclick = function() { sendMessage(); };
        document.getElementById('mic-btn').onclick = startPronunciationCheck;
        document.getElementById('quiz-btn').onclick = startQuickQuiz;

        const textarea = document.getElementById('cet-input');
        textarea.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(100, this.scrollHeight) + 'px';
        });

        document.getElementById('cet-search').addEventListener('input', function(e) {
            currentSearch = e.target.value.trim().toLowerCase();
            renderMessages();
        });

        // Drag (desktop only)
        let isDragging = false, dragOffsetX, dragOffsetY;
        const header = panel.querySelector('.cet-panel-header');
        header.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'BUTTON') return;
            if (window.innerWidth < 769) return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            panel.style.transition = 'none';
            panel.style.position = 'fixed';
            panel.style.top = '0';
            panel.style.left = '0';
            panel.style.transform = 'none';
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            panel.style.left = (e.clientX - dragOffsetX) + 'px';
            panel.style.top = (e.clientY - dragOffsetY) + 'px';
        });
        window.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = '';
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('cet-search').focus();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                newConversation();
            }
        });

        // Floating suggestion label
        const suggestionLabel = document.createElement('div');
        suggestionLabel.className = 'cet-suggestion';
        suggestionLabel.textContent = '💬 Ask CET Tutor';
        suggestionLabel.style.cssText = `
            position: fixed; bottom: 90px; left: 20px;
            background: rgba(10,41,66,0.92); color: white;
            padding: 6px 14px; border-radius: 30px; font-size: 0.8rem; font-weight: 600;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 9999;
            opacity: 0; transform: translateY(10px);
            transition: opacity 0.5s ease, transform 0.5s ease;
            pointer-events: none; white-space: nowrap;
            border: 1px solid #2dd4bf; backdrop-filter: blur(8px);
        `;
        document.body.appendChild(suggestionLabel);

        setTimeout(() => {
            suggestionLabel.style.opacity = '1';
            suggestionLabel.style.transform = 'translateY(0)';
        }, 4000);

        function hideSuggestion() {
            suggestionLabel.style.opacity = '0';
            suggestionLabel.style.transform = 'translateY(10px)';
        }
        bubble.addEventListener('click', hideSuggestion);
        panel.addEventListener('click', hideSuggestion);
        document.getElementById('cet-input').addEventListener('focus', hideSuggestion);
        document.getElementById('cet-send').addEventListener('click', hideSuggestion);

        setInterval(() => updateBubbleReminders(), 30000);

        applyThemeToPanel();
        updateLevelBadge();

        window.addEventListener('resize', function() {
            const isMobile = window.innerWidth < 768;
            if (!isMobile) {
                const sidebar = document.getElementById('cet-sidebar');
                if (sidebar) sidebar.style.transform = 'translateX(0)';
                if (sidebarOverlay) sidebarOverlay.style.display = 'none';
                sidebarOpen = true;
            } else {
                const sidebar = document.getElementById('cet-sidebar');
                if (sidebar && !sidebarOpen) sidebar.style.transform = 'translateX(-100%)';
            }
        });
    }

    // ---------- Init ----------
    function init() {
        loadStreak();
        loadFlashcards();
        loadConversations();
        createWidget();
        renderAll();
    }

    window.sendMessage = sendMessage;
    window.scrollToMessage = function(idx) {
        const el = document.querySelector('.message[data-idx="' + idx + '"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.togglePinMessage = togglePinMessage;
    window.editUserMessage = editUserMessage;
    window.deleteMessage = deleteMessage;
    window.copyMessageContent = copyMessageContent;
    window.quoteMessage = quoteMessage;
    window.addFlashcard = addFlashcard;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
