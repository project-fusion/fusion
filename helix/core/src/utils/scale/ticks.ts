/** The round step `ticks` rules at, from the domain's span and the count asked for. */
const stepOf = (low: number, high: number, count: number): number => {
  const rough = (high - low) / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const eased = rough / magnitude
  return magnitude * (eased >= 7.5 ? 10 : eased >= 3 ? 5 : eased >= 1.5 ? 2 : 1)
}

/** A value rounded to a step's own precision, which is as fine as any tick can be. */
const toStep = (value: number, step: number): number =>
  Number(value.toFixed(Math.max(0, -Math.floor(Math.log10(step)))))

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

  const step = stepOf(low, high, count)

  const found: number[] = []
  /* From the first multiple of the step at or above the floor, so the run is
     anchored to the number line rather than to wherever the data happens to
     start. Two charts of the same shape over different ranges then draw rules
     at the same levels, which is what makes them comparable at a glance.
   *
     Counted in whole steps and compared with a millionth of a step to spare,
     because a sum of steps drifts: six steps of 0.2 come to 1.2000000000000002,
     and a top that `headroom` put exactly on a level lost its rule to that. */
  const first = Math.ceil(low / step - 1e-9)
  for (let index = first; index * step <= high + step * 1e-6; index += 1) {
    /* Floating point makes 0.30000000000000004 out of three tenths, and a
       gridline is a number a reader sees. Rounded to the step's own precision,
       which is as fine as any tick can legitimately be. */
    found.push(toStep(index * step, step))
  }
  return found
}

/**
 * A domain whose top is raised to a level `ticks` rules, with room above the
 * highest reading, and whose floor is lowered to one, with room below the
 * lowest, unless the floor is zero.
 *
 * **A peak drawn on the plot's top edge reads as cut off**, and its top rule is
 * the box's edge rather than a number. Measured on Line Chart's sessions
 * example before this: 1,410 at the top edge, 0px above it, and the highest
 * numbered level, 1,400, under the peak. The top is raised to the first level
 * at least a twentieth of the span above the highest reading, so the peak
 * stands clear of the edge and the top edge is a numbered level. A peak exactly
 * on a level takes the next one.
 *
 * **The floor is the same edge turned over.** Left where the data put it, the
 * same example's lowest reading, 1,180, lay on the bottom edge under the lowest
 * rule, 1,200, and a diverging bar of -14,000 ran past the last numbered level,
 * -10,000. The floor is lowered to the first level at least a twentieth of the
 * span below the lowest reading. **A floor of zero stays**, since zero is the
 * baseline the drawing stands on, and a floor above zero is lowered no further
 * than zero.
 *
 * The step is worked out again from the widened domain until it holds, since
 * widening it can widen the step: 0 to 140 rules every 20, and 0 to 160 every
 * 50, which would leave 160 off the scale. The result is 0 to 150.
 *
 * A top at zero stays, for the reason the floor does, and a flat domain comes
 * back as it went in: it has no levels.
 */
export const headroom = (domain: readonly [number, number], count = 5): [number, number] => {
  const [low, high] = domain
  if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high || count < 1) {
    return [low, high]
  }
  const room = (high - low) / 20
  const [above, below] = [high === 0 ? 0 : high + room, low === 0 ? 0 : low - room]
  let [floor, top] = [low, high]
  let held = 0
  for (let round = 0; round < 8; round += 1) {
    const step = stepOf(floor, top, count)
    if (step === held) {
      break
    }
    held = step
    top = high === 0 ? 0 : toStep(Math.ceil(above / step) * step, step)
    floor = low === 0 ? 0 : toStep(Math.floor(below / step) * step, step)
    if (low > 0 && floor < 0) {
      floor = 0
    }
  }
  return [floor, top]
}
