import { describe, it, expect } from "vitest";
import { resolveConfig } from "../src/config.js";
import { PondModel } from "../src/model.js";
import { createKoiPond } from "../src/index.js";
describe("Koi Pond behaviour", () => {
  it("steers finite separated fish inside bounds through long schooling, gather and scatter cycles", () => {
    const m = new PondModel(
      resolveConfig({ seed: 123, fishCount: 18 }),
      700,
      420,
    );
    for (let i = 0; i < 7200; i++) {
      if (i === 100) m.gather();
      if (i === 900) m.scatter();
      m.step(1 / 60);
      for (const f of m.fish) {
        expect(Number.isFinite(f.x + f.y + f.heading + f.vx + f.vy)).toBe(true);
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.x).toBeLessThanOrEqual(700);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeLessThanOrEqual(420);
      }
    }
    expect(m.mode).toBe("swim");
  });
  it("fish actually pursue and consume food, with finite-life bounded particles", () => {
    const m = new PondModel(resolveConfig({ seed: 33 }), 700, 450);
    const f = m.fish[0]!;
    m.feed(f.x + 12, f.y + 12);
    const before = m.food.length;
    for (let i = 0; i < 1200; i++) m.step(1 / 60);
    expect(m.fed).toBeGreaterThan(0);
    expect(m.food.length).toBeLessThan(before);
    for (let i = 0; i < 100; i++) m.feed();
    expect(m.food.length).toBeLessThanOrEqual(72);
    expect(m.ripples.length).toBeLessThanOrEqual(24);
    for (let i = 0; i < 1800; i++) m.step(1 / 60);
    expect(m.food).toHaveLength(0);
  });
  it("reset is seeded and resize preserves relative placement", () => {
    const m = new PondModel(resolveConfig({ seed: 41 }), 500, 300),
      start = m.stateFish();
    m.step(0.05);
    m.reset();
    expect(m.stateFish()).toEqual(start);
    m.resize(1000, 600);
    expect(m.fish[0]!.x).toBeCloseTo(start[0]!.x * 2);
    expect(m.fish[0]!.y).toBeCloseTo(start[0]!.y * 2);
  });
  it("rejects malicious or non-finite configs and feed coordinates", () => {
    for (const value of [
      { fishCount: NaN },
      { speed: "fast" },
      { lilies: null },
      { palette: "javascript:alert(1)" },
      { foo: true },
      JSON.parse('{"__proto__":{"x":1}}'),
    ])
      expect(() => resolveConfig(value as never)).toThrow();
    const options = {
      get speed(): number {
        throw Error("Getter evaluated");
      },
    };
    expect(() => resolveConfig(options)).toThrow(/accessors/);
    expect(
      resolveConfig({ fishCount: 100, size: 12, zIndex: 9999999999 }),
    ).toMatchObject({ fishCount: 18, size: 1.6, zIndex: 2147483000 });
    const m = new PondModel(resolveConfig());
    expect(() => m.feed(Infinity, 0)).toThrow();
  });
  it("imports in SSR and exposes detached state snapshots and idempotent cleanup", () => {
    const c = createKoiPond();
    expect(c.getState().ready).toBe(false);
    const s = c.getState();
    s.fish[0]!.x = 999999;
    expect(c.getState().fish[0]!.x).not.toBe(999999);
    c.destroy();
    c.destroy();
    c.feed();
    expect(c.getState().destroyed).toBe(true);
    expect(c.getState().food).toBe(0);
  });
});
