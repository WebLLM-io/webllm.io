import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from './event-emitter.js';

type TestEvents = {
  message: string;
  count: number;
  empty: undefined;
};

describe('EventEmitter', () => {
  it('should call handler when event is emitted', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.on('message', handler);
    emitter.emit('message', 'hello');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('hello');
  });

  it('should support multiple handlers on the same event', () => {
    const emitter = new EventEmitter<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();

    emitter.on('message', h1);
    emitter.on('message', h2);
    emitter.emit('message', 'test');

    expect(h1).toHaveBeenCalledWith('test');
    expect(h2).toHaveBeenCalledWith('test');
  });

  it('should remove handler via off()', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.on('count', handler);
    emitter.emit('count', 1);
    expect(handler).toHaveBeenCalledTimes(1);

    emitter.off('count', handler);
    emitter.emit('count', 2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should remove handler via returned unsubscribe function', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler = vi.fn();

    const unsub = emitter.on('message', handler);
    emitter.emit('message', 'first');
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    emitter.emit('message', 'second');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should clear all listeners via removeAll()', () => {
    const emitter = new EventEmitter<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();

    emitter.on('message', h1);
    emitter.on('count', h2);

    emitter.removeAll();

    emitter.emit('message', 'gone');
    emitter.emit('count', 42);

    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('should not throw when emitting with no listeners', () => {
    const emitter = new EventEmitter<TestEvents>();
    expect(() => emitter.emit('message', 'no one listening')).not.toThrow();
  });

  it('should not throw when removing a handler that was never added', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler = vi.fn();
    expect(() => emitter.off('message', handler)).not.toThrow();
  });

  it('should support different event types independently', () => {
    const emitter = new EventEmitter<TestEvents>();
    const msgHandler = vi.fn();
    const countHandler = vi.fn();

    emitter.on('message', msgHandler);
    emitter.on('count', countHandler);

    emitter.emit('message', 'hi');
    expect(msgHandler).toHaveBeenCalledWith('hi');
    expect(countHandler).not.toHaveBeenCalled();

    emitter.emit('count', 5);
    expect(countHandler).toHaveBeenCalledWith(5);
  });
});
