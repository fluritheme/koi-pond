import { createKoiPond } from "./src/index.js";
import type { KoiPondController } from "./src/types.js";
declare global {
  interface Window {
    koi: KoiPondController;
  }
}
window.koi = createKoiPond({
  root: document.getElementById("pond")!,
  fishCount: 8,
  size: 1.15,
  seed: 87431,
});
const button = (id: string, fn: () => void) =>
  document.getElementById(id)!.addEventListener("click", fn);
button("feed", () => window.koi.feed());
button("gather", () => window.koi.gather());
button("scatter", () => window.koi.scatter());
button("night", () => {
  const night = !window.koi.getState().night;
  window.koi.setNight(night);
  document.getElementById("night")!.setAttribute("aria-pressed", String(night));
  document.getElementById("night")!.textContent = night
    ? "Afternoon water"
    : "Moonlit water";
  document.getElementById("lighting")!.textContent = night
    ? "MOONRISE / QUIET WATER"
    : "AFTERNOON / JADE WATER";
});
button("pause", () => {
  const paused = !window.koi.getState().paused;
  if (paused) window.koi.pause();
  else window.koi.resume();
  document
    .getElementById("pause")!
    .setAttribute("aria-pressed", String(paused));
  document.getElementById("pause")!.textContent = paused ? "Resume" : "Pause";
});
setInterval(() => {
  document.getElementById("fed")!.textContent = String(
    window.koi.getState().fed,
  );
}, 500);
