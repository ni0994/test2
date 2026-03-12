// ==============================================
// エントリーポイント
// ==============================================
import * as State from './modules/state.js';
import { loadMeta, loadQuestions, indexQuestions } from './modules/loader.js';
import {
  LS_ANSWERED_V2, LS_ANSWERED_V1, LS_MIGRATED_AT,
  HISTORY_CAP,
  saveAnswered, saveBookmarks,
  loadBookmarks, loadAnsweredV2WithMigration, cleanupAnsweredNotInQuestions
} from './modules/storage.js';
import { buildShuffleMap, fisherYates, displayIndexToOriginal } from './modules/shuffle.js';
import { initFuse, applyFilters, getFilteredByDomainPoolAndDifficulty } from './modules/search.js';
import { renderQuestions, buildCard, showJudgeResult, showExplanation, applyAnsweredState } from './modules/render.js';
import { computeStats, updateStatsDashboard } from './modules/stats.js';
import {
  setupSearchEvents, setupFilterEvents, setupKeyboardAnswerEvents,
  setupFilterToggle, setupBackToTop, setupOfflineBanner, setupHiddenAdmin,
  setupDomainStatsBlocks, buildDomainFilter, setupDashboardToggle
} from './modules/ui.js';

async function init() {
  try {
    State.setMeta(await loadMeta('data/meta.json'));
    State.setQuestions(await loadQuestions(
      State.meta?.questionFiles || [
        'data/questions_sg_v1.json',
        'data/questions_sg_basic_v1.json',
        'data/questions_sg_practice_v1.json'
      ]
    ));
  } catch (e) {
    console.error('[init] データ読み込み失敗:', e);
    const container = document.getElementById('questions-container');
    if (container) {
      container.innerHTML =
        `<p style="color:red;">問題データの読み込みに失敗しました。<br>${e.message}</p>`;
    }
    return;
  }

  State.setQuestionById(indexQuestions(State.questions));
  State.setAnswered(loadAnsweredV2WithMigration());
  State.setBookmarks(loadBookmarks());
  cleanupAnsweredNotInQuestions(State.questions, State.answered);
  State.setShuffleMap(buildShuffleMap(State.questions));
  State.setFuse(initFuse(State.questions));

  buildDomainFilter(State.meta);
  setupDomainStatsBlocks(State.meta);

  State.setFilteredQuestions(State.questions.slice());
  _renderQuestions();
  _updateDashboard();

  setupSearchEvents({ onSearch: (q) => _applyFilters(q) });
  setupFilterEvents({
    onFilter:        (q) => _applyFilters(q),
    onRender:        ()  => _renderQuestions(),
    getFilteredPool: ()  => getFilteredByDomainPoolAndDifficulty(
      State.questions, State.answered, State.bookmarks
    ),
    onRandom: (shuffled) => {
      State.setFilteredQuestions(shuffled);
      const el = document.getElementById('search-count');
      if (el) el.textContent = `ランダム${shuffled.length}問`;
      _renderQuestions();
    },
    onClearTag:       ()  => _clearTagFilter(),
    onClearBookmarks: ()  => {
      State.setBookmarks({});
      saveBookmarks(State.bookmarks);
      _renderQuestions();
    }
  });

  setupKeyboardAnswerEvents();
  setupBackToTop();
  setupOfflineBanner();
  setupFilterToggle();
  setupDashboardToggle();
  setupHiddenAdmin({
    onResetAll: () => {
      localStorage.removeItem(LS_ANSWERED_V2);
      localStorage.removeItem(LS_ANSWERED_V1);
      localStorage.removeItem(LS_MIGRATED_AT);
      State.setAnswered({});
      State.setShuffleMap(buildShuffleMap(State.questions));
      _renderQuestions();
      _updateDashboard();
    },
    onResetAnswersOnly: () => {
      localStorage.removeItem(LS_ANSWERED_V2);
      localStorage.removeItem(LS_ANSWERED_V1);
      localStorage.removeItem(LS_MIGRATED_AT);
      State.setAnswered({});
      State.setShuffleMap(buildShuffleMap(State.questions));
      _renderQuestions();
      _updateDashboard();
    }
  });
}

function _isShuffleEnabled() {
  return document.getElementById('shuffle-toggle')?.checked ?? true;
}

