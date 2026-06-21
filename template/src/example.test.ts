import { describe, expect, it } from 'vitest';

import { greeting } from './example';

describe('greeting', () => {
  it('greets by name', () => {
    expect(greeting('Vite')).toBe('Hello, Vite!');
  });
});
