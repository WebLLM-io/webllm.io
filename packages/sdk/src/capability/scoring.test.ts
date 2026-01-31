import { describe, it, expect } from 'vitest';
import { scoreDevice } from './scoring.js';

describe('scoreDevice', () => {
  it('should return S for vram >= 8192', () => {
    expect(scoreDevice(8192)).toBe('S');
    expect(scoreDevice(16384)).toBe('S');
    expect(scoreDevice(10000)).toBe('S');
  });

  it('should return A for vram >= 4096 and < 8192', () => {
    expect(scoreDevice(4096)).toBe('A');
    expect(scoreDevice(6000)).toBe('A');
    expect(scoreDevice(8191)).toBe('A');
  });

  it('should return B for vram >= 2048 and < 4096', () => {
    expect(scoreDevice(2048)).toBe('B');
    expect(scoreDevice(3000)).toBe('B');
    expect(scoreDevice(4095)).toBe('B');
  });

  it('should return C for vram < 2048', () => {
    expect(scoreDevice(2047)).toBe('C');
    expect(scoreDevice(1024)).toBe('C');
    expect(scoreDevice(0)).toBe('C');
  });

  // Boundary values
  it('boundary: 8192 is S', () => {
    expect(scoreDevice(8192)).toBe('S');
  });

  it('boundary: 8191 is A', () => {
    expect(scoreDevice(8191)).toBe('A');
  });

  it('boundary: 4096 is A', () => {
    expect(scoreDevice(4096)).toBe('A');
  });

  it('boundary: 4095 is B', () => {
    expect(scoreDevice(4095)).toBe('B');
  });

  it('boundary: 2048 is B', () => {
    expect(scoreDevice(2048)).toBe('B');
  });

  it('boundary: 2047 is C', () => {
    expect(scoreDevice(2047)).toBe('C');
  });

  it('boundary: 0 is C', () => {
    expect(scoreDevice(0)).toBe('C');
  });
});
