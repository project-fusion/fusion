'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react'

/** How long the pointer rests on a mark before its card opens, when no card is open. */
const REST = 140

/** How long a card stays after the pointer leaves it and its mark. */
const LINGER = 220

/**
 * Moving to another mark within this long after a card closed opens its card
 * at once, as `Tooltip` does, so scanning a row is not a wait at every mark.
 */
const WARM = 300

/**
 * From the middle of a mark to the corner of its card, across and down: half
 * a mark and a gap.
 */
const REACH = 12

/** The space a card keeps from the edges of the viewport. */
const MARGIN = 16

const GLIDE: KeyframeAnimationOptions = {
  duration: 240,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
}

interface Open {
  card: HTMLElement
  trigger: HTMLButtonElement
}

const TRIGGER = '[data-coverage-trigger]'

const triggerOf = (target: EventTarget | null): HTMLButtonElement | null =>
  target instanceof Element ? target.closest<HTMLButtonElement>(TRIGGER) : null

/**
 * Makes a change to a card without its fade. A card handing over to another
 * is swapped in one frame, so two cards never show at once, and the glide is
 * what carries the eye.
 */
const instantly = (card: HTMLElement, change: () => void): void => {
  card.style.transition = 'none'
  change()
  requestAnimationFrame(() => card.style.removeProperty('transition'))
}

const position = (trigger: HTMLElement): { col: number; row: number } => ({
  col: Number(trigger.dataset.coverageCol),
  row: Number(trigger.dataset.coverageRow),
})

/**
 * The cards over the coverage table: one per mark, each listing the elements
 * a system ships for a job.
 *
 * **The table and its cards are the server's markup.** Each card is a
 * `popover="manual"` beside its mark, hidden until it opens, so the page ships
 * no data for them and a card's links follow its mark in the order `Tab` takes.
 * This component only decides which card is open and where it sits.
 *
 * **Pointing opens a card, and a tap or the keyboard keeps it.** A card
 * opened by the pointer closes a moment after the pointer leaves the mark and
 * the card, which leaves time to reach the card's links. One opened by a tap,
 * by `Enter`, or by focus stays until a press outside it, `Escape`, or focus
 * moving elsewhere.
 *
 * **The marks are one stop for `Tab`.** A stop for every mark is a long
 * way past one table, so the arrow keys move between the marks, and the mark
 * last focused is the one `Tab` returns to.
 *
 * **Moving to another mark glides the card there.** The next card starts where
 * the last one stood and moves to its own place, so the eye follows one card
 * across the table. Reduced motion drops the glide and keeps the fade.
 */
