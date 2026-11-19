/** Original, procedural fish markings. */
export type PondPalette = "jade" | "lagoon" | "midnight";
export type FishVariety = "kohaku" | "sanke" | "gold" | "ink";
export interface KoiPondOptions {
  /** Bounds the pond to this element. Omit for a viewport overlay. */
  root?: HTMLElement;
  fishCount?: number;
  size?: number;
  speed?: number;
  palette?: PondPalette;
  /** Water tint. Defaults to .88 inside a root, 0 for a viewport overlay. */
  waterOpacity?: number;
  lilies?: boolean;
  caustics?: boolean;
  interaction?: boolean;
  /** Omit to respect the system preference. */
  reducedMotion?: boolean;
  maxFPS?: 30 | 60;
  /** Reproducible initial fish positions and markings. */
  seed?: number;
  zIndex?: number;
}
export interface FishState {
  id: number;
  x: number;
  y: number;
  heading: number;
  length: number;
  variety: FishVariety;
}
export interface PondState {
  ready: boolean;
  paused: boolean;
  reducedMotion: boolean;
  destroyed: boolean;
  night: boolean;
  width: number;
  height: number;
  elapsed: number;
  food: number;
  fed: number;
  mode: "swim" | "gather" | "scatter";
  fish: FishState[];
}
export interface KoiPondController {
  /** Coordinates are CSS pixels from the pond's top-left; omit to feed centrally. */
  feed(x?: number, y?: number): void;
  gather(): void;
  scatter(): void;
  setNight(night: boolean): void;
  reset(): void;
  update(options: Partial<KoiPondOptions>): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  getState(): PondState;
}
