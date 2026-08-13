import { type Example, exampleFor } from './examples.js'

/**
 * The sandbox, driven entirely by the custom elements manifest.
 *
 * Nothing here enumerates components, properties, slots, parts, or events. The
 * manifest is the single source, which is the whole point: a hand-maintained
 * sandbox drifts from the components the first time someone adds a property and
 * forgets, and the drift is invisible because the page still renders.
 */

interface Typed {
  text?: string
}

interface Attribute {
  default?: string
  description?: string
  fieldName?: string
  name: string
  type?: Typed
}

interface Named {
  description?: string
  name: string
}

interface EventDoc extends Named {
  reactProp?: string
  type?: Typed
}

interface Component {
  aliases: string[]
  attributes: Attribute[]
  cssParts: Named[]
  cssProperties: Named[]
  description: string | undefined
  documentation: string | undefined
  events: EventDoc[]
  name: string
  since: string | undefined
  slots: Named[]
  status: string | undefined
  summary: string | undefined
  tagName: string
}

/**
 * `@since`, `@status`, `@documentation`, and `@aliases` live under a `helix`
 * key, put there by the `helix-metadata` plugin. Only `@summary` is native CEM.
 */
interface HelixMeta {
  aliases?: string[]
  documentation?: string
  since?: string
  status?: string
}

const manifestData = JSON.parse(
  document.querySelector('#manifest')?.textContent ?? '{"modules":[]}',
) as { modules: Array<{ declarations?: Array<Record<string, unknown>> }> }

/** Every component with a tag name, styled tier first, then the headless tier. */
const components: Component[] = manifestData.modules
  .flatMap((mod) => mod.declarations ?? [])
  .filter((declaration) => typeof declaration.tagName === 'string')
  .map((declaration) => {
    const helix = (declaration.helix as HelixMeta | undefined) ?? {}
    return {
      aliases: helix.aliases ?? [],
      attributes: (declaration.attributes as Attribute[] | undefined) ?? [],
      cssParts: (declaration.cssParts as Named[] | undefined) ?? [],
      cssProperties: (declaration.cssProperties as Named[] | undefined) ?? [],
      description: declaration.description as string | undefined,
      documentation: helix.documentation,
      events: (declaration.events as EventDoc[] | undefined) ?? [],
      name: declaration.name as string,
      since: helix.since,
      slots: (declaration.slots as Named[] | undefined) ?? [],
      status: helix.status,
      summary: declaration.summary as string | undefined,
      tagName: declaration.tagName as string,
    }
  })
  .sort((a, b) => a.tagName.localeCompare(b.tagName))

/**
 * Control kind for an attribute, read from its declared TypeScript type.
 *
 * A literal union becomes a select with exactly the values that compile, which
 * is why the sandbox cannot offer a value the element would reject.
 */
const optionsOf = (attribute: Attribute): string[] | null => {
  const text = attribute.type?.text ?? ''
  if (!text.includes('|')) {
    return null
  }
  const parts = text.split('|').map((part) => part.trim())
  if (!parts.every((part) => /^'[^']*'$/.test(part))) {
    return null
  }
  return parts.map((part) => part.slice(1, -1))
}

const isBoolean = (attribute: Attribute): boolean => attribute.type?.text === 'boolean'

const defaultOf = (attribute: Attribute): string | boolean => {
  const raw = attribute.default ?? ''
  if (isBoolean(attribute)) {
    return raw === 'true'
  }
  return /^'.*'$/.test(raw) ? raw.slice(1, -1) : raw
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] => {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children)
  return node
}

const state = new Map<string, string | boolean>()
let current: Component = components[0] as Component

const stage = document.querySelector('#stage') as HTMLElement
const controls = document.querySelector('#controls') as HTMLElement
const meta = document.querySelector('#meta') as HTMLElement
const snippet = document.querySelector('#snippet') as HTMLElement
const reference = document.querySelector('#reference') as HTMLElement
const log = document.querySelector('#log') as HTMLElement
const nav = document.querySelector('#nav') as HTMLElement

/** Attributes whose value differs from the element's own default. */
const changed = (): Attribute[] =>
  current.attributes.filter((attribute) => {
    const value = state.get(attribute.name)
    return value !== undefined && value !== defaultOf(attribute) && value !== ''
  })

