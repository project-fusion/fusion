'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './x-ray.module.css'

/** The tag of every Helix element in the document, in the light tree. */
const helixTags = (): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const element of document.body.querySelectorAll('*')) {
    const tag = element.localName
    if (tag.startsWith('helix-')) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return counts
}

/** The innermost Helix element under the pointer, inside shadow roots too. */
const helixAt = (event: PointerEvent): Element | undefined =>
  event
    .composedPath()
    .find((node): node is Element => node instanceof Element && node.localName.startsWith('helix-'))

interface Hovered {
  box: DOMRect
  tag: string
}

/**
 * Outlines every Helix element on the page, and names the one under the
 * pointer.
 *
 * **The page is the proof.** "Each control in it is a custom element" is a
 * claim about one panel, and this shows it holds for the whole page: the
 * navigation, the cards, the text, the charts, and the theme button are all
 * Helix elements.
 *
 * **Nothing on the page is changed to draw it.** The outlines come from one
 * stylesheet listing the tags found, because CSS has no selector for "any tag
 * that starts with `helix-`", and an attribute on every element would run each
 * one's attribute handling for a decoration. The name and the highlight are
 * fixed boxes over the page, placed from the hovered element's rectangle.
 *
 * **Escape turns it off**, as does the button in the status bar, so a reader
 * who turned it on by accident is one key from the page they had.
 */
export function XRay(): React.ReactElement {
  const [on, setOn] = useState(false)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [hovered, setHovered] = useState<Hovered | undefined>()

  const close = useCallback(() => {
    setOn(false)
    setHovered(undefined)
  }, [])

  /* The outline rule, rewritten whenever the set of tags on the page changes:
     a menu that opens or a view that mounts brings tags the first count did
     not see. */
  useEffect(() => {
    if (!on) {
      return
    }
    const style = document.createElement('style')
    style.dataset.xray = ''
    document.head.append(style)

    const draw = (): void => {
      const found = helixTags()
      setCounts(found)
      const selector = [...found.keys()].join(',\n')
      style.textContent = selector
        ? `${selector} { outline: 1px solid color-mix(in oklab, var(--helix-color-primary) 55%, transparent); outline-offset: -1px; }`
        : ''
    }
    draw()

    let pending = 0
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(pending)
      pending = requestAnimationFrame(draw)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const move = (event: PointerEvent): void => {
      const element = helixAt(event)
      setHovered(
        element ? { box: element.getBoundingClientRect(), tag: element.localName } : undefined,
      )
    }
    const clear = (): void => setHovered(undefined)
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('scroll', clear, { capture: true, passive: true })
    document.addEventListener('keydown', key)

    return () => {
      cancelAnimationFrame(pending)
      observer.disconnect()
      document.removeEventListener('pointermove', move)
      document.removeEventListener('scroll', clear, { capture: true })
      document.removeEventListener('keydown', key)
      style.remove()
    }
  }, [on, close])

  const total = [...counts.values()].reduce((sum, one) => sum + one, 0)

  return (
    <>
      <button
        aria-pressed={on}
        className={styles.toggle}
        data-link="quiet"
        onClick={() => setOn((was) => !was)}
        type="button"
      >
        {on ? 'Hide the outlines' : 'Outline the Helix elements'}
      </button>

      {/* **The count, said once for a screen reader.** The region is in the
          page from the start, empty, so filling it is an announcement:
          a region that appears already full is not reliably read. */}
      <span aria-live="polite" data-hidden-visually role="status">
        {on ? `${total.toLocaleString('en-US')} Helix elements outlined.` : ''}
      </span>

      {/* **Portaled to the body, or every fixed box lands in the wrong place.**
          The toggle sits in a glass card, and `backdrop-filter` makes that
          card the containing block of anything fixed inside it: the highlight
          drew 87px right and 61px below the element it named. */}
      {on
        ? createPortal(
            <>
              {hovered ? (
                <>
                  <div
                    aria-hidden="true"
                    className={styles.highlight}
                    style={{
                      blockSize: hovered.box.height,
                      inlineSize: hovered.box.width,
                      insetBlockStart: hovered.box.top,
                      insetInlineStart: hovered.box.left,
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className={styles.name}
                    data-below={hovered.box.top < 28 || undefined}
                    style={{
                      insetBlockStart: hovered.box.top < 28 ? hovered.box.bottom : hovered.box.top,
                      insetInlineStart: Math.max(0, hovered.box.left),
                    }}
                  >
                    {`<${hovered.tag}>`}
                  </div>
                </>
              ) : null}

              <div className={styles.status}>
                <span>
                  {total.toLocaleString('en-US')} Helix elements of {counts.size} kinds on this
                  page. <span className={styles.hint}>Point at one to see its name.</span>
                </span>
                <button className={styles.close} data-link="quiet" onClick={close} type="button">
                  Hide the outlines
                </button>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