function _getState() {
  return {
    answered:    State.answered,
    bookmarks:   State.bookmarks,
    shuffleMap:  State.shuffleMap,
    questionById: State.questionById,
    activeTag:   State.activeTag,
    meta:        State.meta
  };
}

function _getCallbacks() {
  return {
    onChoose:         onChoose,
    onRetry:          onRetry,
    onToggleBookmark: _toggleBookmark,
    onSetTag:         _setTagFilter,
    onClearTag:       _clearTagFilter,
    isShuffleEnabled: _isShuffleEnabled
  };
}

function _renderQuestions() {
  const target = State.filteredQuestions ?? State.questions;
  renderQuestions(target, _getState(), _getCallbacks());
}

function _updateDashboard() {
  updateStatsDashboard(computeStats(State.questions, State.answered, State.meta));
}

function _applyFilters(query) {
  const filtered = applyFilters({
    query,
    questions: State.questions,
    fuse:      State.fuse,
    answered:  State.answered,
    bookmarks: State.bookmarks,
    activeTag: State.activeTag
  });
  State.setFilteredQuestions(filtered);

  const countEl = document.getElementById('search-count');
  if (countEl) {
    if (query) {
      countEl.textContent = `${filtered.length}件ヒット`;
    } else if (filtered.length !== State.questions.length) {
      countEl.textContent = `${filtered.length}件表示`;
    } else {
      countEl.textContent = '';
    }
  }

  _renderQuestions();
}

function _setTagFilter(tag) {
  State.setActiveTag(tag);
  const area  = document.getElementById('active-tag-area');
  const valEl = document.getElementById('active-tag-value');
  if (area)  area.classList.remove('hidden');
  if (valEl) valEl.textContent = tag;
  _applyFilters(document.getElementById('search-input')?.value.trim() ?? '');
}

function _clearTagFilter() {
  State.setActiveTag(null);
  document.getElementById('active-tag-area')?.classList.add('hidden');
  _applyFilters(document.getElementById('search-input')?.value.trim() ?? '');
}

function _toggleBookmark(questionId) {
  const bm = { ...State.bookmarks };
  if (bm[questionId]) delete bm[questionId];
  else bm[questionId] = true;
  State.setBookmarks(bm);
  saveBookmarks(State.bookmarks);
}

function onChoose(questionId, displayIdx, cardEl) {
  const q = State.questionById.get(questionId);
  if (!q) return;
  const existing = State.answered[questionId];
  if (existing && existing.attempts > 0) return;

  const origIdx = displayIndexToOriginal(
    questionId, displayIdx, State.shuffleMap, State.questionById, _isShuffleEnabled()
  );
  const isCorrect = (origIdx === q.answer);
  const now       = new Date().toISOString();

  cardEl.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    const orig = Number(btn.dataset.origIndex);
    if (orig === q.answer)                   btn.classList.add('is-correct');
    else if (orig === origIdx && !isCorrect) btn.classList.add('is-wrong');
  });

  showJudgeResult(cardEl, isCorrect);
  showExplanation(cardEl, q);
  cardEl.querySelector('.retry-btn')?.classList.remove('hidden');

  const rec = State.answered[questionId] || {
    attempts: 0, correct: 0, lastCorrect: false, lastAnsweredAt: null, history: []
  };

  rec.attempts += 1;
  if (isCorrect) rec.correct += 1;
  rec.lastCorrect    = isCorrect;
  rec.lastAnsweredAt = now;

  if (!Array.isArray(rec.history)) rec.history = [];
  rec.history.push({ at: now, correct: isCorrect });
  if (rec.history.length > HISTORY_CAP) {
    rec.history = rec.history.slice(-HISTORY_CAP);
  }

  State.answered[questionId] = rec;
  saveAnswered(State.answered);

  applyAnsweredState(q, cardEl, State.answered);
  _updateDashboard();
}

function onRetry(questionId, cardEl) {
  const q = State.questionById.get(questionId);
  if (!q) return;

  const newMap = {
    ...State.shuffleMap,
    [questionId]: fisherYates(q.choices.map((_, i) => i))
  };
  State.setShuffleMap(newMap);

  const newAnswered = { ...State.answered };
  delete newAnswered[questionId];
  State.setAnswered(newAnswered);
  saveAnswered(State.answered);

  const newCard = buildCard(q, _getState(), _getCallbacks());
  cardEl.replaceWith(newCard);
  _updateDashboard();
}

document.addEventListener('DOMContentLoaded', init);