const renderSnippet = (): void => {
  const attrs = changed()
    .map((attribute) =>
      isBoolean(attribute)
        ? ` ${attribute.name}`
        : ` ${attribute.name}="${state.get(attribute.name)}"`,
    )
    .join('')
  const example = exampleFor(current.tagName)
  const lines = example.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  snippet.textContent =
    lines.length > 0
      ? `<${current.tagName}${attrs}>\n${lines.map((line) => `  ${line}`).join('\n')}\n</${current.tagName}>`
      : `<${current.tagName}${attrs}></${current.tagName}>`
}

const renderPreview = (): void => {
  stage.textContent = ''
  const example: Example = exampleFor(current.tagName)
  const node = document.createElement(current.tagName)
  node.innerHTML = example.content

  for (const attribute of current.attributes) {
    const value = state.get(attribute.name)
    if (value === undefined || value === '') {
      continue
    }
    // Set the property, not the attribute: it is the API a consumer uses, it
    // covers camelCase names without mapping, and it is what the element's own
    // types describe.
    ;(node as unknown as Record<string, unknown>)[attribute.fieldName ?? attribute.name] = value
  }

  for (const event of current.events) {
    node.addEventListener(event.name, (fired) => {
      const detail = (fired as CustomEvent).detail
      log.prepend(
        el('div', { className: 'logLine' }, [
          el('code', { textContent: event.name }),
          el('span', { className: 'logDetail', textContent: detail ? JSON.stringify(detail) : '' }),
        ]),
      )
    })
  }

  stage.dataset.wrapper = example.wrapper ?? 'block'
  stage.append(node)
  renderSnippet()
}

const renderControls = (): void => {
  controls.textContent = ''
  if (current.attributes.length === 0) {
    controls.append(el('p', { className: 'empty', textContent: 'No configurable properties.' }))
    return
  }

  for (const attribute of current.attributes) {
    const id = `control-${attribute.name}`
    const row = el('div', { className: 'control' })
    const label = el('label', { htmlFor: id, textContent: attribute.name })
    let input: HTMLElement

    const options = optionsOf(attribute)
    if (isBoolean(attribute)) {
      const box = el('input', { checked: state.get(attribute.name) === true, id, type: 'checkbox' })
      box.addEventListener('change', () => {
        state.set(attribute.name, box.checked)
        renderPreview()
        writeUrl()
      })
      input = box
    } else if (options) {
      const select = el('select', { id })
      for (const option of options) {
        select.append(
          el('option', {
            selected: state.get(attribute.name) === option,
            textContent: option,
            value: option,
          }),
        )
      }
      select.addEventListener('change', () => {
        state.set(attribute.name, select.value)
        renderPreview()
        writeUrl()
      })
      input = select
    } else {
      const field = el('input', {
        id,
        type: 'text',
        value: String(state.get(attribute.name) ?? ''),
      })
      field.addEventListener('input', () => {
        state.set(attribute.name, field.value)
        renderPreview()
        writeUrl()
      })
      input = field
    }

    row.append(label, input)
    if (attribute.description) {
      // First paragraph only: the rest is the reasoning, which belongs in the
      // source rather than under a form control.
      const hint = attribute.description.split('\n\n')[0] ?? ''
      row.append(el('p', { className: 'hint', textContent: hint }))
    }
    controls.append(row)
  }
}

const table = (title: string, rows: Named[], render: (row: Named) => string): Node | null => {
  if (rows.length === 0) {
    return null
  }
  const body = rows.map((row) =>
    el('tr', {}, [
      el('td', {}, [el('code', { textContent: render(row) })]),
      el('td', { textContent: row.description ?? '' }),
    ]),
  )
  return el('section', {}, [
    el('h3', { textContent: title }),
    el('table', {}, [el('tbody', {}, body)]),
  ])
}

const renderReference = (): void => {
  reference.textContent = ''
  const sections = [
    table('Slots', current.slots, (row) => row.name || '(default)'),
    table('Parts', current.cssParts, (row) => `::part(${row.name})`),
    table('CSS properties', current.cssProperties, (row) => row.name),
    table('Events', current.events, (row) => {
      const event = row as EventDoc
      return `${event.name} → ${event.reactProp ?? `on${event.name}`}`
    }),
  ].filter(Boolean) as Node[]

  if (sections.length === 0) {
    reference.append(el('p', { className: 'empty', textContent: 'No documented API surface.' }))
    return
  }
  reference.append(...sections)
}

