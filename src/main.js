let questions = [];

let state = {
  qIdx: 0,
  sentences: [],
  sentIdx: 0,
  isAuto: true,
  isReading: false,
  isBuzzed: false,
  isDone: false,
  cps: 50,
  timerDuration: 10,
  readInterval: null,
  timerInterval: null,
  timeRemaining: 10,
  history: []
};

const $ = id => document.getElementById(id);

const els = {
  autoBtn: $('autoBtn'),
  manualBtn: $('manualBtn'),
  buzzSection: document.querySelector('.buzz-section'),
  buzzBtn: $('buzzBtn'),
  buzzHint: document.querySelector('.buzz-hint'),
  revealBtn: $('revealBtn'),
  nextSentenceBtn: $('nextSentenceBtn'),
  resetBtn: $('resetBtn'),
  nextQuestion: $('nextQuestion'),
  questionDisplay: $('questionDisplay'),
  sentenceCounter: $('sentenceCounter'),
  sentenceProgress: $('sentenceProgress'),
  statusDot: $('statusDot'),
  statusLabel: $('statusLabel'),
  answerCard: $('answerCard'),
  answerText: $('answerText'),
  timerDisplay: $('timerDisplay'),
  timerBar: $('timerBar'),
  timerNumber: $('timerNumber'),
  speedSlider: $('speedSlider'),
  speedValue: $('speedValue'),
  timerSlider: $('timerSlider'),
  timerValue: $('timerValue'),
  sizeSlider: $('sizeSlider'),
  sizeValue: $('sizeValue'),
  historySection: $('historySection'),
  historyList: $('historyList'),
  historyCount: $('historyCount'),
  themeToggle: $('themeToggle'),
  cogBtn: $('cogBtn'),
  settingsOverlay: $('settingsOverlay'),
  qYear: $('qYear'),
  qTournament: $('qTournament'),
  qLevel: $('qLevel'),
  qCategory: $('qCategory'),
  modalOverlay: $('modalOverlay'),
  modalInput: $('modalInput'),
  modalResult: $('modalResult'),
  modalSubmit: $('modalSubmit'),
  modalCancel: $('modalCancel'),
  modalLabel: $('modalLabel'),
  modalTimer: $('modalTimer'),
  modalTimerNumber: $('modalTimerNumber'),
  modalTimerBar: $('modalTimerBar'),
  inlineAnswer: $('inlineAnswer'),
  inlineInput: $('inlineInput'),
  inlineResult: $('inlineResult'),
  inlineSubmit: $('inlineSubmit'),
  inlineCancel: $('inlineCancel'),
  buzzTimerNumber: $('buzzTimerNumber'),
  buzzTimerBar: $('buzzTimerBar')
};

function parseSentences(t) {
  return (t.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [t]).map(s => s.trim()).filter(Boolean);
}

function setStatus(cls, txt) {
  els.statusDot.className = 'status-dot ' + (cls || '');
  els.statusLabel.textContent = txt;
}

function updateCounter() {
  els.sentenceCounter.textContent = state.sentences.length ? `${Math.min(state.sentIdx, state.sentences.length)} / ${state.sentences.length}` : '';
}

function buildPips() {
  els.sentenceProgress.innerHTML = '';
  state.sentences.forEach(() => {
    const d = document.createElement('div');
    d.className = 'sentence-pip';
    els.sentenceProgress.appendChild(d);
  });
}

function updatePips() {
  els.sentenceProgress.querySelectorAll('.sentence-pip').forEach((p, i) => {
    p.className = 'sentence-pip' + (i < state.sentIdx ? ' done' : i === state.sentIdx ? ' current' : '');
  });
}

