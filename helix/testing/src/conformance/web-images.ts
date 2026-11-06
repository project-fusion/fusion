import { outcomeOf } from './images.js'

/** A one-pixel GIF, which a browser loads. */
const LOADS = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** A PNG that holds no picture, which a browser fails to decode. */
const FAILS = 'data:image/png;base64,AAAA'

/** The fake pictures written and not yet answered with `load` or `error`. */
const waiting = new Set<Promise<void>>()

/**
 * Keeps a picture given a fake source that loads or fails waiting until it
 * answers. A data URI decodes after a frame of the page in some browsers
 * (Chromium on CI), so a record taken after one frame would read it loading.
 * A picture taken off the page before it answers never does, so the wait
 * ends after a second all the same.
 */
const heard = (picture: Element): void => {
  const answered = new Promise<void>((done) => {
    picture.addEventListener('load', () => done(), { once: true })
    picture.addEventListener('error', () => done(), { once: true })
    setTimeout(done, 1000)
  })
  waiting.add(answered)
  void answered.then(() => waiting.delete(answered))
}

/** Waits until every fake picture written so far has loaded or failed. */
export const picturesAnswered = async (): Promise<void> => {
  await Promise.all([...waiting])
}

/**
 * Has every `<img>` the page writes a fake source on answer as it says,
 * until the function it returns puts the page back. **It catches the
 * attribute**, as a template writes `src`: a source that loads or fails is
 * written as a picture that does, and one that hangs is not written, so the
 * picture never starts and its element stays loading.
 */
export const fakeImages = (): (() => void) => {
  const written = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (this: Element, name: string, value: string): void {
    const outcome =
      name === 'src' && this instanceof HTMLImageElement ? outcomeOf(value) : undefined
    if (outcome === 'hangs') {
      this.removeAttribute('src')
      return
    }
    if (outcome !== undefined) {
      heard(this)
    }
    written.call(this, name, outcome === undefined ? value : outcome === 'loads' ? LOADS : FAILS)
  }
  return () => {
    Element.prototype.setAttribute = written
  }
}
