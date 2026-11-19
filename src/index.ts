import { resolveConfig, type PondConfig } from "./config.js";
import { PondModel } from "./model.js";
import { PondRenderer } from "./render.js";
import type { KoiPondOptions, KoiPondController, PondState } from "./types.js";
export type {
  KoiPondOptions,
  KoiPondController,
  PondState,
  FishState,
  FishVariety,
  PondPalette,
} from "./types.js";
export function createKoiPond(options: KoiPondOptions = {}): KoiPondController {
  return new KoiPond(resolveConfig(options));
}
class KoiPond implements KoiPondController {
  private config: PondConfig;
  private model: PondModel;
  private canvas: HTMLCanvasElement | undefined;
  private renderer: PondRenderer | undefined;
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private paused = false;
  private destroyed = false;
  private visible = true;
  private dpr = 1;
  private motion = false;
  private manualUntil = 0;
  private cleanups: Array<() => void> = [];
  private resize: ResizeObserver | undefined;
  private intersection: IntersectionObserver | undefined;
  private media: MediaQueryList | undefined;
  constructor(config: PondConfig) {
    this.config = config;
    this.model = new PondModel(config);
    if (typeof window === "undefined" || typeof document === "undefined")
      return;
    this.media = matchMedia("(prefers-reduced-motion: reduce)");
    this.motion = config.reducedMotion ?? this.media.matches;
    this.canvas = document.createElement("canvas");
    this.canvas.dataset.fluriKoi = "";
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.cssText =
      "position:fixed;display:block;pointer-events:none;margin:0;padding:0;border:0;box-sizing:border-box;max-width:none;max-height:none;contain:strict;";
    this.canvas.style.zIndex = String(config.zIndex);
    (config.root ?? document.body).append(this.canvas);
    try {
      this.renderer = new PondRenderer(this.canvas, config);
    } catch {
      this.canvas.remove();
      this.canvas = undefined;
      return;
    }
    this.geometry(true);
    this.model.reset();
    this.draw();
    this.listen(window, "resize", () => this.geometry());
    this.listen(
      window,
      "scroll",
      () => {
        this.geometry();
        this.draw();
      },
      true,
    );
    if (window.visualViewport) {
      this.listen(window.visualViewport, "resize", () => this.geometry());
      this.listen(window.visualViewport, "scroll", () => this.geometry());
    }
    this.listen(document, "visibilitychange", () => {
      this.last = 0;
      if (!document.hidden) this.wake();
      else this.cancel();
    });
    this.listen(this.media, "change", () => {
      this.motion = this.config.reducedMotion ?? this.media!.matches;
      this.last = 0;
      this.draw();
      this.wake();
    });
    this.listen(document, "pointerdown", (event) => {
      if (!this.config.interaction || this.destroyed || this.paused) return;
      const e = event as PointerEvent;
      if (e.button !== 0) return;
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest(
          'a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]',
        )
      )
        return;
      const rect = this.bounds();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        return;
      this.feed(
        ((e.clientX - rect.left) * this.model.width) / Math.max(1, rect.width),
        ((e.clientY - rect.top) * this.model.height) / Math.max(1, rect.height),
      );
    });
    this.observe();
    this.wake();
  }
  private listen(
    target: EventTarget,
    type: string,
    fn: (event: Event) => void,
    capture = false,
  ) {
    target.addEventListener(type, fn, { passive: true, capture });
    this.cleanups.push(() => target.removeEventListener(type, fn, { capture }));
  }
  private bounds() {
    return (
      this.config.root?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        right: innerWidth,
        bottom: innerHeight,
        width: innerWidth,
        height: innerHeight,
      }
    );
  }
  private geometry(force = false) {
    const canvas = this.canvas,
      renderer = this.renderer;
    if (!canvas || !renderer || this.destroyed) return;
    const r = this.bounds();
    const rootStyle = this.config.root
      ? getComputedStyle(this.config.root)
      : undefined;
    const local = !!this.config.root && rootStyle?.position !== "static";
    const w = Math.max(1, local ? this.config.root!.clientWidth : r.width);
    const h = Math.max(1, local ? this.config.root!.clientHeight : r.height);
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.position = local ? "absolute" : "fixed";
    canvas.style.left = (local ? 0 : r.left) + "px";
    canvas.style.top = (local ? 0 : r.top) + "px";
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.style.borderRadius = rootStyle?.borderRadius ?? "0";
    // Positioned roots use normal browser layout, so native scrolling and
    // ancestor transforms move the canvas and its host in the same paint.
    if (this.config.root && !local) {
      const actual = canvas.getBoundingClientRect(),
        sx = actual.width / w || 1,
        sy = actual.height / h || 1;
      if (
        Math.abs(actual.left - r.left) > 0.1 ||
        Math.abs(actual.top - r.top) > 0.1 ||
        Math.abs(sx - 1) > 0.001 ||
        Math.abs(sy - 1) > 0.001
      ) {
        canvas.style.left = r.left + (r.left - actual.left) / sx + "px";
        canvas.style.top = r.top + (r.top - actual.top) / sy + "px";
        canvas.style.width = w / sx + "px";
        canvas.style.height = h / sy + "px";
      }
    }
    if (
      force ||
      Math.abs(this.model.width - w) > 0.1 ||
      Math.abs(this.model.height - h) > 0.1 ||
      nextDpr !== this.dpr
    ) {
      this.model.resize(w, h);
      this.dpr = nextDpr;
      renderer.resize(w, h, this.dpr);
      this.draw();
    }
  }
  private observe() {
    this.resize?.disconnect();
    this.intersection?.disconnect();
    if (this.config.root) {
      this.resize = new ResizeObserver(() => this.geometry());
      this.resize.observe(this.config.root);
      this.intersection = new IntersectionObserver((entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        if (this.visible) {
          this.last = 0;
          this.geometry();
          this.wake();
        } else this.cancel();
      });
      this.intersection.observe(this.config.root);
    } else this.visible = true;
  }
  private draw() {
    this.renderer?.draw(this.model);
  }
  private cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = 0;
    this.accumulator = 0;
  }
  private wake() {
    if (
      !this.renderer ||
      this.raf ||
      this.destroyed ||
      this.paused ||
      document.hidden ||
      !this.visible
    )
      return;
    if (this.motion && performance.now() > this.manualUntil) {
      this.draw();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  }
  private frame = (time: number) => {
    this.raf = 0;
    if (this.destroyed || this.paused || document.hidden || !this.visible)
      return;
    const elapsed = this.last
      ? Math.min(0.12, (time - this.last) / 1000)
      : 1 / 60;
    this.last = time;
    this.accumulator += elapsed;
    if (this.accumulator >= 1 / this.config.maxFPS - 0.001) {
      for (
        let remaining = Math.min(0.12, this.accumulator);
        remaining > 1e-6;
        remaining -= 1 / 60
      )
        this.model.step(Math.min(1 / 60, remaining));
      this.accumulator = 0;
      this.draw();
    }
    this.wake();
  };
  private action(fn: () => void) {
    if (this.destroyed) return;
    fn();
    this.manualUntil =
      typeof performance === "undefined" ? 0 : performance.now() + 6500;
    this.draw();
    this.wake();
  }
  feed(x?: number, y?: number) {
    this.action(() => this.model.feed(x, y));
  }
  gather() {
    this.action(() => this.model.gather());
  }
  scatter() {
    this.action(() => this.model.scatter());
  }
  setNight(night: boolean) {
    if (typeof night !== "boolean")
      throw new TypeError("setNight requires a boolean.");
    this.action(() => {
      this.model.night = night;
    });
  }
  reset() {
    this.action(() => {
      this.model.reset();
    });
  }
  update(options: Partial<KoiPondOptions>) {
    if (this.destroyed) return;
    const next = resolveConfig(options, this.config),
      reset =
        next.fishCount !== this.config.fishCount ||
        next.size !== this.config.size ||
        next.seed !== this.config.seed;
    const reroot = next.root !== this.config.root;
    this.config = next;
    this.model.config = next;
    if (this.renderer) this.renderer.config = next;
    if (this.canvas) {
      this.canvas.style.zIndex = String(next.zIndex);
      if (reroot) {
        (next.root ?? document.body).append(this.canvas);
        this.observe();
      }
    }
    this.motion = next.reducedMotion ?? this.media?.matches ?? false;
    this.geometry();
    if (reset) this.model.reset();
    if ("palette" in options) this.model.night = next.palette === "midnight";
    this.draw();
    this.wake();
  }
  pause() {
    this.paused = true;
    this.cancel();
  }
  resume() {
    if (this.destroyed) return;
    this.paused = false;
    this.last = 0;
    this.wake();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (typeof cancelAnimationFrame !== "undefined") this.cancel();
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.resize?.disconnect();
    this.intersection?.disconnect();
    this.canvas?.remove();
    this.canvas = undefined;
    this.renderer = undefined;
    this.model.food = [];
    this.model.ripples = [];
  }
  getState(): PondState {
    return {
      ready: !!this.renderer,
      paused: this.paused,
      reducedMotion: this.motion,
      destroyed: this.destroyed,
      night: this.model.night,
      width: this.model.width,
      height: this.model.height,
      elapsed: this.model.elapsed,
      food: this.model.food.length,
      fed: this.model.fed,
      mode: this.model.mode,
      fish: this.model.stateFish(),
    };
  }
}
