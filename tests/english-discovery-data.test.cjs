const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const entries = JSON.parse(fs.readFileSync('data/english-discovery-evidence.json', 'utf8'));
const context = {window:{}};
vm.runInNewContext(fs.readFileSync('js/book-catalog.js', 'utf8'), context);
const books = context.window.BOOK_CATALOG.books;

test('English discovery records retain exact ISBNs and traceable classifications', () => {
  assert.ok(entries.length >= 60);
  assert.equal(new Set(entries.map(e => e.isbn)).size, entries.length);
  for (const entry of entries) {
    const book = books.find(b => b.isbn === entry.isbn);
    assert.ok(book, entry.isbn);
    assert.equal(book.language, 'en');
    assert.ok(['picture','phonics','reader','chapter','novel'].includes(entry.stage));
    assert.equal(book.stage, entry.stage);
    assert.match(entry.source, /^https:\/\//);
    assert.match(entry.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(entry.topics));
    for (const topic of entry.topics) assert.ok(['animals','friendship','adventure','humor','dinosaurs','science'].includes(topic));
    if (entry.series?.order !== undefined) assert.ok(Number.isInteger(entry.series.order) && entry.series.order > 0);
    assert.ok(book.thumbnail && !/noimg|no_image/i.test(book.thumbnail));
  }
  for (const stage of ['picture','phonics','reader','chapter','novel']) assert.ok(entries.some(e => e.stage === stage), stage);
  for (const topic of ['animals','friendship','adventure','humor','dinosaurs','science']) assert.ok(entries.some(e => e.topics.includes(topic)), topic);
});

test('only independently sourced AR records become verified; legacy values cannot silently gain verification', () => {
  const verified = entries.filter(e => e.ar);
  assert.ok(verified.length > 0);
  for (const entry of verified) {
    assert.equal(typeof entry.ar.value, 'number');
    assert.ok(Number.isFinite(entry.ar.value) && entry.ar.value >= 0);
    const host = new URL(entry.ar.source).hostname;
    assert.ok(host === 'arbookfind.com' || host.endsWith('.arbookfind.com'), host);
    const book = books.find(b => b.isbn === entry.isbn);
    assert.equal(book.arStatus, 'verified');
    assert.equal(book.ar, entry.ar.value);
    assert.equal(book.arEvidence.source, entry.ar.source);
  }
  for (const book of books.filter(b => b.arStatus === 'verified')) assert.ok(verified.some(e => e.isbn === book.isbn));
});