function initQuestion() {
  stopReading();
  stopTimer();
  const q = questions[state.qIdx];
  state.sentences = parseSentences(q.clue);
  state.sentIdx = 0;
  state.isBuzzed = false;
  state.isDone = false;
  els.questionDisplay.innerHTML = '';
  els.answerCard.classList.remove('visible');
  els.timerDisplay.classList.remove('visible');
  closeInlineAnswer();
  if (state.isAuto) {
    els.revealBtn.classList.add('hidden');
    els.buzzBtn.disabled = false;
    if (els.buzzSection) els.buzzSection.style.display = 'flex';
    if (els.buzzBtn) els.buzzBtn.style.display = '';
    if (els.buzzHint) {
      els.buzzHint.innerHTML = '<kbd>Space</kbd> to buzz &nbsp;·&nbsp; <kbd>J</kbd> for next question (Solo)';
    }
  } else {
    els.revealBtn.classList.remove('hidden');
    els.buzzBtn.disabled = true;
    if (els.buzzSection) els.buzzSection.style.display = 'flex';
    if (els.buzzBtn) els.buzzBtn.style.display = 'none';
    if (els.buzzHint) {
      els.buzzHint.innerHTML = '<kbd>Space</kbd> to reveal answer &nbsp;·&nbsp; <kbd>J</kbd> for next sentence (Classroom)';
    }
  }
  els.qYear.textContent = q.year || '—';
  els.qTournament.textContent = q.tournament || '—';
  els.qLevel.textContent = q.level || 'HS';
  els.qCategory.textContent = q.category || '—';
  buildPips();
  updateCounter();
  setStatus('', 'Ready');
  if (state.isAuto) {
    els.nextSentenceBtn.classList.add('hidden');
    setTimeout(startReading, 400);
  } else {
    els.nextSentenceBtn.classList.remove('hidden');
    setStatus('', 'Ready — Classroom');
  }
}

function startReading() {
  if (state.isReading || state.isBuzzed || state.sentIdx >= state.sentences.length) return;
  state.isReading = true;
  setStatus('reading', 'Reading…');
  const cur = els.questionDisplay.querySelector('.cursor-blink');
  if (cur) cur.remove();
  const sentence = state.sentences[state.sentIdx];
  const full = (state.sentIdx > 0 ? ' ' : '') + sentence;
  let i = 0;
  const span = document.createElement('span');
  const cursor = document.createElement('span');
  cursor.className = 'cursor-blink';
  els.questionDisplay.appendChild(span);
  els.questionDisplay.appendChild(cursor);
  state.readInterval = setInterval(() => {
    if (i < full.length) {
      span.textContent += full[i];
      i++;
    } else {
      stopReading();
      cursor.remove();
      state.sentIdx++;
      updateCounter();
      updatePips();
      if (state.sentIdx < state.sentences.length) {
        if (state.isAuto && !state.isBuzzed) setTimeout(startReading, 500);
        else if (!state.isAuto) setStatus('', 'Waiting');
      } else {
        state.isDone = true;
        setStatus('done', 'Complete');
        if (state.isAuto) startTimer();
      }
    }
  }, 1000 / state.cps);
}

function stopReading() {
  state.isReading = false;
  clearInterval(state.readInterval);
}

function handleBuzz() {
  if (state.isBuzzed) return;
  state.isBuzzed = true;
  stopReading();
  stopTimer();
  const cur = els.questionDisplay.querySelector('.cursor-blink');
  if (cur) cur.remove();
  setStatus('buzzed', 'Buzzed!');
  els.buzzBtn.disabled = true;
  openInlineAnswer();
  startBuzzTimer();
}

function openInlineAnswer() {
  els.inlineInput.value = '';
  els.inlineResult.className = 'inline-result';
  els.inlineResult.innerHTML = '';
  els.inlineSubmit.classList.remove('hidden');
  els.inlineCancel.textContent = 'Cancel';
  els.buzzTimerNumber.textContent = '5';
  els.buzzTimerNumber.className = 'timer-number';
  els.buzzTimerBar.style.width = '100%';
  els.buzzTimerBar.className = 'timer-bar';
  els.inlineAnswer.classList.remove('hidden');
  setTimeout(() => els.inlineInput.focus(), 50);
}

function closeInlineAnswer() {
  els.inlineAnswer.classList.add('hidden');
}

function startBuzzTimer() {
  const duration = 5;
  state.timeRemaining = duration;
  state.timerInterval = setInterval(() => {
    state.timeRemaining -= 0.1;
    const pct = Math.max(0, (state.timeRemaining / duration) * 100);
    els.buzzTimerBar.style.width = pct + '%';
    els.buzzTimerNumber.textContent = Math.ceil(state.timeRemaining);
    if (state.timeRemaining <= 2) {
      els.buzzTimerBar.className = 'timer-bar urgent';
      els.buzzTimerNumber.className = 'timer-number urgent';
    }
    if (state.timeRemaining <= 0) {
      stopTimer();
      closeInlineAnswer();
      showAnswer();
    }
  }, 100);
}