export function CoverageCards({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) {
      return
    }
    const still = matchMedia('(prefers-reduced-motion: reduce)')
    let open: Open | null = null
    /* Opened by a tap, a key, or focus, so the pointer leaving does not close it. */
    let held = false
    let hidAt = Number.NEGATIVE_INFINITY
    let showing = 0
    let hiding = 0
    /* The mark whose card is waiting out `REST`. */
    let pending: HTMLButtonElement | null = null
    let pointer = 'mouse'
    /* Set while `Escape` hands focus back to a mark, which is not a request
       to open its card again. */
    let returning = false

    const cancel = (): void => {
      window.clearTimeout(showing)
      window.clearTimeout(hiding)
      pending = null
    }

    /**
     * **A corner of the card at the mark, above it and to its right.** A card
     * centered over its mark covers the marks above it in the same column, and
     * the pointer moving up the column lands on the card and stops there. From
     * the corner, the column and the row both stay clear, and the pointer
     * reaches the card by moving up and across.
     *
     * Left of the mark where the right has no room, below where the top has
     * none, and centered inside the viewport where neither side fits a card,
     * as on a phone. The room above starts under the masthead, which sticks to
     * the top and would sit under the card. In page coordinates, because a card
     * in the top layer is placed against the document and scrolls with it.
     */
    const place = (trigger: HTMLElement, card: HTMLElement): void => {
      const box = trigger.getBoundingClientRect()
      const middle = box.top + box.height / 2
      const center = box.left + box.width / 2
      const width = card.offsetWidth
      const height = card.offsetHeight
      const room = document.documentElement.clientWidth
      const ceiling =
        (document.querySelector('helix-app-header')?.getBoundingClientRect().bottom ?? 0) + MARGIN
      const align =
        center + REACH + width <= room - MARGIN
          ? 'start'
          : center - REACH - width >= MARGIN
            ? 'end'
            : 'center'
      const left =
        align === 'start'
          ? center + REACH
          : align === 'end'
            ? center - REACH - width
            : Math.min(Math.max(center - width / 2, MARGIN), room - MARGIN - width)
      const spaceAbove = middle - REACH - ceiling
      const spaceBelow = window.innerHeight - MARGIN - (middle + REACH)
      const above = spaceAbove >= height || (spaceBelow < height && spaceAbove > spaceBelow)
      const top = above ? middle - REACH - height : middle + REACH
      card.dataset.align = align
      card.dataset.side = above ? 'top' : 'bottom'
      card.style.left = `${left + window.scrollX}px`
      card.style.top = `${top + window.scrollY}px`
    }

    const close = (): void => {
      cancel()
      if (!open) {
        return
      }
      const { card, trigger } = open
      if (card.matches(':popover-open')) {
        card.hidePopover()
      }
      trigger.setAttribute('aria-expanded', 'false')
      open = null
      held = false
      hidAt = performance.now()
    }

    const show = (trigger: HTMLButtonElement): void => {
      cancel()
      if (open?.trigger === trigger) {
        return
      }
      const card = document.getElementById(trigger.getAttribute('aria-controls') ?? '')
      if (!card) {
        return
      }
      const before = open?.card.getBoundingClientRect()
      const { align: beforeAlign, side: beforeSide } = open?.card.dataset ?? {}
      if (open) {
        instantly(open.card, close)
        instantly(card, () => card.showPopover())
      } else {
        card.showPopover()
      }
      place(trigger, card)
      trigger.setAttribute('aria-expanded', 'true')
      open = { card, trigger }
      if (!before || still.matches) {
        return
      }
      /* From the last card's place to this one's, matching the corner at the
         mark when both cards have it in the same place, so a short card and a
         tall one move as one. */
      const after = card.getBoundingClientRect()
      const x =
        beforeAlign !== card.dataset.align || card.dataset.align === 'center'
          ? before.left + before.width / 2 - (after.left + after.width / 2)
          : card.dataset.align === 'start'
            ? before.left - after.left
            : before.right - after.right
      const y =
        beforeSide !== card.dataset.side
          ? before.top + before.height / 2 - (after.top + after.height / 2)
          : card.dataset.side === 'top'
            ? before.bottom - after.bottom
            : before.top - after.top
      card.animate([{ translate: `${x}px ${y}px` }, { translate: '0 0' }], GLIDE)
    }

    const showSoon = (trigger: HTMLButtonElement): void => {
      if (pending === trigger) {
        return
      }
      cancel()
      if (open !== null || performance.now() - hidAt < WARM) {
        show(trigger)
        return
      }
      pending = trigger
      showing = window.setTimeout(() => show(trigger), REST)
    }

    const within = (node: Node | null): boolean =>
      node !== null && open !== null && (open.trigger.contains(node) || open.card.contains(node))

    /** The mark the arrow key points at, skipping cells with no mark. */
    const neighbor = (from: HTMLButtonElement, key: string): HTMLButtonElement | undefined => {
      const here = position(from)
      const all = [...root.querySelectorAll<HTMLButtonElement>(TRIGGER)].map((trigger) => ({
        trigger,
        ...position(trigger),
      }))
      const inRow = all.filter((one) => one.row === here.row).sort((a, b) => a.col - b.col)
      const inCol = all.filter((one) => one.col === here.col).sort((a, b) => a.row - b.row)
      switch (key) {
        case 'ArrowRight':
          return inRow.find((one) => one.col > here.col)?.trigger
        case 'ArrowLeft':
          return inRow.findLast((one) => one.col < here.col)?.trigger
        case 'ArrowDown':
          return inCol.find((one) => one.row > here.row)?.trigger
        case 'ArrowUp':
          return inCol.findLast((one) => one.row < here.row)?.trigger
        case 'Home':
          return inRow[0]?.trigger
        case 'End':
          return inRow.at(-1)?.trigger
        default:
          return undefined
      }
    }

    const onPointerOver = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') {
        return
      }
      const trigger = triggerOf(event.target)
      if (trigger) {
        if (open?.trigger !== trigger) {
          held = false
        }
        showSoon(trigger)
      } else if (within(event.target as Node)) {
        window.clearTimeout(hiding)
      }
    }

    const onPointerOut = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') {
        return
      }
      const to = event.relatedTarget as Node | null
      /* Onto the mark inside the same button, or from the mark to its card. */
      if ((to && triggerOf(event.target)?.contains(to)) || within(to)) {
        return
      }
      window.clearTimeout(showing)
      pending = null
      if (open && !held) {
        hiding = window.setTimeout(close, LINGER)
      }
    }

    const onFocusIn = (event: FocusEvent): void => {
      const trigger = triggerOf(event.target)
      if (!trigger) {
        if (within(event.target as Node)) {
          window.clearTimeout(hiding)
        }
        return
      }
      for (const one of root.querySelectorAll<HTMLButtonElement>(TRIGGER)) {
        one.tabIndex = one === trigger ? 0 : -1
      }
      if (!returning && trigger.matches(':focus-visible')) {
        show(trigger)
        held = true
      }
    }

    const onFocusOut = (event: FocusEvent): void => {
      /* Another mark taking focus opens its own card, and gliding there needs
         this one still open. */
      if (!held || within(event.relatedTarget as Node | null) || triggerOf(event.relatedTarget)) {
        return
      }
      close()
    }

    const onClick = (event: MouseEvent): void => {
      const trigger = triggerOf(event.target)
      if (!trigger) {
        return
      }
      const keyboard = event.detail === 0
      const touch = !keyboard && pointer !== 'mouse'
      if (touch && held && open?.trigger === trigger) {
        close()
        return
      }
      show(trigger)
      if (keyboard || touch) {
        held = true
      }
      if (keyboard) {
        open?.card.querySelector<HTMLElement>('a[href]')?.focus()
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      const trigger = triggerOf(event.target)
      const next = trigger && neighbor(trigger, event.key)
      if (next) {
        event.preventDefault()
        next.focus()
      }
    }

    const onEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !open) {
        return
      }
      const { card, trigger } = open
      const inside = card.contains(document.activeElement)
      close()
      if (inside) {
        returning = true
        trigger.focus()
        returning = false
      }
    }

    const onPress = (event: PointerEvent): void => {
      pointer = event.pointerType
      if (open && !within(event.target as Node) && !triggerOf(event.target)) {
        close()
      }
    }

    const onResize = (): void => {
      if (open) {
        place(open.trigger, open.card)
      }
    }

    root.addEventListener('pointerover', onPointerOver)
    root.addEventListener('pointerout', onPointerOut)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    root.addEventListener('click', onClick)
    root.addEventListener('keydown', onKeyDown)
    document.addEventListener('keydown', onEscape)
    document.addEventListener('pointerdown', onPress, true)
    window.addEventListener('resize', onResize)
    return () => {
      close()
      root.removeEventListener('pointerover', onPointerOver)
      root.removeEventListener('pointerout', onPointerOut)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
      root.removeEventListener('click', onClick)
      root.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keydown', onEscape)
      document.removeEventListener('pointerdown', onPress, true)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className={className} ref={ref} style={style}>
      {children}
    </div>
  )
}
