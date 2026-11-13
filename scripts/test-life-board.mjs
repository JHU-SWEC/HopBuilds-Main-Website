import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const html = readFileSync('index.html', 'utf8');
assert.match(html, /<\/section>\s*<!--[^>]*TEAM LIFE[^>]*-->\s*<section class="life/);
assert.ok(html.indexOf('id="projects"') < html.indexOf('id="life"'));
assert.ok(html.indexOf('id="life"') < html.indexOf('id="semester"'));
const files = readdirSync('assets/web/team-life').filter(f => f.endsWith('.jpg'));
assert.equal(files.length, 8);
const handlers = {};
const collection = { children: [], append(item) { this.children.push(item); } };
let focused = false, open = false, locked = false;
const opener = { addEventListener(name, fn) { handlers.open = fn; }, focus() { focused = true; } };
const board = { querySelector() { return collection; }, addEventListener(name, fn) { handlers[name] = fn; }, showModal() { open = true; }, close() { open = false; handlers.close(); }, getBoundingClientRect() { return { left: 10, right: 100, top: 10, bottom: 100 }; } };
globalThis.document = {
  querySelector: selector => selector === '.life-open' ? opener : board,
  createElement: () => ({ append() {} }),
  body: { classList: { add() { locked = true; }, remove() { locked = false; } } },
};
let source = readFileSync('js/life-board.js', 'utf8');
source = source.replace(/import\.meta\.glob\([^;]+;/, ` ${JSON.stringify(Object.fromEntries(files.map(f => [f, f])))};`);
const { default: init } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
init(); handlers.open();
assert.equal(collection.children.length, 8); assert.ok(open && locked);
handlers.click({ target: board, clientX: 50, clientY: 50 }); assert.ok(open);
handlers.click({ target: board, clientX: 0, clientY: 0 }); assert.ok(!open && !locked && focused);
handlers.open(); assert.equal(collection.children.length, 8);
console.log('Team Life: section order, eight photos, open/close, scroll lock, focus return and repeat opening passed.');
