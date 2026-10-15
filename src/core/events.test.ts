import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from './events';

interface TestEvents {
  hit: { damage: number };
  reset: undefined;
}

describe('createEventBus', () => {
  it('ruft Listener mit Nutzdaten auf und meldet sie wieder ab', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    const off = bus.on('hit', listener);
    bus.emit('hit', { damage: 3 });
    off();
    bus.emit('hit', { damage: 5 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ damage: 3 });
  });

  it('once feuert nur einmal', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.once('reset', listener);
    bus.emit('reset', undefined);
    bus.emit('reset', undefined);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ein werfender Listener hält die anderen nicht auf', () => {
    const bus = createEventBus<TestEvents>();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    bus.on('hit', () => {
      throw new Error('kaputt');
    });
    bus.on('hit', second);
    bus.emit('hit', { damage: 1 });
    expect(second).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
