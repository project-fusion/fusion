/**
 * The round numbers a reader would infer inside a domain.
 *
 * **A gridline at an arbitrary number is worse than no gridline.** The point of
 * a rule across a chart is that a reader can name the level it sits at without
 * being told, so it has to land on a number a person would have picked: 0, 250,
 * 500, not 187.4. Dividing the domain into equal parts gives the second, and
 * that is what makes this arithmetic rather than a loop.
 *
 * The step is the power of ten below the rough interval, multiplied by whichever
 * of 1, 2, 5 or 10 lands nearest the count asked for. Those four because they
 * are the multipliers that keep every tick short in decimal, which is the whole
 * property being bought: 2.5 divides as evenly as 2 and reads as a worse number.
 *
 * **The count is a target and not a promise**, which is the usual surprise.
 * Asking for five over a domain of 0 to 1000 gives six (0, 200, ... 1000);
 * asking for five over 0 to 12 gives seven at a step of 2. Forcing the count
 * would mean forcing the step, which is the thing worth keeping round. A caller
 * that needs an exact number of rules wants equal division and not this.
 *
 * Ticks outside the domain are dropped rather than clamped, so nothing is drawn
 * off the end of the box and no two rules land on the same line.
 *
 * A pure function, for the reason `linear` gives beside it: it holds nothing,
 * subscribes to nothing, and can be called from `render`.
 */
export const ticks = (domain: readonly [number, number], count = 5): number[] => {
  const [low, high] = domain
  /* A flat domain has no levels to name. Zero rules rather than one, because a
     single rule lying exactly under a flat line is a rule nobody can see and a
     line a reader may take for the grid. */
  if (!Number.isFinite(low) || !Number.isFinite(high) || low === high || count < 1) {
    return []
  }

  const rough = (high - low) / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const eased = rough / magnitude
  const step = magnitude * (eased >= 7.5 ? 10 : eased >= 3 ? 5 : eased >= 1.5 ? 2 : 1)

  const found: number[] = []
  /* From the first multiple of the step at or above the floor, so the run is
     anchored to the number line rather than to wherever the data happens to
     start. Two charts of the same shape over different ranges then draw rules
     at the same levels, which is what makes them comparable at a glance. */
  for (let at = Math.ceil(low / step) * step; at <= high; at += step) {
    /* Floating point makes 0.30000000000000004 out of three tenths, and a
       gridline is a number a reader sees. Rounded to the step's own precision,
       which is as fine as any tick can legitimately be. */
    const places = Math.max(0, -Math.floor(Math.log10(step)))
    found.push(Number(at.toFixed(places)))
  }
  return found
}
