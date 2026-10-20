const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('global auth button is an accessible outline profile control in the header', async () => {
  let ready;
  const byId = byIdGlobal;
  byId.clear();
  const header = makeElement('header');
  const document = {
    getElementById: id => byId.get(id) || null,
    querySelector: selector => selector === '.page-header:not(.page-header-masthead)' ? header : null,
    createElement: tag => makeElement(tag),
    body: makeElement('body'),
    head: makeElement('head'),
    addEventListener: (event, callback) => { if (event === 'DOMContentLoaded') ready = callback; },
  };
  const localStorage = { length: 0, getItem: () => null, key: () => null };
  const window = {
    SB: { enabled: true, getSession: async () => null, getUser: async () => null, onAuthChange() {} },
  };
  vm.runInNewContext(fs.readFileSync('js/auth-ui.js', 'utf8'), {
    window, document, localStorage, console, setTimeout() {}, Date, JSON,
  });

  ready();
  await new Promise(resolve => setImmediate(resolve));

  const button = byId.get('authBtnGlobal');
  assert.ok(button);
  assert.equal(header.children[0], button);
  assert.equal(button.type, 'button');
  assert.equal(button.attributes['aria-label'], '로그인');
  assert.ok(button.listeners.click, 'native button click remains wired for keyboard activation');
  assert.match(button.innerHTML, /<svg[^>]*width="24"[^>]*height="24"/);
  assert.match(button.innerHTML, /circle cx="12"/);
  assert.match(button.innerHTML, /aria-hidden="true"/);
  const styles = byId.get('authUiButtonStyles').textContent;
  assert.match(styles, /width:44px;height:44px/);
  assert.match(styles, /background:transparent/);
  assert.match(styles, /box-shadow:none/);
});

function makeElement(tag) {
  const element = {
    tagName: tag.toUpperCase(),
    attributes: {},
    children: [],
    listeners: {},
    style: { cssText: '' },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    appendChild(child) {
      this.children.push(child);
      if (child.id) byIdGlobal.set(child.id, child);
      return child;
    },
  };
  return element;
}

const byIdGlobal = new Map();