const renderMeta = (): void => {
  meta.textContent = ''
  const chips = el('div', { className: 'chips' }, [
    el('code', { textContent: `<${current.tagName}>` }),
  ])
  if (current.status) {
    chips.append(
      el('span', { className: `chip chip-${current.status}`, textContent: current.status }),
    )
  }
  if (current.since) {
    chips.append(el('span', { className: 'chip', textContent: `since ${current.since}` }))
  }
  if (current.documentation) {
    chips.append(
      el('a', {
        className: 'chip',
        href: current.documentation,
        target: '_blank',
        textContent: 'Docs',
      }),
    )
  }
  meta.append(el('h2', { textContent: current.name }), chips)
  if (current.aliases.length > 0) {
    // Aliases are what people search for. Surfacing them is what makes the
    // filter find Tag when someone types "chip".
    meta.append(
      el('p', { className: 'aliases', textContent: `Also known as ${current.aliases.join(', ')}` }),
    )
  }
  if (current.summary) {
    meta.append(el('p', { className: 'summary', textContent: current.summary }))
  }
  if (current.description) {
    meta.append(el('p', { className: 'description', textContent: current.description }))
  }
}

const writeUrl = (): void => {
  const params = new URLSearchParams()
  for (const attribute of changed()) {
    params.set(attribute.name, String(state.get(attribute.name)))
  }
  const query = params.toString()
  // Replace rather than push, so configuring a component does not fill the
  // back button with every keystroke.
  history.replaceState(null, '', `#${current.tagName}${query ? `?${query}` : ''}`)
}

const select = (component: Component, params?: URLSearchParams): void => {
  current = component
  state.clear()
  for (const attribute of component.attributes) {
    const fromUrl = params?.get(attribute.name)
    if (fromUrl !== null && fromUrl !== undefined) {
      state.set(attribute.name, isBoolean(attribute) ? fromUrl !== 'false' : fromUrl)
    } else {
      state.set(attribute.name, defaultOf(attribute))
    }
  }
  log.textContent = ''
  for (const link of nav.querySelectorAll('a')) {
    link.classList.toggle('active', link.dataset.tag === component.tagName)
  }
  renderMeta()
  renderControls()
  renderPreview()
  renderReference()
  writeUrl()
}

let filter = ''

const matches = (component: Component): boolean => {
  if (filter === '') {
    return true
  }
  const haystack = [component.name, component.tagName, ...component.aliases].join(' ').toLowerCase()
  return haystack.includes(filter)
}

const renderNav = (): void => {
  nav.textContent = ''
  const visible = components.filter(matches)
  const styled = visible.filter((component) => !component.tagName.startsWith('helix-base-'))
  const headless = visible.filter((component) => component.tagName.startsWith('helix-base-'))

  if (visible.length === 0) {
    nav.append(el('p', { className: 'empty', textContent: 'Nothing matches.' }))
    return
  }

  for (const [title, group] of [
    ['Styled', styled],
    ['Headless', headless],
  ] as const) {
    if (group.length === 0) {
      continue
    }
    nav.append(el('h4', { textContent: title }))
    for (const component of group) {
      const link = el('a', { href: `#${component.tagName}`, textContent: component.name })
      link.dataset.tag = component.tagName
      link.addEventListener('click', (event) => {
        event.preventDefault()
        select(component)
      })
      nav.append(link)
    }
  }
}

const fromHash = (): void => {
  const [tag, query] = decodeURIComponent(location.hash.slice(1)).split('?')
  const found = components.find((component) => component.tagName === tag)
  select(found ?? (components[0] as Component), new URLSearchParams(query ?? ''))
}

const search = document.querySelector('#search') as HTMLInputElement
search.addEventListener('input', () => {
  filter = search.value.trim().toLowerCase()
  renderNav()
})

const theme = document.querySelector('#theme') as HTMLButtonElement
theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
  document.documentElement.dataset.theme = next
  theme.textContent = next === 'light' ? 'Dark' : 'Light'
})

renderNav()
fromHash()
window.addEventListener('hashchange', fromHash)