function openModal(showTimer = false) {
  els.modalInput.value = '';
  els.modalResult.className = 'modal-result';
  els.modalResult.innerHTML = '';
  els.modalSubmit.classList.remove('hidden');
  els.modalCancel.textContent = 'Cancel';
  els.modalLabel.textContent = state.isAuto ? 'Your Answer' : 'Player Answer';
  els.modalTimer.classList.toggle('hidden', !showTimer);
  els.modalTimerNumber.textContent = '5';
  els.modalTimerNumber.className = 'modal-timer-number';
  els.modalTimerBar.style.width = '100%';
  els.modalTimerBar.className = 'modal-timer-bar';
  els.modalOverlay.classList.add('open');
  setTimeout(() => els.modalInput.focus(), 50);
}

function closeModal() {
  els.modalOverlay.classList.remove('open');
}

function checkAnswer(userInput, actualAnswer) {
  if (typeof fuzzball === 'undefined') {
    console.error("Fuzzball library is not loaded! Falling back to exact match.");
    return userInput.toLowerCase() === actualAnswer.toLowerCase();
  }
  const cleanStr = (str) => String(str).toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  const stopWords = ['the', 'a', 'an', 'of', 'and', 'in', 'to'];
  const removeStopWords = (str) => str.split(/\s+/).filter(word => !stopWords.includes(word)).join(' ');
  const finalInput = removeStopWords(cleanStr(userInput));
  const finalActual = removeStopWords(cleanStr(actualAnswer));
  const score = fuzzball.token_set_ratio(finalInput, finalActual);
  return score >= 75;
}

function submitAnswer() {
  const ans = els.inlineInput.value.trim();
  if (!ans) return;
  stopTimer();
  const actual = questions[state.qIdx].answer;
  const correct = checkAnswer(ans, actual);
  els.inlineResult.className = 'inline-result visible ' + (correct ? 'correct' : 'incorrect');
  els.inlineResult.innerHTML = correct ? '✓ Correct!' : `✗ Incorrect. The answer was <strong>${actual}</strong>.`;
  els.inlineSubmit.classList.add('hidden');
  els.inlineCancel.textContent = 'Continue';
  els._inlineDismissAction = () => {
    closeInlineAnswer();
    showAnswer();
  };
}

function showAnswer() {
  const q = questions[state.qIdx];
  els.answerText.textContent = q.answer;
  els.answerCard.classList.add('visible');
  stopReading();
  els.questionDisplay.innerHTML = '';
  const s = document.createElement('span');
  s.textContent = q.clue;
  els.questionDisplay.appendChild(s);
  state.sentIdx = state.sentences.length;
  state.isDone = true;
  updateCounter();
  updatePips();
  stopTimer();
  els.timerDisplay.classList.remove('visible');
  els.revealBtn.classList.add('hidden');
  setStatus('done', 'Revealed');
}

