import { clamp, type PondConfig } from "./config.js";
import type { FishState, FishVariety } from "./types.js";
export interface Fish extends FishState {
  vx: number;
  vy: number;
  turn: number;
  phase: number;
  mark: number;
  fed: number;
}
export interface Food {
  x: number;
  y: number;
  age: number;
  id: number;
}
export interface Ripple {
  x: number;
  y: number;
  age: number;
  strength: number;
}
const varieties: FishVariety[] = [
  "kohaku",
  "sanke",
  "gold",
  "kohaku",
  "ink",
  "sanke",
  "gold",
  "kohaku",
];
const angleDelta = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export class PondModel {
  fish: Fish[] = [];
  food: Food[] = [];
  ripples: Ripple[] = [];
  fed = 0;
  elapsed = 0;
  mode: "swim" | "gather" | "scatter" = "swim";
  night = false;
  private modeUntil = 0;
  private nextFood = 0;
  private randomState = 1;
  constructor(
    public config: PondConfig,
    public width = 1000,
    public height = 650,
  ) {
    this.reset();
  }
  random() {
    let x = this.randomState;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.randomState = x >>> 0;
    return this.randomState / 4294967296;
  }
  reset() {
    this.randomState = this.config.seed || 1;
    this.fish = [];
    this.food = [];
    this.ripples = [];
    this.fed = 0;
    this.elapsed = 0;
    this.mode = "swim";
    this.modeUntil = 0;
    this.nextFood = 0;
    this.night = this.config.palette === "midnight";
    for (let i = 0; i < this.config.fishCount; i++) {
      const angle = this.random() * Math.PI * 2;
      const factor = clamp(Math.min(this.width, this.height) / 650, 0.6, 1.35);
      const length = (70 + this.random() * 35) * this.config.size * factor;
      this.fish.push({
        id: i,
        x: this.width * (0.15 + this.random() * 0.7),
        y: this.height * (0.16 + this.random() * 0.68),
        heading: angle,
        vx: Math.cos(angle) * 18,
        vy: Math.sin(angle) * 18,
        length,
        variety: varieties[i % varieties.length]!,
        phase: this.random() * Math.PI * 2,
        mark: this.random(),
        turn: 0,
        fed: 0,
      });
    }
  }
  resize(width: number, height: number) {
    width = Math.max(1, width);
    height = Math.max(1, height);
    for (const f of this.fish) {
      f.x *= width / this.width;
      f.y *= height / this.height;
    }
    for (const p of this.food) {
      p.x *= width / this.width;
      p.y *= height / this.height;
    }
    this.width = width;
    this.height = height;
  }
  feed(x = this.width * 0.5, y = this.height * 0.5) {
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new TypeError("Feed coordinates must be finite CSS pixels.");
    x = clamp(x, 12, Math.max(12, this.width - 12));
    y = clamp(y, 12, Math.max(12, this.height - 12));
    for (let i = 0; i < 9; i++) {
      if (this.food.length >= 72) this.food.shift();
      this.food.push({
        x: clamp(x + (this.random() - 0.5) * 40, 4, this.width - 4),
        y: clamp(y + (this.random() - 0.5) * 40, 4, this.height - 4),
        age: 0,
        id: ++this.nextFood,
      });
    }
    this.ripple(x, y, 1);
  }
  ripple(x: number, y: number, strength = 0.6) {
    this.ripples.push({ x, y, strength, age: 0 });
    if (this.ripples.length > 24) this.ripples.shift();
  }
  gather() {
    this.mode = "gather";
    this.modeUntil = this.elapsed + 9;
    this.ripple(this.width * 0.5, this.height * 0.5, 0.8);
  }
  scatter() {
    this.mode = "scatter";
    this.modeUntil = this.elapsed + 3.5;
    this.ripple(this.width * 0.5, this.height * 0.5, 1.3);
  }
  step(delta: number) {
    const dt = clamp(delta, 0, 0.05);
    if (!dt) return;
    this.elapsed += dt;
    if (this.elapsed > this.modeUntil) this.mode = "swim";
    for (const p of this.food) {
      p.age += dt;
      p.x += Math.sin(p.age * 0.8 + p.id) * dt * 0.7;
      p.y += Math.cos(p.age * 0.5 + p.id) * dt * 0.6;
    }
    this.food = this.food.filter((p) => p.age < 24);
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter((r) => r.age < 3.6);
    for (const f of this.fish) {
      let tx = 0,
        ty = 0,
        targetFood: Food | undefined;
      let nearest = Infinity;
      for (const p of this.food) {
        const d = Math.hypot(p.x - f.x, p.y - f.y);
        if (d < nearest) {
          nearest = d;
          targetFood = p;
        }
      }
      if (targetFood) {
        tx = targetFood.x - f.x;
        ty = targetFood.y - f.y;
        if (nearest < f.length * 0.22) {
          const index = this.food.indexOf(targetFood);
          if (index >= 0) {
            this.food.splice(index, 1);
            this.fed++;
            f.fed++;
            this.ripple(targetFood.x, targetFood.y, 0.33);
          }
        }
      } else if (this.mode === "gather") {
        const a = this.elapsed * 0.26 + (f.id * Math.PI * 2) / this.fish.length;
        tx = this.width * 0.5 + Math.cos(a) * this.width * 0.12 - f.x;
        ty = this.height * 0.5 + Math.sin(a) * this.height * 0.15 - f.y;
      } else if (this.mode === "scatter") {
        tx = f.x - this.width * 0.5;
        ty = f.y - this.height * 0.5;
      } else {
        const a = f.heading + Math.sin(this.elapsed * 0.28 + f.phase) * 0.48;
        tx = Math.cos(a) * 40;
        ty = Math.sin(a) * 40;
      }
      const d = Math.max(1, Math.hypot(tx, ty));
      let ax = tx / d,
        ay = ty / d;
      for (const other of this.fish) {
        if (other === f) continue;
        const dx = f.x - other.x,
          dy = f.y - other.y,
          dist = Math.hypot(dx, dy),
          safe = (f.length + other.length) * 0.37;
        if (dist < safe && dist > 0.001) {
          const force = (1 - dist / safe) * 1.6;
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
      }
      const margin = Math.min(
        f.length * 0.8,
        this.width * 0.17,
        this.height * 0.17,
      );
      if (f.x < margin) ax += ((margin - f.x) / margin) * 3;
      if (f.x > this.width - margin)
        ax -= ((f.x - (this.width - margin)) / margin) * 3;
      if (f.y < margin) ay += ((margin - f.y) / margin) * 3;
      if (f.y > this.height - margin)
        ay -= ((f.y - (this.height - margin)) / margin) * 3;
      const heading = Math.atan2(ay, ax);
      const turn = angleDelta(heading, f.heading);
      const limit = dt * (targetFood ? 2.9 : 1.6);
      f.heading += clamp(turn, -limit, limit);
      f.turn += (clamp(turn, -1, 1) - f.turn) * (1 - Math.exp(-dt * 4));
      const speed =
        (targetFood ? 46 : this.mode === "scatter" ? 70 : 24) *
        this.config.speed *
        (0.85 + f.mark * 0.3);
      const smooth = 1 - Math.exp(-dt * 3);
      f.vx += (Math.cos(f.heading) * speed - f.vx) * smooth;
      f.vy += (Math.sin(f.heading) * speed - f.vy) * smooth;
      f.x = clamp(
        f.x + f.vx * dt,
        Math.min(8, this.width / 2),
        Math.max(this.width - 8, this.width / 2),
      );
      f.y = clamp(
        f.y + f.vy * dt,
        Math.min(8, this.height / 2),
        Math.max(this.height - 8, this.height / 2),
      );
      f.phase += dt * (targetFood ? 4.3 : 2.6) * this.config.speed;
    }
  }
  stateFish(): FishState[] {
    return this.fish.map(({ id, x, y, heading, length, variety }) => ({
      id,
      x,
      y,
      heading,
      length,
      variety,
    }));
  }
}
