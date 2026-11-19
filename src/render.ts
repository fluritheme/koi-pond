import type { PondConfig } from "./config.js";
import { PondModel, type Fish } from "./model.js";
const TAU = Math.PI * 2;
const palettes = {
  jade: { base: "#174e4b", deep: "#092f35", light: "#84c8aa", glow: "#d9efbb" },
  lagoon: {
    base: "#146279",
    deep: "#07394d",
    light: "#81cdd4",
    glow: "#d7f5f3",
  },
  midnight: {
    base: "#162a47",
    deep: "#081628",
    light: "#668fb8",
    glow: "#d5dff8",
  },
};
export class PondRenderer {
  private ctx: CanvasRenderingContext2D;
  constructor(
    public canvas: HTMLCanvasElement,
    public config: PondConfig,
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Koi Pond needs Canvas2D support.");
    this.ctx = ctx;
  }
  resize(width: number, height: number, dpr: number) {
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  draw(model: PondModel) {
    const c = this.ctx,
      w = model.width,
      h = model.height,
      t = model.elapsed;
    const palette =
      palettes[
        model.night
          ? "midnight"
          : this.config.palette === "midnight"
            ? "jade"
            : this.config.palette
      ];
    c.clearRect(0, 0, w, h);
    if (this.config.waterOpacity > 0) {
      c.save();
      c.globalAlpha = this.config.waterOpacity;
      const bg = c.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, palette.base);
      bg.addColorStop(1, palette.deep);
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
      const light = c.createRadialGradient(
        w * 0.36,
        h * 0.12,
        0,
        w * 0.4,
        h * 0.3,
        w * 0.65,
      );
      light.addColorStop(0, palette.light + "30");
      light.addColorStop(1, palette.deep + "00");
      c.fillStyle = light;
      c.fillRect(0, 0, w, h);
      // Submerged riverbed pebbles: bounded, seeded placement without any raster asset.
      for (let i = 0; i < 38; i++) {
        const x = (Math.sin(i * 73.92) * 0.5 + 0.5) * w,
          y = (Math.sin(i * 31.18 + 2) * 0.5 + 0.5) * h,
          r = 8 + (i % 5) * 3;
        c.fillStyle = i % 3 ? "#a9d4b50a" : "#071b2821";
        c.beginPath();
        c.ellipse(x, y, r, r * 0.6, (i % 6) * 0.5, 0, TAU);
        c.fill();
      }
      c.restore();
    }
    if (this.config.caustics && this.config.waterOpacity > 0) {
      c.save();
      c.globalAlpha = 0.085 * this.config.waterOpacity;
      c.strokeStyle = palette.glow;
      c.lineWidth = 1.3;
      for (let i = 0; i < 11; i++) {
        c.beginPath();
        for (let j = 0; j <= 22; j++) {
          const x = (j * w) / 22,
            y =
              ((i + 0.5) * h) / 10 +
              Math.sin(j * 0.72 + i * 0.9 + t * 0.21) * 13 +
              Math.cos(j * 0.35 - t * 0.16 + i) * 15;
          if (j === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
      for (let i = 0; i < 28; i++) {
        const x = ((i * 0.1213) % 1) * w + Math.sin(t * 0.12 + i) * 12,
          y = ((i * 0.3789) % 1) * h + Math.cos(t * 0.2 + i) * 7;
        const alpha = (Math.sin(t * 0.7 + i * 2) + 1) * 0.14;
        c.globalAlpha = alpha;
        const r = 1.2 + (i % 3) * 0.6;
        c.fillStyle = palette.glow;
        c.beginPath();
        c.ellipse(x, y, r * 2, r * 0.35, 0.4, 0, TAU);
        c.fill();
      }
      c.restore();
    }
    for (const f of model.fish) this.drawFish(f, t, model.night);
    if (this.config.lilies) {
      const size = Math.min(w, h);
      this.lily(w * 0.1, h * 0.17, size * 0.075, -0.6, t, true, model.night);
      this.lily(w * 0.19, h * 0.12, size * 0.052, 1.7, t, false, model.night);
      this.lily(w * 0.88, h * 0.81, size * 0.08, 0.7, t, true, model.night);
      this.lily(w * 0.8, h * 0.89, size * 0.05, -0.3, t, false, model.night);
      this.lily(w * 0.93, h * 0.68, size * 0.044, 2.2, t, false, model.night);
    }
    for (const p of model.food) {
      c.save();
      c.translate(p.x, p.y);
      const a = Math.max(0, Math.min(1, (24 - p.age) / 2));
      c.globalAlpha = a;
      c.shadowColor = "#03272777";
      c.shadowBlur = 3;
      c.shadowOffsetY = 2;
      c.fillStyle = "#d8aa68";
      c.beginPath();
      c.ellipse(0, 0, 2.2, 1.7, p.id, 0, TAU);
      c.fill();
      c.shadowBlur = 0;
      c.shadowOffsetY = 0;
      c.fillStyle = "#f7d9a0";
      c.fillRect(-0.8, -0.6, 1.3, 0.8);
      c.restore();
    }
    for (const r of model.ripples) {
      c.save();
      const radius = 9 + r.age * 28;
      const alpha = (1 - r.age / 3.6) * 0.3 * r.strength;
      c.strokeStyle = palette.glow;
      c.lineWidth = 0.8;
      for (let ring = 0; ring < 3; ring++) {
        c.globalAlpha = alpha * (1 - ring * 0.23);
        c.beginPath();
        c.ellipse(
          r.x,
          r.y,
          radius + ring * 10,
          (radius + ring * 10) * 0.86,
          0,
          0,
          TAU,
        );
        c.stroke();
      }
      c.restore();
    }
    if (this.config.lilies) {
      c.save();
      const x = w * 0.73 + Math.sin(t * 0.21) * w * 0.04,
        y = h * 0.18 + Math.cos(t * 0.29) * h * 0.045;
      c.translate(x, y);
      c.rotate(Math.sin(t * 0.3) * 0.5 + 0.4);
      c.strokeStyle = model.night ? "#b0d8cf8c" : "#cee6bd9c";
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(-5, 0);
      c.lineTo(7, 0);
      c.stroke();
      for (let side = -1; side <= 1; side += 2) {
        c.fillStyle = "#c5edda45";
        c.beginPath();
        c.ellipse(0, side * 4.3, 5, 1.7, side * 0.5, 0, TAU);
        c.fill();
      }
      c.restore();
    }
  }
  private drawFish(f: Fish, t: number, night: boolean) {
    const c = this.ctx,
      L = f.length;
    const swim = Math.sin(f.phase);
    c.save();
    c.translate(f.x, f.y);
    c.rotate(f.heading);
    // Underwater shadow follows the articulated body rather than a static sticker.
    c.save();
    c.translate(7, 8);
    c.globalAlpha = 0.17;
    c.fillStyle = "#001a23";
    c.filter = "blur(3px)";
    this.body(f, L);
    c.fill();
    c.restore();
    const colors =
      f.variety === "gold"
        ? ["#f7d47f", "#c19143", "#fff0bd"]
        : f.variety === "ink"
          ? ["#4c6367", "#243a40", "#8ea2a0"]
          : ["#f8f2de", "#c7d0c2", "#fffdef"];
    // Pelvic and pectoral fins have independent membrane motion and radial veins.
    for (const side of [-1, 1]) {
      c.save();
      c.translate(L * 0.1, side * L * 0.13);
      c.rotate(side * (0.12 + swim * 0.12));
      this.fin(L, side, colors[1]!, night);
      c.restore();
      c.save();
      c.translate(-L * 0.24, side * L * 0.09);
      c.rotate(side * (0.1 + Math.sin(f.phase + 0.8) * 0.12));
      c.globalAlpha = 0.52;
      c.fillStyle = colors[0]!;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(
        -L * 0.12,
        side * L * 0.18,
        -L * 0.23,
        side * L * 0.14,
      );
      c.quadraticCurveTo(-L * 0.16, side * L * 0.04, 0, 0);
      c.fill();
      c.restore();
    }
    // The tail is a scalloped ribbon with a rounded fork, flexed by the body wave.
    c.save();
    c.translate(
      -L * 0.48,
      Math.sin(f.phase - 2) * L * 0.033 + f.turn * L * 0.07,
    );
    c.rotate(Math.sin(f.phase - 2.2) * 0.23 + f.turn * 0.2);
    const tail = c.createLinearGradient(0, 0, -L * 0.35, 0);
    tail.addColorStop(0, colors[1] + "bb");
    tail.addColorStop(0.65, colors[0] + "a0");
    tail.addColorStop(1, colors[0] + "1a");
    c.fillStyle = tail;
    c.beginPath();
    c.moveTo(0, -L * 0.025);
    c.bezierCurveTo(
      -L * 0.12,
      -L * 0.13,
      -L * 0.27,
      -L * 0.23,
      -L * 0.36,
      -L * 0.14,
    );
    c.quadraticCurveTo(-L * 0.27, -L * 0.05, -L * 0.23, 0);
    c.quadraticCurveTo(-L * 0.27, L * 0.05, -L * 0.36, L * 0.14);
    c.bezierCurveTo(-L * 0.27, L * 0.23, -L * 0.12, L * 0.13, 0, L * 0.025);
    c.closePath();
    c.fill();
    c.strokeStyle = colors[0] + "65";
    c.lineWidth = 0.65;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(-L * 0.025, 0);
      c.quadraticCurveTo(-L * 0.16, i * L * 0.023, -L * 0.3, i * L * 0.045);
      c.stroke();
    }
    c.restore();
    const gradient = c.createLinearGradient(0, -L * 0.2, 0, L * 0.2);
    gradient.addColorStop(0, colors[1]!);
    gradient.addColorStop(0.34, colors[0]!);
    gradient.addColorStop(0.52, colors[2]!);
    gradient.addColorStop(0.78, colors[0]!);
    gradient.addColorStop(1, colors[1]!);
    c.fillStyle = gradient;
    this.body(f, L);
    c.fill();
    c.strokeStyle = night ? "#e7f2e330" : "#092e3d33";
    c.lineWidth = 0.65;
    c.stroke();
    c.save();
    this.body(f, L);
    c.clip();
    // Distinct organic markings remain attached to the bending body.
    const patches =
      f.variety === "kohaku"
        ? ["#d85a38", "#c9472d"]
        : f.variety === "sanke"
          ? ["#c64d32", "#273d3d"]
          : f.variety === "gold"
            ? ["#d09b45", "#f1bf5a"]
            : ["#b9c0a4", "#172e35"];
    for (let i = 0; i < 6; i++) {
      const a = Math.sin((i + 1) * f.mark * 23 + f.id * 2),
        x = (0.31 - i * 0.125) * L,
        y = Math.sin(i * 3.7 + f.mark * 5) * L * 0.075;
      c.fillStyle = patches[i % 2]!;
      c.globalAlpha = f.variety === "gold" ? 0.45 : 0.94;
      c.beginPath();
      c.moveTo(x - L * 0.07, y - L * 0.06);
      c.bezierCurveTo(
        x + L * 0.07,
        y - L * 0.14,
        x + L * 0.13,
        y - L * 0.04,
        x + L * 0.09,
        y + L * 0.035,
      );
      c.bezierCurveTo(
        x + L * 0.11,
        y + L * 0.12,
        x - L * 0.05,
        y + L * (0.1 + a * 0.025),
        x - L * 0.08,
        y + L * 0.04,
      );
      c.bezierCurveTo(
        x - L * 0.12,
        y,
        x - L * 0.1,
        y - L * 0.03,
        x - L * 0.07,
        y - L * 0.06,
      );
      c.fill();
    }
    c.globalAlpha = 0.14;
    c.strokeStyle = "#fcffe8";
    c.lineWidth = 0.5;
    for (let i = 0; i < 12; i++) {
      const x = (0.28 - i * 0.055) * L;
      for (let j = -2; j <= 2; j++) {
        const y = j * L * 0.046 + (i % 2) * L * 0.023;
        c.beginPath();
        c.arc(x, y, L * 0.032, -0.9, 0.9);
        c.stroke();
      }
    }
    const shine = c.createLinearGradient(0, -L * 0.02, 0, L * 0.09);
    shine.addColorStop(0, "#ffffff50");
    shine.addColorStop(1, "#ffffff00");
    c.globalAlpha = 0.55;
    c.fillStyle = shine;
    c.beginPath();
    c.ellipse(-L * 0.04, 0, L * 0.36, L * 0.065, 0, 0, TAU);
    c.fill();
    c.restore();
    // Delicate dorsal fin, gills, expressive dark eyes and tiny cream barbels.
    c.strokeStyle = colors[1] + "9a";
    c.lineWidth = L * 0.027;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(L * 0.06, 0);
    c.quadraticCurveTo(
      -L * 0.09,
      Math.sin(f.phase - 0.8) * L * 0.016,
      -L * 0.27,
      Math.sin(f.phase - 1.6) * L * 0.025,
    );
    c.stroke();
    for (const side of [-1, 1]) {
      c.strokeStyle = f.variety === "ink" ? "#d4e3d744" : "#97795e66";
      c.lineWidth = 0.7;
      c.beginPath();
      c.ellipse(
        L * 0.27,
        0,
        L * 0.055,
        L * 0.112,
        0,
        side > 0 ? 0.15 : Math.PI,
        side > 0 ? 1.3 : Math.PI * 1.9,
      );
      c.stroke();
      c.fillStyle = "#0d2328";
      c.beginPath();
      c.ellipse(
        L * 0.335,
        side * L * 0.078,
        L * 0.018,
        L * 0.014,
        side * 0.4,
        0,
        TAU,
      );
      c.fill();
      c.fillStyle = "#fffcea";
      c.beginPath();
      c.arc(L * 0.34, side * L * 0.078 - L * 0.004, L * 0.0055, 0, TAU);
      c.fill();
      c.strokeStyle = "#f6e9c1b3";
      c.lineWidth = 0.65;
      c.beginPath();
      c.moveTo(L * 0.435, side * L * 0.026);
      c.quadraticCurveTo(L * 0.49, side * L * 0.07, L * 0.51, side * L * 0.046);
      c.stroke();
    }
    c.restore();
  }
  private body(f: Fish, L: number) {
    const c = this.ctx,
      pts: Array<{ x: number; y: number; r: number }> = [];
    const radii = [
      0.035, 0.105, 0.16, 0.165, 0.145, 0.105, 0.065, 0.026, 0.009,
    ];
    for (let i = 0; i < radii.length; i++) {
      const u = i / (radii.length - 1),
        bend =
          Math.sin(f.phase - u * 2.7) * u * u * L * 0.052 +
          f.turn * u * u * L * 0.07;
      pts.push({ x: (0.46 - u * 0.96) * L, y: bend, r: radii[i]! * L });
    }
    c.beginPath();
    c.moveTo(pts[0]!.x, pts[0]!.y - pts[0]!.r);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]!,
        before = pts[i - 1]!;
      c.bezierCurveTo(
        (before.x + p.x) / 2,
        before.y - before.r,
        (before.x + p.x) / 2,
        p.y - p.r,
        p.x,
        p.y - p.r,
      );
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i]!,
        before = pts[Math.min(pts.length - 1, i + 1)]!;
      c.bezierCurveTo(
        (before.x + p.x) / 2,
        before.y + before.r,
        (before.x + p.x) / 2,
        p.y + p.r,
        p.x,
        p.y + p.r,
      );
    }
    c.closePath();
  }
  private fin(L: number, side: number, color: string, night: boolean) {
    const c = this.ctx;
    c.fillStyle = color + "70";
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(
      -L * 0.03,
      side * L * 0.16,
      -L * 0.19,
      side * L * 0.27,
      -L * 0.26,
      side * L * 0.18,
    );
    c.quadraticCurveTo(-L * 0.24, side * L * 0.06, 0, 0);
    c.fill();
    c.strokeStyle = night ? "#e1eedf3f" : "#f3f1ce72";
    c.lineWidth = 0.55;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(
        -L * (0.05 + i * 0.025),
        side * L * 0.1,
        -L * (0.1 + i * 0.045),
        side * L * (0.14 + i * 0.014),
      );
      c.stroke();
    }
  }
  private lily(
    x: number,
    y: number,
    r: number,
    angle: number,
    t: number,
    flower: boolean,
    night: boolean,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(x, y + Math.sin(t * 0.5 + x) * 1.2);
    c.rotate(angle + Math.sin(t * 0.12 + x) * 0.035);
    c.save();
    c.translate(4, 6);
    c.fillStyle = "#061e2944";
    c.beginPath();
    c.ellipse(0, 0, r * 1.02, r * 0.9, 0, 0, TAU);
    c.fill();
    c.restore();
    const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    g.addColorStop(0, night ? "#588277" : "#8ba96b");
    g.addColorStop(0.6, night ? "#355b57" : "#4e8060");
    g.addColorStop(1, night ? "#204b49" : "#32675a");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, r, 0.21, TAU - 0.21);
    c.lineTo(0, 0);
    c.fill();
    c.strokeStyle = "#c2d68c44";
    c.lineWidth = 0.7;
    for (let i = 1; i <= 9; i++) {
      const a = (i * TAU) / 10;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(
        Math.cos(a - 0.2) * r * 0.55,
        Math.sin(a - 0.2) * r * 0.55,
        Math.cos(a) * r * 0.92,
        Math.sin(a) * r * 0.92,
      );
      c.stroke();
    }
    c.strokeStyle = "#cae1a02b";
    c.beginPath();
    c.arc(0, 0, r * 0.94, 0.25, TAU - 0.25);
    c.stroke();
    if (flower) {
      c.translate(-r * 0.05, -r * 0.22);
      const f = r * 0.5;
      for (let layer = 0; layer < 3; layer++) {
        const count = layer === 2 ? 7 : 9;
        const size = f * (1 - layer * 0.23);
        for (let i = 0; i < count; i++) {
          c.save();
          c.rotate((i * TAU) / count + layer * 0.4);
          const petal = c.createLinearGradient(0, 0, 0, -size);
          petal.addColorStop(0, night ? "#dfafbc" : "#f8ddd3");
          petal.addColorStop(1, night ? "#aa7f9e" : "#da8e9a");
          c.fillStyle = petal;
          c.beginPath();
          c.moveTo(0, 4);
          c.bezierCurveTo(
            -size * 0.43,
            -size * 0.2,
            -size * 0.42,
            -size * 0.73,
            0,
            -size,
          );
          c.bezierCurveTo(
            size * 0.42,
            -size * 0.73,
            size * 0.43,
            -size * 0.2,
            0,
            4,
          );
          c.fill();
          c.restore();
        }
      }
      c.fillStyle = "#dfb663";
      c.beginPath();
      c.arc(0, 0, f * 0.13, 0, TAU);
      c.fill();
    }
    c.restore();
  }
}