function startTimer() {
  state.timeRemaining = state.timerDuration;
  els.timerDisplay.classList.add('visible');
  els.timerNumber.textContent = state.timerDuration;
  els.timerNumber.className = 'timer-number';
  els.timerBar.style.width = '100%';
  els.timerBar.className = 'timer-bar';
  state.timerInterval = setInterval(() => {
    state.timeRemaining -= 0.1;
    els.timerBar.style.width = Math.max(0, (state.timeRemaining / state.timerDuration) * 100) + '%';
    els.timerNumber.textContent = Math.ceil(state.timeRemaining);
    if (state.timeRemaining <= 3) {
      els.timerBar.className = 'timer-bar urgent';
      els.timerNumber.className = 'timer-number urgent';
    }
    if (state.timeRemaining <= 0) {
      stopTimer();
      showAnswer();
    }
  }, 100);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function addToHistory(idx) {
  state.history.unshift({ q: questions[idx] });
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    els.historySection.style.display = 'none';
    return;
  }
  els.historySection.style.display = 'block';
  els.historyCount.textContent = state.history.length;
  els.historyList.innerHTML = '';
  state.history.forEach((entry, i) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-item-header">
        <span class="history-item-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="history-item-answer">${entry.q.answer}</span>
        <span class="history-item-meta">${entry.q.category || '—'}</span>
        <svg class="history-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="history-item-body">
        <div class="h-answer-label">Answer: ${entry.q.answer}</div>${entry.q.clue}
      </div>`;
    item.querySelector('.history-item-header').addEventListener('click', () => item.classList.toggle('open'));
    els.historyList.appendChild(item);
  });
}

// ── Settings ──────────────────────────────────────────────

let settingsOpen = false;
els.cogBtn.addEventListener('click', () => {
  settingsOpen = !settingsOpen;
  els.settingsOverlay.classList.toggle('open', settingsOpen);
  els.cogBtn.classList.toggle('open', settingsOpen);
});

els.settingsOverlay.addEventListener('click', e => {
  if (e.target === els.settingsOverlay) {
    settingsOpen = false;
    els.settingsOverlay.classList.remove('open');
    els.cogBtn.classList.remove('open');
  }
});

els.speedSlider.addEventListener('input', e => {
  state.cps = parseInt(e.target.value);
  els.speedValue.textContent = state.cps + ' cps';
});

els.timerSlider.addEventListener('input', e => {
  state.timerDuration = parseInt(e.target.value);
  els.timerValue.textContent = state.timerDuration + ' s';
});

els.sizeSlider.addEventListener('input', () => {
  const pct = els.sizeSlider.value;
  els.sizeValue.textContent = pct + '%';
  document.documentElement.style.setProperty('--text-scale', pct / 100);
});

els.themeToggle.addEventListener('change', () => {
  document.documentElement.setAttribute('data-theme', els.themeToggle.checked ? 'dark' : 'light');
});

// ── Mode buttons ──────────────────────────────────────────

els.autoBtn.addEventListener('click', () => {
  state.isAuto = true;
  els.autoBtn.classList.add('active');
  els.manualBtn.classList.remove('active');
  els.nextSentenceBtn.classList.add('hidden');
  els.revealBtn.classList.add('hidden');
  els.buzzBtn.disabled = false;
  if (els.buzzSection) els.buzzSection.style.display = 'flex';
  if (els.buzzBtn) els.buzzBtn.style.display = '';
  if (els.buzzHint) els.buzzHint.innerHTML = '<kbd>Space</kbd> to buzz &nbsp;·&nbsp; <kbd>J</kbd> for next question (Solo)';
  initQuestion();
});

els.manualBtn.addEventListener('click', () => {
  state.isAuto = false;
  els.manualBtn.classList.add('active');
  els.autoBtn.classList.remove('active');
  els.nextSentenceBtn.classList.remove('hidden');
  els.revealBtn.classList.remove('hidden');
  els.buzzBtn.disabled = true;
  if (els.buzzSection) els.buzzSection.style.display = 'flex';
  if (els.buzzBtn) els.buzzBtn.style.display = 'none';
  if (els.buzzHint) els.buzzHint.innerHTML = '<kbd>Space</kbd> to reveal answer &nbsp;·&nbsp; <kbd>J</kbd> for next sentence (Classroom)';
  stopTimer();
  els.timerDisplay.classList.remove('visible');
  initQuestion();
});

// ── Buttons & keyboard ────────────────────────────────────

els.buzzBtn.addEventListener('click', handleBuzz);
els.revealBtn.addEventListener('click', showAnswer);
els.resetBtn.addEventListener('click', initQuestion);
els.inlineSubmit.addEventListener('click', submitAnswer);

els.inlineCancel.addEventListener('click', () => {
  if (els._inlineDismissAction) {
    els._inlineDismissAction();
    els._inlineDismissAction = null;
  } else {
    stopTimer();
    closeInlineAnswer();
    state.isBuzzed = false;
    els.buzzBtn.disabled = false;
    setStatus('', 'Buzz Cancelled');
  }
});

els.inlineInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (!els.inlineSubmit.classList.contains('hidden')) submitAnswer();
    else if (els._inlineDismissAction) {
      els._inlineDismissAction();
      els._inlineDismissAction = null;
    }
  }
});

els.nextSentenceBtn.addEventListener('click', () => {
  if (!state.isReading && !state.isBuzzed && !state.isDone) startReading();
});

els.nextQuestion.addEventListener('click', () => {
  addToHistory(state.qIdx);
  state.qIdx = (state.qIdx + 1) % questions.length;
  initQuestion();
});

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.isAuto) {
      if (!state.isBuzzed) handleBuzz();
    } else {
      showAnswer();
    }
  }
  if (e.code === 'KeyJ') {
    e.preventDefault();
    if (state.isAuto) els.nextQuestion.click();
    else els.nextSentenceBtn.click();
  }
});

// ── Boot: load questions then start ───────────────────────

fetch('initialQuestions.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    questions = data;
    initQuestion();
  })
  .catch(err => {
    console.error('Failed to load initialQuestions.json:', err);
    els.questionDisplay.innerHTML =
      `<span style="color:var(--red);font-family:'DM Sans',sans-serif;font-size:1rem;">
        ⚠ Could not load questions. Make sure <code>initialQuestions.json</code> is in the same folder as <code>index.html</code>.
      </span>`;
    setStatus('', 'Error');
  });