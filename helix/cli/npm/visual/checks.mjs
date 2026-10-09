/**
 * The page checks that read the page a shot pictured, and need no baseline.
 *
 * **One evaluation with its helpers inside it**, because a function handed to
 * the page carries nothing from this module: the walk through shadow roots,
 * the parent in the flat tree, and the words for an element are written once
 * here and shared by every check that runs.
 *
 * Each finding is `{ check, text }`, so the binary can hold one to an
 * exception that names its check.
 */

/**
 * Reads the page for the checks `options` turns on: `clipped`, `overlap` and
 * `contrast`, each with its own settings, or absent.
 */
export const readPage = (page, options) =>
  page.evaluate((options) => {
    const findings = []

    /* **Every element, shadow roots included**, because the boxes a component
       lays out for itself are inside one, and the light tree alone holds only
       what its user wrote. */
    const everything = () => {
      const found = []
      const visit = (root) => {
        for (const element of root.querySelectorAll('*')) {
          found.push(element)
          if (element.shadowRoot) {
            visit(element.shadowRoot)
          }
        }
      }
      visit(document)
      return found
    }

    /* **Up the flat tree, not the DOM tree.** Slotted content is laid out and
       painted where its slot sits, so its parent is the slot. */
    const up = (node) => {
      if (node.assignedSlot) {
        return node.assignedSlot
      }
      if (node.parentElement) {
        return node.parentElement
      }
      const above = node.getRootNode()
      return above instanceof ShadowRoot ? above.host : null
    }

    /* Down the flat tree: a slot's assigned nodes, a host's shadow root, or a
       node's own children. */
    const down = (node) => {
      if (node instanceof HTMLSlotElement) {
        const assigned = node.assignedNodes({ flatten: true })
        return assigned.length > 0 ? assigned : [...node.childNodes]
      }
      if (node.shadowRoot) {
        return [...node.shadowRoot.childNodes]
      }
      return [...node.childNodes]
    }

    const textsUnder = (node) => {
      const found = []
      const visit = (one) => {
        for (const child of down(one)) {
          if (child.nodeType === Node.TEXT_NODE) {
            if (child.textContent.trim() !== '') {
              found.push(child)
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            visit(child)
          }
        }
      }
      visit(node)
      return found
    }

    const within = (node, ancestor) => {
      for (let at = node; at; at = up(at)) {
        if (at === ancestor) {
          return true
        }
      }
      return false
    }

    const ignored = (element, selectors) =>
      selectors.length > 0 &&
      (() => {
        for (let at = element; at; at = up(at)) {
          if (at.matches && selectors.some((selector) => at.matches(selector))) {
            return true
          }
        }
        return false
      })()

    /* **A box of one pixel is a label for a screen reader**, the
       `clip-path: inset(50%)` pattern, and nobody is asked to read it. */
    const shown = (element) => {
      const box = element.getBoundingClientRect()
      return (
        box.width > 1 &&
        box.height > 1 &&
        element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      )
    }

    /* The words for an element in a finding: its tag, and the part it plays
       inside the component that holds it. */
    const describe = (element) => {
      const holder = element.getRootNode()
      const own =
        element.part?.length > 0
          ? `::part(${[...element.part].join(' ')})`
          : element.id
            ? `#${element.id}`
            : element.classList.length > 0
              ? `.${element.classList[0]}`
              : ''
      const self = `${element.localName}${own}`
      return holder instanceof ShadowRoot ? `${holder.host.localName} ${self}` : self
    }

    const sample = (text) => {
      const one = text.trim().replace(/\s+/g, ' ')
      return one.length > 40 ? `${one.slice(0, 40)}…` : one
    }

    const rectsOf = (text) => {
      const range = document.createRange()
      range.selectNodeContents(text)
      return [...range.getClientRects()].filter((rect) => rect.width >= 1 && rect.height >= 1)
    }

    /* **Clipped text: a box that cuts its own words off.** A box under
       `overflow: hidden` or `clip` whose text runs past its edge, unless the
       author said so with `text-overflow` or a line clamp. Only words that
       cross the edge count: words wholly outside the box are scrolled away,
       as a carousel's other slides are, and nobody is shown half of them. A
       word is reported once, against the innermost box that cuts it. */
    if (options.clipped) {
      const { ignore } = options.clipped
      const cut = new Map()
      for (const element of everything()) {
        if (ignored(element, ignore) || !shown(element)) {
          continue
        }
        const style = getComputedStyle(element)
        const clipsX = ['hidden', 'clip'].includes(style.overflowX)
        const clipsY = ['hidden', 'clip'].includes(style.overflowY)
        const saidX = style.textOverflow !== 'clip'
        const saidY = style.webkitLineClamp !== '' && style.webkitLineClamp !== 'none'
        const overX = clipsX && !saidX && element.scrollWidth > element.clientWidth + 1
        const overY = clipsY && !saidY && element.scrollHeight > element.clientHeight + 1
        if (!overX && !overY) {
          continue
        }
        const box = element.getBoundingClientRect()
        const left = box.left + element.clientLeft
        const top = box.top + element.clientTop
        const right = left + element.clientWidth
        const bottom = top + element.clientHeight
        for (const text of textsUnder(element)) {
          if (ignored(text.parentElement, ignore) || !shown(text.parentElement)) {
            continue
          }
          for (const rect of rectsOf(text)) {
            const crosses =
              rect.right > left && rect.left < right && rect.bottom > top && rect.top < bottom
            if (!crosses) {
              continue
            }
            const past = [
              ['right', overX ? rect.right - right : 0],
              ['left', overX ? left - rect.left : 0],
              ['bottom', overY ? rect.bottom - bottom : 0],
              ['top', overY ? top - rect.top : 0],
            ].sort((a, b) => b[1] - a[1])[0]
            if (past[1] <= 1) {
              continue
            }
            const before = cut.get(text)
            if (before === undefined || within(element, before.element)) {
              cut.set(text, { edge: past[0], element, pixels: Math.round(past[1]) })
            }
            break
          }
        }
      }
      const said = new Set()
      for (const [text, { edge, element, pixels }] of cut) {
        const line = `${describe(element)} cuts off its text ${pixels} px past its ${edge} edge: "${sample(text.textContent)}"`
        if (!said.has(line)) {
          said.add(line)
          findings.push({ check: 'clipped', text: line })
        }
      }
    }

    /* **Overlap: two boxes that draw over each other with nothing saying
       they should.** Text is judged by its words' own boxes and a control by
       its border box. A pair where one holds the other is a layout, not an
       overlap. Either one being placed on purpose is a stacking reason, and
       the pair is left alone: positioned absolutely, fixed or sticky, given a
       `z-index`, transformed, floated or in the top layer, itself or any box
       between it and what holds both. What is left is two boxes in the flow
       that collide, which is a word running into its neighbor. */
    if (options.overlap) {
      const { ignore } = options.overlap
      const CONTROL =
        'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], [role="slider"], [tabindex]:not([tabindex="-1"])'
      const boxes = []
      for (const element of everything()) {
        if (ignored(element, ignore) || !shown(element)) {
          continue
        }
        if (element.matches(CONTROL)) {
          boxes.push({ element, rects: [element.getBoundingClientRect()] })
          continue
        }
        const own = [...element.childNodes].filter(
          (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '',
        )
        const rects = own.flatMap(rectsOf)
        if (rects.length > 0) {
          boxes.push({ element, rects })
        }
      }
      const placed = new Map()
      const onPurpose = (node) => {
        if (!placed.has(node)) {
          const style = getComputedStyle(node)
          placed.set(
            node,
            ['absolute', 'fixed', 'sticky'].includes(style.position) ||
              (style.position !== 'static' && style.zIndex !== 'auto') ||
              style.transform !== 'none' ||
              style.translate !== 'none' ||
              style.float !== 'none' ||
              node.matches(':popover-open, :modal'),
          )
        }
        return placed.get(node)
      }
      const reason = (a, b) => {
        const line = new Set()
        for (let at = a; at; at = up(at)) {
          line.add(at)
        }
        let shared = null
        for (let at = b; at; at = up(at)) {
          if (line.has(at)) {
            shared = at
            break
          }
          if (at.nodeType === Node.ELEMENT_NODE && onPurpose(at)) {
            return true
          }
        }
        for (let at = a; at && at !== shared; at = up(at)) {
          if (at.nodeType === Node.ELEMENT_NODE && onPurpose(at)) {
            return true
          }
        }
        return false
      }
      const said = new Set()
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i]
          const b = boxes[j]
          if (within(a.element, b.element) || within(b.element, a.element)) {
            continue
          }
          let worst = null
          for (const one of a.rects) {
            for (const other of b.rects) {
              const width = Math.min(one.right, other.right) - Math.max(one.left, other.left)
              const height = Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top)
              /* More than a quarter of the shorter box's height, so lines of
                 text set tight, whose glyph boxes touch by a pixel or two, are
                 not a collision. */
              const shorter = Math.min(one.height, other.height)
              if (width > 2 && height > Math.max(2, shorter / 4)) {
                if (worst === null || width * height > worst.width * worst.height) {
                  worst = { height, width }
                }
              }
            }
          }
          if (worst === null || reason(a.element, b.element)) {
            continue
          }
          const words = (box) =>
            sample(box.element.textContent) || box.element.getAttribute('aria-label') || ''
          const line = `${describe(a.element)} and ${describe(b.element)} overlap by ${Math.round(worst.width)} by ${Math.round(worst.height)} px: "${words(a)}" and "${words(b)}"`
          if (!said.has(line)) {
            said.add(line)
            findings.push({ check: 'overlap', text: line })
          }
        }
      }
    }

    /* **Contrast: every ink against the ground it is really painted on.**
       The instrument is the hard part, and each of these was once a component
       reported broken when the probe was wrong: a transparent background
       paints nothing, so the walk composites every partly-opaque layer up the
       flat tree onto the first opaque one; a reading during a transition is
       the previous value, which the settling before any shot already rules
       out; and a ground that is not an ancestor, a sticky bar over a hero, is
       found by reading the paint stack at the text's center, where a stranger
       in between means nothing is claimed. */
    if (options.contrast) {
      const { component, ignore, large, largeBold, rules, scheme, target } = options.contrast

      /* Read through a canvas, because a computed color comes back in the
         notation it was written in, OKLCH included, and painting it is the
         one way to get sRGB out of every notation. */
      const swatch = document.createElement('canvas')
      swatch.width = 1
      swatch.height = 1
      const brush = swatch.getContext('2d', { willReadFrequently: true })
      const parse = (value) => {
        if (!value || value === 'transparent' || value === 'none') {
          return null
        }
        brush.fillStyle = '#010203'
        brush.fillStyle = value
        if (brush.fillStyle === '#010203' && !/^#010203$/i.test(value.trim())) {
          return null
        }
        brush.clearRect(0, 0, 1, 1)
        brush.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = brush.getImageData(0, 0, 1, 1).data
        return { a: a / 255, b, g, r }
      }
      const over = (top, bottom) => ({
        a: 1,
        b: top.b * top.a + bottom.b * (1 - top.a),
        g: top.g * top.a + bottom.g * (1 - top.a),
        r: top.r * top.a + bottom.r * (1 - top.a),
      })
      const luminance = ({ b, g, r }) => {
        const lin = (value) => {
          const c = value / 255
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
      }
      const ratio = (ink, ground) => {
        const a = luminance(ink)
        const b = luminance(ground)
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      }
      const hex = ({ b, g, r }) =>
        `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

      /* What sits behind a picture, a video or a background image is not one
         color, so no ratio against it means anything. Only media that covers
         the text counts. */
      const MEDIA = 'video, img, canvas, iframe, object, svg image'
      const unbounded = (node, box) => {
        if (getComputedStyle(node).backgroundImage !== 'none') {
          return true
        }
        for (const painted of node.querySelectorAll?.(MEDIA) ?? []) {
          const area = painted.getBoundingClientRect()
          if (
            area.left <= box.left &&
            area.top <= box.top &&
            area.right >= box.right &&
            area.bottom >= box.bottom
          ) {
            return true
          }
        }
        return false
      }

      /* Up the flat tree, every layer that is not fully transparent until one
         is opaque, a modal's `::backdrop` included, which has no node. A
         masked background is a glyph in the shape of its mask, and no
         ground. */
      const groundOf = (element, box) => {
        const stack = []
        let node = element
        while (node) {
          const style = getComputedStyle(node)
          const masked = style.maskImage !== 'none' && style.maskImage !== ''
          const layers = [
            masked ? null : parse(style.backgroundColor),
            parse(getComputedStyle(node, '::backdrop').backgroundColor),
          ]
          for (const layer of layers) {
            if (!layer || layer.a === 0) {
              continue
            }
            stack.push(layer)
            if (layer.a === 1) {
              let composited = stack.pop()
              while (stack.length > 0) {
                composited = over(stack.pop(), composited)
              }
              return { color: composited, on: node }
            }
          }
          if (unbounded(node, box)) {
            return null
          }
          node = up(node)
        }
        return null
      }

      /* A shadow root's `elementsFromPoint` reports the outer stack again, so
         each element is entered once. */
      const stackAt = (x, y, root = document, seen = new Set()) => {
        const layers = []
        for (const element of root.elementsFromPoint(x, y)) {
          if (seen.has(element)) {
            continue
          }
          seen.add(element)
          if (element.shadowRoot) {
            layers.push(...stackAt(x, y, element.shadowRoot, seen))
          }
          layers.push(element)
        }
        return layers
      }
      const contested = (element, ground, box) => {
        const stack = stackAt(box.left + box.width / 2, box.top + box.height / 2)
        const seen = stack.indexOf(element)
        const floor = stack.indexOf(ground.on)
        if (seen < 0 || floor < 0) {
          return false
        }
        const line = new Set()
        for (let node = element; node; node = up(node)) {
          line.add(node)
        }
        for (const between of stack.slice(seen + 1, floor)) {
          const paint = parse(getComputedStyle(between).backgroundColor)
          if (!line.has(between) && paint && paint.a > 0) {
            return true
          }
        }
        return false
      }

      /* The colors that draw a rule and not an ink, read off the live page:
         a line that separates is held to no target meant for a glyph. */
      const probe = document.createElement('span')
      probe.style.position = 'absolute'
      document.body.append(probe)
      const lines = new Set(
        rules.map((rule) => {
          probe.style.color = rule
          return getComputedStyle(probe).color
        }),
      )
      probe.remove()

      /* An icon is ink too, held to the 3:1 of a graphic. Only a drawing of
         one paint is read: a chart's root carries a paint its marks override,
         and its figure would be of a color that is nowhere on screen. */
      const iconInk = (element) => {
        const paints = new Set()
        for (const node of [element, ...element.querySelectorAll('*')]) {
          const style = getComputedStyle(node)
          for (const paint of [style.fill, style.stroke]) {
            if (paint && paint !== 'none') {
              paints.add(paint)
            }
          }
        }
        if (paints.size !== 1) {
          return null
        }
        const [only] = [...paints]
        return lines.has(only) ? null : parse(only)
      }

      /* A slotted label is painted by the box it lands in, through as many
         slots as there are shadow roots between them. */
      const painterOf = (element) => {
        let node = [...element.childNodes].find(
          (child) =>
            child.nodeType === Node.TEXT_NODE &&
            child.textContent.trim() !== '' &&
            child.assignedSlot,
        )
        if (!node) {
          return element
        }
        while (node.assignedSlot) {
          node = node.assignedSlot
        }
        return node.parentElement ?? element
      }

      /* Scrolled to, so paint order can be read where the browser is looking,
         and every scroll put back after, so the shots after this one picture
         the page where it was. */
      const scrolled = everything()
        .filter((one) => one.scrollHeight > one.clientHeight || one.scrollWidth > one.clientWidth)
        .map((one) => [one, one.scrollLeft, one.scrollTop])
      const pageAt = [window.scrollX, window.scrollY]
      const said = new Set()
      for (const element of everything()) {
        if (ignored(element, ignore)) {
          continue
        }
        const text = [...element.childNodes].some(
          (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '',
        )
        if (!text && !(element instanceof SVGSVGElement)) {
          continue
        }
        let box = element.getBoundingClientRect()
        if (box.width <= 1 || box.height <= 1) {
          continue
        }
        const painter = text ? painterOf(element) : element
        if (painter !== element) {
          const paints = painter.getBoundingClientRect()
          if (paints.width <= 1 || paints.height <= 1) {
            continue
          }
        }
        const style = getComputedStyle(painter)
        if (style.visibility === 'hidden' || style.opacity === '0') {
          continue
        }
        const ink = text ? parse(style.color) : iconInk(element)
        if (!ink) {
          continue
        }
        if (box.top < 0 || box.bottom > window.innerHeight) {
          element.scrollIntoView({ block: 'center' })
          box = element.getBoundingClientRect()
        }
        if (box.top < 0 || box.bottom > window.innerHeight) {
          continue
        }
        const ground = groundOf(painter, box)
        if (!ground || contested(painter, ground, box)) {
          continue
        }
        const size = Number.parseFloat(style.fontSize)
        const bold = Number.parseInt(style.fontWeight, 10) >= 700
        const wanted = !text || size >= large || (bold && size >= largeBold) ? component : target
        const flat = ink.a === 1 ? ink : over(ink, ground.color)
        const measured = ratio(flat, ground.color)
        if (measured < wanted) {
          const line = `${describe(painter)} is ${hex(flat)} on ${hex(ground.color)} in ${scheme}, ${measured.toFixed(2)}:1 against ${wanted}:1: "${sample(element.textContent ?? '')}"`
          if (!said.has(line)) {
            said.add(line)
            findings.push({ check: 'contrast', text: line })
          }
        }
      }
      for (const [one, left, top] of scrolled) {
        one.scrollLeft = left
        one.scrollTop = top
      }
      window.scrollTo(pageAt[0], pageAt[1])
    }

    return findings
  }, options)
