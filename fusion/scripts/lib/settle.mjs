/**
 * Waiting for an example to stop changing before it is photographed.
 *
 * Shared by the checks that compare two renders of one example, because a
 * comparison is only as honest as the moment it is taken at, and two harnesses
 * waiting in two ways would disagree about the same page. Each wait records the
 * measurement that put it here.
 */

/**
 * Waits for every element on the page to be defined, and names the tags nothing
 * defines.
 *
 * `prefix` limits the wait to the tags that start with it, for a page whose
 * framework writes hyphenated tags of its own that are never defined, such as
 * Angular's `app-root`.
 */
export const awaitUpgrades = (tab, prefix = '') =>
  tab.evaluate(async (prefix) => {
    /* **Bounded, because `whenDefined` on a tag nothing registers never
       settles.** Unbounded, an example naming an element the bundle does not
       define hangs the run outright: no output, no failure, and no way to tell a
       slow machine from a stuck one. This gives up and says which tags it was
       waiting for. Five seconds is far past any real upgrade and far short of
       noticing it by hand. */
    const pending = [...document.querySelectorAll(':not(:defined)')]
      .map((one) => one.localName)
      .filter((tag) => tag.startsWith(prefix))
    await Promise.race([
      Promise.all([...new Set(pending)].map((tag) => customElements.whenDefined(tag))),
      new Promise((done) => setTimeout(done, 5000)),
    ])
    return [...new Set(pending)].filter((tag) => customElements.get(tag) === undefined)
  }, prefix)

/**
 * Waits for the page to settle: three frames, fonts, every Helix element's own
 * settle signal, then scroll offsets and boxes held still for three frames.
 */
export const awaitStill = (tab) =>
  tab.evaluate(async () => {
    /* Three frames rather than the two `check:spec:visual` waits. React mounts in a
       task of its own and an example that sets state in an effect, which the
       timestamped ones do, needs the render that follows it. */
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))),
    )
    await document.fonts.ready

    /* **Every Helix element's own settle signal, which is the one the library
       publishes for exactly this.** `HelixElement` resolves `whenSettled` from
       the frame after `firstUpdated`, once its first style resolution is done
       and the transition suppression lifts; `@fusion.dev/helix-testing` already waits on
       it for the same reason. Without it the comparison reads a stopwatch:
       `pagination/footer` reported 419 pixels on one run and 842 on the next
       from the same two files.

       Bounded, because an element that never settles must not hang the sweep. */
    await Promise.race([
      Promise.all(
        [...document.querySelectorAll('*')]
          .map((one) => one.whenSettled)
          .filter((one) => one instanceof Promise),
      ),
      new Promise((done) => setTimeout(done, 5000)),
    ])

    /* **And wait for scrolling to stop, which `animations: 'disabled'` does not
       do.** Playwright cancels CSS animations and fast-forwards transitions; a
       programmatic `scrollTo({ behavior: 'smooth' })` is neither, so a component
       that scrolls itself on the first update is caught wherever it happened to
       be. Measured on `carousel/controlled`, which scrolls to its opening slide:
       three runs of the same page reported `scrollLeft` of 135, 184 and 239. The
       comparison was reading a stopwatch, not a difference between two examples.

       Polled rather than waited on `scrollend`, which does not fire for a scroll
       that never started, and bounded so a component scrolling forever cannot
       hang the run. */
    /* **Geometry as well as scroll, because the page is still moving after
       both.** A nested control that measures itself settles a frame or two after
       everything this already waits for, and the flex row it sits in
       redistributes when it does. Measured on `pagination/footer`, whose width
       came out 272, 273 and 275 across three runs of the *same* file: both sides
       were unstable, so the comparison was reading whichever frame it caught
       rather than a difference between two examples.

       One signal covering scroll offsets and boxes together, held for three
       frames and bounded, so a component that never stops moving reports a
       difference instead of hanging. */
    const shape = () =>
      [...document.querySelectorAll('*')]
        .map((one) => {
          const box = one.getBoundingClientRect()
          return `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)},${one.scrollLeft},${one.scrollTop}`
        })
        .join('|')
    let last = shape()
    for (let still = 0, spent = 0; still < 3 && spent < 120; spent += 1) {
      await new Promise((done) => requestAnimationFrame(done))
      const now = shape()
      still = now === last ? still + 1 : 0
      last = now
    }
  })
