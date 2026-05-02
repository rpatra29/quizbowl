// CLASSROOM MODE FLOW (teacher-driven, sentence by sentence):
// 1. Teacher presses Reset → first sentence starts reading (slow character reveal)
// 2. Sentence finishes → Teacher manually starts timer (for kids to write answer on whiteboard)
// 3. Teacher can stop timer anytime by clicking Stop button
// 4. Teacher manually presses "Next Sentence" (J key) to reveal sentence 2
// 5. Teacher manually starts timer again
// 6. Repeat until all sentences shown
// TIMER IS PURELY MANUAL AND INDEPENDENT - it does not auto-start or affect game state.

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
  timerDuration: 20,
  readInterval: null,
  timerInterval: null,
  timeRemaining: 20,
  history: [],
  tables: [],         // { name, score, correct, wrong, awardedThisQ }
  awardedThisQ: false,
  noneAwardedThisQ: false
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
  timerStartBtn: $('timerStartBtn'),
  timerStopBtn: $('timerStopBtn'),
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
  questionLabel: $('questionLabel'),
  pointsHint: $('pointsHint'),
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
  buzzTimerBar: $('buzzTimerBar'),
  tablesSection: $('tablesSection'),
  tablesGrid: $('tablesGrid'),
  tablesCount: $('tablesCount'),
  tablesAddRow: $('tablesAddRow'),
  tableNameInput: $('tableNameInput'),
  addTableBtn: $('addTableBtn'),
  tablesAward: $('tablesAward'),
  awardPoints: $('awardPoints'),
  awardNobody: $('awardNobody')
};

function parseSentences(t) {
  return (t.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [t]).map(s => s.trim()).filter(Boolean);
}

function setStatus(cls, txt) {
  els.statusDot.className = 'status-dot ' + (cls || '');
  els.statusLabel.textContent = txt;
}

