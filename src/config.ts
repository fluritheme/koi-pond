import type { KoiPondOptions, PondPalette } from "./types.js";
export interface PondConfig {
  root: HTMLElement | undefined;
  fishCount: number;
  size: number;
  speed: number;
  palette: PondPalette;
  waterOpacity: number;
  lilies: boolean;
  caustics: boolean;
  interaction: boolean;
  reducedMotion: boolean | undefined;
  maxFPS: 30 | 60;
  seed: number;
  zIndex: number;
}
const keys = new Set([
  "root",
  "fishCount",
  "size",
  "speed",
  "palette",
  "waterOpacity",
  "lilies",
  "caustics",
  "interaction",
  "reducedMotion",
  "maxFPS",
  "seed",
  "zIndex",
]);
export const clamp = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, x));
export function resolveConfig(
  options: Partial<KoiPondOptions> = {},
  previous?: PondConfig,
): PondConfig {
  if (
    typeof options !== "object" ||
    options === null ||
    Array.isArray(options) ||
    (Object.getPrototypeOf(options) !== Object.prototype &&
      Object.getPrototypeOf(options) !== null)
  )
    throw new TypeError("Koi Pond options must be a plain object.");
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== "string" || !keys.has(key))
      throw new TypeError("Unknown Koi Pond option: " + String(key));
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (!descriptor || !("value" in descriptor))
      throw new TypeError("Koi Pond options cannot contain accessors.");
    if (descriptor.value === null)
      throw new TypeError("Koi Pond options cannot be null.");
  }
  const root = "root" in options ? options.root : previous?.root;
  if (
    root !== undefined &&
    (typeof HTMLElement === "undefined" || !(root instanceof HTMLElement))
  )
    throw new TypeError("root must be an HTMLElement.");
  const numeric = (
    key: "fishCount" | "size" | "speed" | "waterOpacity" | "seed" | "zIndex",
    fallback: number,
    min: number,
    max: number,
  ) => {
    const value =
      options[key] !== undefined ? options[key] : (previous?.[key] ?? fallback);
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new TypeError(key + " must be a finite number.");
    return clamp(value, min, max);
  };
  const boolean = (
    key: "lilies" | "caustics" | "interaction",
    fallback: boolean,
  ) => {
    const value =
      options[key] !== undefined ? options[key] : (previous?.[key] ?? fallback);
    if (typeof value !== "boolean")
      throw new TypeError(key + " must be boolean.");
    return value;
  };
  const palette = options.palette ?? previous?.palette ?? "jade";
  if (!["jade", "lagoon", "midnight"].includes(palette))
    throw new TypeError("Invalid pond palette.");
  const maxFPS = options.maxFPS ?? previous?.maxFPS ?? 60;
  if (maxFPS !== 30 && maxFPS !== 60)
    throw new TypeError("maxFPS must be 30 or 60.");
  const reducedMotion = options.reducedMotion ?? previous?.reducedMotion;
  if (reducedMotion !== undefined && typeof reducedMotion !== "boolean")
    throw new TypeError("reducedMotion must be boolean.");
  return {
    root,
    fishCount: Math.round(numeric("fishCount", 8, 3, 18)),
    size: numeric("size", 1, 0.5, 1.6),
    speed: numeric("speed", 0.8, 0.2, 1.6),
    palette,
    waterOpacity: numeric("waterOpacity", root ? 0.88 : 0, 0, 1),
    lilies: boolean("lilies", true),
    caustics: boolean("caustics", true),
    interaction: boolean("interaction", true),
    reducedMotion,
    maxFPS,
    seed: Math.floor(numeric("seed", 81723, 0, 4294967295)),
    zIndex: Math.floor(numeric("zIndex", 100, 0, 2147483000)),
  };
}
