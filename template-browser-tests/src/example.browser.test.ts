import { afterEach, expect, it } from 'vitest';

// These run in headless Chromium: jsdom computes no layout, so every size
// below would be 0 there.
afterEach(() => {
  document.body.replaceChildren();
});

it('sizes a box from its width, padding and border', () => {
  const box = document.createElement('div');
  box.style.cssText = 'width: 100px; padding: 10px; border: 2px solid;';
  document.body.append(box);

  expect(box.getBoundingClientRect().width).toBe(124);
});

it('wraps inline items that overflow their row', () => {
  const row = document.createElement('div');
  row.style.width = '150px';
  const first = document.createElement('span');
  const second = document.createElement('span');
  for (const item of [first, second]) {
    item.style.cssText = 'display: inline-block; width: 100px; height: 20px;';
    row.append(item);
  }
  document.body.append(row);

  expect(second.getBoundingClientRect().top).toBeGreaterThanOrEqual(first.getBoundingClientRect().bottom);
});