function updateCounter() {
  if (state.sentences.length) {
    els.sentenceCounter.textContent = `${Math.min(state.sentIdx, state.sentences.length)} / ${state.sentences.length}`;
    els.pointsHint.textContent = getPointsForSentence() + ' pts';
    els.pointsHint.style.display = '';
  } else {
    els.sentenceCounter.textContent = '';
    els.pointsHint.style.display = 'none';
  }
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
    if (i < state.sentIdx) {
      if (!p.classList.contains('done')) p.className = 'sentence-pip done';
    } else {
      p.className = 'sentence-pip' + (i === state.sentIdx ? ' current' : '');
    }
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
  state.awardedThisQ = false;
  state.noneAwardedThisQ = false;
  state._awardedIdx = -1;
  state._awardedPts = 0;
  state.tables.forEach(t => { t.awardedThisQ = false; });
  els.questionDisplay.innerHTML = '';
  els.answerCard.classList.remove('visible');
  closeInlineAnswer();
  if (!state.isAuto) renderTables();
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
  els.questionLabel.textContent = q.label || '';
  els.questionLabel.style.display = q.label ? '' : 'none';
  const lbl = (q.label || '').toLowerCase();
  const promptText =
    lbl.includes('historical event') || lbl.includes('event') ? ' What is the historical event?' :
    lbl.includes('person')    ? ' Who is this person?' :
    lbl.includes('place')     ? ' What is this place?' :
    lbl.includes('condition') ? ' What is this condition?' :
                                ' What is the answer?';
  const promptSpan = document.createElement('span');
  promptSpan.className = 'inline-prompt';
  promptSpan.textContent = promptText;
  els.questionDisplay.appendChild(promptSpan);
  const hasMeta = q.year || q.tournament || q.category;
  const metaEl = document.querySelector('.question-meta');
  if (metaEl) metaEl.style.display = hasMeta ? '' : 'none';
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
  const prompt = els.questionDisplay.querySelector('.inline-prompt');
  if (prompt) prompt.style.visibility = 'hidden';
  els.questionDisplay.insertBefore(span, prompt);
  els.questionDisplay.insertBefore(cursor, prompt);
  state.readInterval = setInterval(() => {
    if (i < full.length) {
      span.textContent += full[i];
      i++;
    } else {
      stopReading();
      cursor.remove();
      if (prompt) prompt.style.visibility = '';
      state.sentIdx++;
      updateCounter();
      updatePips();
      if (!state.isAuto) renderTables();
      if (state.sentIdx < state.sentences.length) {
        if (state.isAuto && !state.isBuzzed) setTimeout(startReading, 500);
        else if (!state.isAuto) setStatus('', 'Waiting');
      } else {
        state.isDone = true;
        setStatus('done', 'Complete');
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
  els.revealBtn.classList.add('hidden');
  setStatus('done', 'Revealed');
  if (!state.isAuto) renderTables();
}

function startTimer() {
  state.timeRemaining = state.timerDuration;
  els.timerDisplay.classList.add('running');
  els.timerNumber.textContent = state.timerDuration;
  els.timerNumber.className = 'timer-number';
  els.timerBar.style.width = '100%';
  els.timerBar.className = 'timer-bar';
  state.timerInterval = setInterval(() => {
    state.timeRemaining -= 0.1;
    els.timerBar.style.width = Math.max(0, (state.timeRemaining / state.timerDuration) * 100) + '%';
    els.timerNumber.textContent = Math.ceil(state.timeRemaining);
    if (state.timeRemaining <= 5) {
      els.timerBar.className = 'timer-bar urgent';
      els.timerNumber.className = 'timer-number urgent';
    }
    if (state.timeRemaining <= 0) {
      stopTimer();
    }
  }, 100);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  els.timerDisplay.classList.remove('running');
  els.timerNumber.textContent = state.timerDuration;
  els.timerNumber.className = 'timer-number';
  els.timerBar.style.width = '100%';
  els.timerBar.className = 'timer-bar';
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

// ── Classroom Tables ─────────────────────────────────────

function getPointsForSentence() {
  // N sentences: 500 before any reveal, drops 100 each sentence, min 100
  const n = state.sentences.length || 1;
  return Math.max(100, (n - state.sentIdx) * 100);
}

function addTable(name) {
  if (state.tables.length >= 12) return;
  name = name.trim();
  if (!name) return;
  state.tables.push({ name, score: 0, correct: 0, wrong: 0, awardedThisQ: false });
  renderTables();
  els.tableNameInput.value = '';
}

function removeTable(idx) {
  state.tables.splice(idx, 1);
  renderTables();
}

function renderTables() {
  els.tablesCount.textContent = state.tables.length + ' / 12';
  els.tablesAddRow.style.display = state.tables.length >= 12 ? 'none' : 'flex';

  els.tablesGrid.innerHTML = '';
  const pts = getPointsForSentence();
  const scoringActive = !state.isAuto && state.tables.length > 0 && state.sentIdx > 0 && !state.noneAwardedThisQ;

  state.tables.forEach((t, i) => {
    const tableCanAward = scoringActive && !t.awardedThisQ;
    const card = document.createElement('div');
    card.className = 'table-card' + (tableCanAward ? ' clickable' : '');
    if (t.awardedThisQ) card.classList.add('awarded');

    card.innerHTML = `
      <button class="table-card-remove" title="Remove table">&times;</button>
      <div class="table-card-top">
        <span class="table-card-name">${t.name}</span>
        <span class="table-card-score">${t.score}</span>
      </div>
      <div class="table-card-stats">${t.correct}W ${t.wrong}L</div>`;
    card.querySelector('.table-card-remove').addEventListener('click', e => {
      e.stopPropagation();
      removeTable(i);
    });
    if (tableCanAward) {
      card.addEventListener('click', () => awardTable(i, pts));
    }
    els.tablesGrid.appendChild(card);
  });

  updateAwardInfo();
}

function updateAwardInfo() {
  if (!state.tables.length || state.isAuto) {
    els.tablesAward.classList.add('hidden');
    return;
  }
  const pts = getPointsForSentence();
  if (state.noneAwardedThisQ) {
    els.awardPoints.textContent = 'No points awarded';
    els.awardNobody.disabled = true;
    els.tablesAward.classList.remove('hidden');
  } else if (state.sentIdx > 0) {
    const awarded = state.tables.filter(t => t.awardedThisQ).map(t => t.name);
    if (awarded.length > 0) {
      els.awardPoints.textContent = `Awarded ${state._awardedPts} pts · ${awarded.join(', ')} · click others to award`;
    } else {
      els.awardPoints.textContent = `${pts} pts — click a table to award`;
    }
    els.awardNobody.disabled = awarded.length > 0;
    els.tablesAward.classList.remove('hidden');
  } else {
    els.awardPoints.textContent = `${pts} pts after first sentence`;
    els.awardNobody.disabled = true;
    els.tablesAward.classList.remove('hidden');
  }
}

function hideAwardPanel() {
  els.tablesAward.classList.add('hidden');
}

function awardTable(idx, pts) {
  if (state.tables[idx].awardedThisQ || state.noneAwardedThisQ) return;
  state.tables[idx].score += pts;
  state.tables[idx].correct++;
  state.tables[idx].awardedThisQ = true;
  state.awardedThisQ = true;
  state._awardedIdx = idx;
  state._awardedPts = pts;
  renderTables();
}

function toggleTablesVisibility() {
  if (state.isAuto) {
    els.tablesSection.classList.add('hidden');
  } else {
    els.tablesSection.classList.remove('hidden');
    renderTables();
  }
}

els.addTableBtn.addEventListener('click', () => addTable(els.tableNameInput.value));
els.tableNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTable(els.tableNameInput.value);
});
els.awardNobody.addEventListener('click', () => {
  state.awardedThisQ = true;
  state.noneAwardedThisQ = true;
  state._awardedIdx = -1;
  state._awardedPts = 0;
  renderTables();
});

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
  toggleTablesVisibility();
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
  toggleTablesVisibility();
  stopTimer();
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

els.timerStartBtn.addEventListener('click', () => startTimer());
els.timerStopBtn.addEventListener('click', () => stopTimer());

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