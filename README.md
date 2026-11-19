<p align="center"><img src="https://fluri.xyz/previews/koi.webp" width="100%" alt="Original cream, coral and gold koi swimming through jade water beneath flowering lilies" /></p>

# Koi Pond

**A little stillness for the web.** Articulated koi turn and school beneath water lilies. Tap the water and they find the crumbs; each crumb really gets eaten. Switch to moonlit water, bring the shoal together, or make a small splash.

[Live playground](https://fluri.xyz/koi-pond/) · [Fluri collection](https://fluri.xyz/) · [Watch the motion](https://fluri.xyz/previews/koi.mp4)

```sh
npm i @fluritheme/koi-pond
```

```ts
import { createKoiPond } from "@fluritheme/koi-pond";

// A bounded pool: give the container a visible width and height; position: relative is recommended.
const pond = createKoiPond({
  root: document.querySelector<HTMLElement>("#pond")!,
  fishCount: 8,
  palette: "jade",
  size: 1.15,
});

// The canvas appears and the fish swim immediately.
pond.feed();
// On unmount:
pond.destroy();
```

There are **no runtime dependencies, downloaded images, external fonts, videos, storage, analytics or activation requests** in the engine. Every fish, fin, marking, lily and reflection is drawn in code. The demo page uses its own typography; the package adds no global styles or UI controls.

## A living scene

- Four original markings: cream/coral Kohaku, Sanke, metallic gold, and ink koi.
- A bending spine, flowing scalloped tail, independent pectoral fins, gills, eyes, barbels, translucent membranes and submerged shadows.
- Damped steering, separation, food pursuit, actual consumption, short gather/scatter behaviours and natural roaming.
- Layered water tint, riverbed pebbles, soft caustic lines, small light glints, expanding feed ripples and veined lily pads with multi-layer flowers.
- Afternoon jade, blue lagoon and moonlit water. Colour changes are immediate and do not reload the scene.
- Bounded CSS-pixel simulation coordinates and measured canvas placement: native scrolling does not move fish through their local world.

## Viewport overlay

Omit `root` to float fish over an existing page. Water tint defaults to zero for this mode, so it preserves your page background. The canvas is fixed to the viewport, click-through and hidden from assistive technology; it never hijacks scrolling.

```ts
const pond = createKoiPond({
  fishCount: 6,
  size: 0.85,
  waterOpacity: 0,
  lilies: false,
  zIndex: 100,
});
```

The default passive pointer listener feeds only ordinary, primary-pointer taps inside the pond. Taps on links, buttons, form fields, summaries, editable content and role-buttons are ignored. Set `interaction: false` if you want feeding only through your own controls. No interaction is cancelled with `preventDefault()`.

## Options

| Option          | Default                          | Accepted values                                                                       |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| `root`          | viewport overlay                 | An `HTMLElement`; give bounded roots a width, height and ideally `position: relative` |
| `fishCount`     | `8`                              | `3`–`18`, rounded and bounded                                                         |
| `size`          | `1`                              | `.5`–`1.6`                                                                            |
| `speed`         | `.8`                             | `.2`–`1.6`                                                                            |
| `palette`       | `'jade'`                         | `'jade'`, `'lagoon'`, `'midnight'`                                                    |
| `waterOpacity`  | `.88` for roots; `0` for overlay | `0`–`1`                                                                               |
| `lilies`        | `true`                           | Boolean                                                                               |
| `caustics`      | `true`                           | Boolean                                                                               |
| `interaction`   | `true`                           | Boolean                                                                               |
| `reducedMotion` | system preference                | Boolean override                                                                      |
| `maxFPS`        | `60`                             | `30` or `60`                                                                          |
| `seed`          | `81723`                          | Integer `0`–`4294967295`, deterministic start                                         |
| `zIndex`        | `100`                            | Integer `0`–`2147483000`, canvas only                                                 |

Unknown properties, accessors, custom prototypes, non-finite values, invalid strings and non-boolean flags are rejected. Finite numeric ranges are bounded. Never put credentials or private data in theme configuration.

## Controller

```ts
pond.feed(); // Nine small crumbs at the pond centre.
pond.feed(320, 180); // CSS pixels LOCAL to the pond's top-left.
pond.gather(); // A short, naturally steering shoal formation.
pond.scatter(); // A brief burst away from the centre.
pond.setNight(true); // The same scene beneath moonlit water.
pond.update({ speed: 0.6, fishCount: 10 });
pond.pause();
pond.resume();
pond.reset(); // Recreates the deterministic initial scene.
pond.getState(); // Detached counters and fish snapshots.
pond.destroy(); // Idempotent, complete cleanup.
```

`getState()` reports `ready`, `paused`, `reducedMotion`, `destroyed`, `night`, `width`, `height`, `elapsed`, `food`, `fed`, `mode` and `fish`. Fish snapshots contain ID, local x/y, heading, length and variety. Modifying the snapshot cannot modify the simulation. These local counters are not visitor analytics.

Changes to `fishCount`, `size` or `seed` reset the fish layout. Other changes preserve the scene. `reset()` returns lighting to the selected palette's initial setting. `setNight(false)` returns a midnight palette to jade afternoon. `feed()` does not promise every crumb gets eaten: crumbs expire after 24 seconds.

## React

Create the effect in an effect and always clean it up. Importing the package during server rendering is safe; creating a pond without a DOM returns an inert controller whose `ready` state is false.

```tsx
import { useEffect, useRef } from "react";
import { createKoiPond } from "@fluritheme/koi-pond";

export function Koi() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current) return;
    const pond = createKoiPond({ root: root.current, palette: "jade" });
    return () => pond.destroy();
  }, []);
  return (
    <div
      ref={root}
      style={{ position: "relative", height: 520, borderRadius: 32 }}
    />
  );
}
```

For static content, keep useful page text and controls in normal HTML. The effect is decorative, and its canvas intentionally does not trap focus or expose hundreds of moving objects to a screen reader. Add labelled native buttons for deliberate commands.

## Performance and accessibility

Canvas backing resolution is capped at device-pixel ratio 2. Fish, food and ripple counts are bounded. Offscreen roots and hidden documents suspend animation; resizing scales the local scene. Positioned roots use absolute browser layout, so the canvas scrolls and transforms with the container in the same paint. Static roots use a measured fixed fallback; prefer `position: relative` for the most precise native scrolling. Reduced-motion users get an immediate still pond, with short animation windows only after explicit commands. All event listeners, observers and animation callbacks are removed by `destroy()`; existing body/root styles remain intact.

No sound is played. The package performs no network requests and does not write cookies or local storage. Hosted Fluri installation verification and optional analytics are platform features governed by the platform terms, separate from this standalone engine.

## Licence

Current releases use the **Fluri Themes Commercial License**, not MIT. Private non-production evaluation is permitted. Production use and client delivery require the applicable Fluri licence. [Current offers and terms](https://fluri.xyz/legal/license/) · [Package licensing notes](./LICENSING.md).

`LICENSE-MIT-LEGACY` records historical licensing boundaries; it does not offer an MIT option for this package. All runtime artwork is original, with no third-party runtime dependencies.
