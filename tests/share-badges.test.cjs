const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const shareSource = fs.readFileSync('js/share.js', 'utf8');

function setup(books = []) {
  const state = { books };
  const elements = {
    statWeek: { textContent: '' },
    statMonth: { textContent: '' },
    statYear: { textContent: '' },
    badgesCount: { textContent: '' },
  };
  const grid = {
    items: [],
    set innerHTML(value) {
      this.markup = value;
      this.items = [...value.matchAll(/<button type="button" class="badge-item ([^"]+)"\s+data-badge="([^"]+)" aria-label="([^"]+)">/g)]
        .map(match => ({
          className: match[1],
          dataset: { badge: match[2] },
          ariaLabel: match[3],
          addEventListener(type, listener) { this.listener = listener; this.eventType = type; },
        }));
    },
    get innerHTML() { return this.markup || ''; },
    querySelectorAll(selector) { return selector === '.badge-item' ? this.items : []; },
  };
  elements.badgesGrid = grid;
  const document = {
    addEventListener() {},
    getElementById(id) { return elements[id] || null; },
  };
  const window = { COMMUNITY_SHELVES: [] };
  const instrumented = shareSource.replace(/\}\)\(\);\s*$/, 'window.__badgeTest = { BADGES, calculateMyStats, renderBadges, getStats: () => myStats };})();');
  assert.notEqual(instrumented, shareSource, 'share module test hooks were injected');
  vm.runInNewContext(instrumented, {
    window,
    document,
    Storage: { getAllBooks: () => state.books },
    localStorage: { getItem: key => key === 'monthlyGoal' ? '20' : null },
    Date,
    setTimeout,
    clearTimeout,
  });
  return { api: window.__badgeTest, elements, state };
}

test('only the eight badges backed by available calculations are shown', () => {
  const { api } = setup();
  assert.deepEqual(Array.from(api.BADGES, badge => badge.id), [
    'streak3', 'streak7', 'streak30', 'books10', 'books50', 'books100', 'goal', 'weekly',
  ]);
});

test('book milestone badges count completed books, not want-to-read or reading books', () => {
  const completed = Array.from({ length: 9 }, (_, i) => ({ id: `done-${i}` }));
  const { api, state } = setup([...completed, { status: 'want' }, { status: 'reading' }]);
  api.calculateMyStats();
  assert.equal(api.getStats().total, 9);
  assert.equal(api.BADGES.find(badge => badge.id === 'books10').condition(api.getStats()), false);

  state.books.push({ id: 'done-9' });
  api.calculateMyStats();
  assert.equal(api.getStats().total, 10);
  assert.equal(api.BADGES.find(badge => badge.id === 'books10').condition(api.getStats()), true);
});

test('badge controls render as labeled buttons with locked and unlocked state', () => {
  const { api, elements, state } = setup();
  api.calculateMyStats();
  api.renderBadges();
  assert.equal(elements.badgesCount.textContent, '0/8');
  assert.equal(elements.badgesGrid.items.length, 8);
  assert.ok(elements.badgesGrid.items.every(item => item.className.includes('locked') && item.eventType === 'click' && /미획득 뱃지$/.test(item.ariaLabel)));

  state.books = Array.from({ length: 10 }, (_, i) => ({ id: `done-${i}` }));
  api.calculateMyStats();
  api.renderBadges();
  const milestone = elements.badgesGrid.items.find(item => item.dataset.badge === 'books10');
  assert.ok(milestone.className.includes('unlocked'));
  assert.match(milestone.ariaLabel, /획득 뱃지$/);
});

test('share page has the matching initial badge denominator and an announced toast', () => {
  const html = fs.readFileSync('share.html', 'utf8');
  assert.match(html, /id="badgesCount">0\/8<\/span>/);
  assert.match(html, /id="toast" role="status" aria-live="polite"/);
  assert.match(html, /\.badge-item:focus-visible/);
});
