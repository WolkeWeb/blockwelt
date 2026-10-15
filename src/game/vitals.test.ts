import { describe, expect, it } from 'vitest';
import { MAX_AIR, MAX_HEALTH, applyDamage, fallDamage, freshVitals, isDead, stepVitals, type Vitals } from './vitals';

describe('Fallschaden', () => {
  it('bis 3 Blöcke kein Schaden, ab 4 ein halbes Herz pro Block über 3', () => {
    expect(fallDamage(0)).toBe(0);
    expect(fallDamage(3.9)).toBe(0);
    expect(fallDamage(4)).toBe(1);
    expect(fallDamage(5)).toBe(2);
    expect(fallDamage(23)).toBe(20);
  });
});

describe('Schaden und Tod', () => {
  it('zieht Leben ab und stoppt bei 0', () => {
    const v = applyDamage(freshVitals(), 5);
    expect(v.health).toBe(MAX_HEALTH - 5);
    expect(isDead(v)).toBe(false);
    expect(applyDamage(v, 100).health).toBe(0);
    expect(isDead(applyDamage(v, 100))).toBe(true);
  });
  it('ohne Schaden bleibt der Zustand gleich', () => {
    const v = freshVitals();
    expect(applyDamage(v, 0)).toBe(v);
  });
});

describe('Ertrinken', () => {
  const run = (ticks: number, start: Vitals = freshVitals()) => {
    let v = start;
    let damage = 0;
    for (let i = 0; i < ticks; i++) {
      const step = stepVitals(v, 'survival', true);
      v = step.vitals;
      damage += step.damage;
    }
    return { v, damage };
  };

  it('Luft sinkt unter Wasser, erst ohne Luft gibt es Schaden', () => {
    expect(run(MAX_AIR).v.air).toBe(0);
    expect(run(MAX_AIR).damage).toBe(0);
    const later = run(MAX_AIR + 20);
    expect(later.damage).toBe(2);
    expect(later.v.health).toBe(MAX_HEALTH - 2);
  });
  it('ertrinkt nach etwa 15 + 10 Sekunden', () => {
    let v = freshVitals();
    let ticks = 0;
    while (!isDead(v) && ticks < 2000) {
      v = stepVitals(v, 'survival', true).vitals;
      ticks++;
    }
    expect(isDead(v)).toBe(true);
    expect(ticks).toBeGreaterThan(MAX_AIR + 150);
    expect(ticks).toBeLessThan(MAX_AIR + 300);
  });
  it('Luft füllt sich über Wasser schnell wieder auf', () => {
    let v = run(100).v;
    expect(v.air).toBeLessThan(MAX_AIR);
    for (let i = 0; i < 30; i++) v = stepVitals(v, 'survival', false).vitals;
    expect(v.air).toBe(MAX_AIR);
  });
  it('Kreativ: nie Schaden, immer volle Luft', () => {
    const step = stepVitals({ ...freshVitals(), air: 0, health: 3 }, 'creative', true);
    expect(step.damage).toBe(0);
    expect(step.vitals).toEqual(freshVitals());
  });
});

describe('Heilung', () => {
  it('ein halbes Herz alle 80 Ticks', () => {
    let v: Vitals = { ...freshVitals(), health: 10 };
    for (let i = 0; i < 80; i++) v = stepVitals(v, 'survival', false).vitals;
    expect(v.health).toBe(11);
    for (let i = 0; i < 80 * 20; i++) v = stepVitals(v, 'survival', false).vitals;
    expect(v.health).toBe(MAX_HEALTH);
  });
  it('Tote heilen nicht', () => {
    const dead: Vitals = { ...freshVitals(), health: 0 };
    expect(stepVitals(dead, 'survival', false).vitals).toBe(dead);
  });
});
