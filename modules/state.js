// ==============================================
// グローバル状態の一元管理
// ==============================================
export let meta = null;
export let questions = [];
export let questionById = new Map();
export let answered = {};
export let bookmarks = {};
export let filteredQuestions = null;
export let activeTag = null;
export let shuffleMap = {};
export let fuse = null;

export function setMeta(v)              { meta = v; }
export function setQuestions(v)         { questions = v; }
export function setQuestionById(v)      { questionById = v; }
export function setAnswered(v)          { answered = v; }
export function setBookmarks(v)         { bookmarks = v; }
export function setFilteredQuestions(v) { filteredQuestions = v; }
export function setActiveTag(v)         { activeTag = v; }
export function setShuffleMap(v)        { shuffleMap = v; }
export function setFuse(v)              { fuse = v; }
