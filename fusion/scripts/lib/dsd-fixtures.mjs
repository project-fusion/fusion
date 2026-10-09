/**
 * The hydration check's fixtures: a component each, with the state it must end
 * in from a server's markup and from a client's, read by `visual.dsd.config.ts`.
 *
 * Held here and not in the config, because they are data a reader edits one at
 * a time, and the config is the harness around them.
 */

/**
 * What each fixture is, and what it must end as.
 *
 * `check` is a function body run in the page with `host` bound to the fixture's
 * element, returning `null` when the state is right and a sentence when it is
 * not. `dsd: false` with a reason keeps a component out of the server's page
 * for a limit that is the platform's, and says so in the output. `twice` with a
 * reason lets a component render a second time on the client where that render
 * answers a measurement of the first, which is the exception Lit's warning
 * itself names, and says so too. `still: true` holds the server's page to
 * its first paint: every heading and cell under the fixture, measured before
 * any script runs, must stand in the same place once it has hydrated.
 */
export const FIXTURES = [
  {
    check: `const value = host.shadowRoot.querySelector('[part="copy"]')?.value
      return value === 'bun run migrate' ? null : 'copies ' + JSON.stringify(value)`,
    markup: '<helix-code-block>bun run migrate</helix-code-block>',
    name: 'code-block',
  },
  {
    check: `if (host.shadowRoot.querySelector('[part="empty"]')) return 'says it is empty'
      const branch = host.querySelector('helix-tree-item')
      return branch.shadowRoot.querySelector('[aria-expanded]') ? null : 'draws its branch as a leaf'`,
    markup:
      '<helix-tree label="Files"><helix-tree-item>src<helix-tree-item slot="children">index.ts</helix-tree-item></helix-tree-item></helix-tree>',
    name: 'tree',
  },
  {
    check: `return host.shadowRoot.querySelector('[part="empty"]') ? null : 'does not say it is empty'`,
    markup: '<helix-tree label="Nothing"></helix-tree>',
    name: 'tree-empty',
  },
  {
    check: `if (host.shadowRoot.querySelector('[part="empty"]')) return 'says it is empty'
      const parent = host.querySelector('helix-menu-item')
      return parent.shadowRoot.querySelector('[aria-haspopup="menu"]') ? null : 'offers no submenu'`,
    markup:
      '<helix-menu label="Actions"><helix-menu-item>Sort<helix-menu-item slot="submenu" value="name">Name</helix-menu-item></helix-menu-item><helix-menu-item value="copy">Copy</helix-menu-item></helix-menu>',
    name: 'menu',
  },
  {
    check: `if (host.shadowRoot.querySelector('[part="empty"]')) return 'says it is empty'
      const body = host.shadowRoot.querySelector('slot:not([name])')
      return body && body.assignedElements().length === 1 ? null : 'shows ' + (body ? body.assignedElements().length : 'no') + ' rows'`,
    markup:
      '<helix-table label="Ways back"><helix-table-column>Option</helix-table-column><helix-table-row><helix-table-cell>Roll back</helix-table-cell></helix-table-row></helix-table>',
    name: 'table',
  },
  {
    check: `const header = host.shadowRoot.querySelector('[part="header"]')
      if (header && getComputedStyle(header).display !== 'none' && !header.hidden) return 'draws a header nobody filled'
      const log = host.shadowRoot.querySelector('slot[name="messages"]')
      return log && log.assignedElements().length === 1 ? null : 'shows ' + (log ? log.assignedElements().length : 'no') + ' turns'`,
    markup:
      '<helix-chat label="Support"><helix-chat-message author="them" state="sent">How can I help?</helix-chat-message></helix-chat>',
    name: 'chat',
  },
  {
    check: `const head = [...host.shadowRoot.querySelectorAll('[part="head"] slot')].flatMap((slot) => slot.assignedElements())
      return head.map((column) => column.textContent.trim()).join('|') === 'Name|Size'
        ? null
        : 'heads its columns ' + JSON.stringify(head.map((column) => column.textContent.trim()))`,
    markup:
      '<helix-data-table label="Files"><helix-table-column field="name">Name</helix-table-column><helix-table-column field="size">Size</helix-table-column></helix-data-table>',
    name: 'data-table',
  },
  {
    check: `if (host.shadowRoot.querySelector('[part="empty"]')) return 'says it is empty'
      const head = [...host.shadowRoot.querySelectorAll('[part="head"] slot')].flatMap((slot) => slot.assignedElements())
      if (head.map((column) => column.textContent.trim()).join('|') !== 'Name|Size') return 'heads its columns ' + JSON.stringify(head.map((column) => column.textContent.trim()))
      const served = host.shadowRoot.querySelector('[part="table"] > slot:not([name])')?.assignedElements() ?? []
      const words = served.map((row) => [...row.children].map((cell) => cell.textContent.trim()).join(' '))
      return words.join('|') === 'alpha 30 B|bravo 4 B' ? null : 'shows the served rows as ' + JSON.stringify(words)`,
    markup:
      '<helix-data-table label="Files" page-size="2"><helix-table-column field="name">Name</helix-table-column><helix-table-column field="size" text-align="end">Size</helix-table-column><helix-table-row><helix-table-cell header>alpha</helix-table-cell><helix-table-cell>30 B</helix-table-cell></helix-table-row><helix-table-row><helix-table-cell header>bravo</helix-table-cell><helix-table-cell>4 B</helix-table-cell></helix-table-row></helix-data-table>',
    name: 'data-table-served',
  },
  {
    check: `const footer = host.shadowRoot.querySelector('[part="footer"]')
      return footer.hasAttribute('data-held') ? null : 'lets go of the pagination row before its rows draw'`,
    markup:
      '<helix-data-table columns="2fr max-content" label="Files" page-size="2" row-key="name" selectable><helix-table-column field="name">Name</helix-table-column><helix-table-column field="size" text-align="end">Size</helix-table-column><helix-table-row><helix-table-cell header>alpha</helix-table-cell><helix-table-cell>30 B</helix-table-cell></helix-table-row><helix-table-row><helix-table-cell header>bravo</helix-table-cell><helix-table-cell>4 B</helix-table-cell></helix-table-row></helix-data-table>',
    name: 'data-table-still',
    still: true,
  },
  {
    check: `const cell = host.querySelector('helix-table-row').shadowRoot.querySelector('[part~="select"]')
      return cell ? null : 'draws no checkbox cell'`,
    markup:
      '<helix-table label="Ways back" selectable><helix-table-column>Option</helix-table-column><helix-table-column text-align="end">Cost</helix-table-column><helix-table-row value="back"><helix-table-cell header>Roll back</helix-table-cell><helix-table-cell>Low</helix-table-cell></helix-table-row><helix-table-row value="fix"><helix-table-cell header>Fix forward</helix-table-cell><helix-table-cell>Medium</helix-table-cell></helix-table-row></helix-table>',
    name: 'table-still',
    still: true,
  },
  {
    check: `const list = host.shadowRoot.querySelector('slot[name="items"]')?.assignedElements() ?? []
      if (list.length !== 2) return 'lists ' + list.length + ' of 2 rows'
      const group = host.querySelector('helix-notification-group')
      const showing = group.shadowRoot.querySelector('slot:not([name])')?.assignedElements() ?? []
      return showing.length === 1 ? null : 'a folded group shows ' + showing.length + ' of 1 row'`,
    markup:
      '<helix-notifications label="Inbox"><helix-notification at="2026-09-09T03:00:00Z"><span>Deploy finished</span></helix-notification><helix-notification-group collapsible label="Earlier"><helix-notification at="2026-09-08T03:00:00Z"><span>Build failed</span></helix-notification><helix-notification at="2026-09-07T03:00:00Z"><span>Build passed</span></helix-notification></helix-notification-group></helix-notifications>',
    name: 'notifications',
  },
  {
    check: `const panes = [...host.shadowRoot.querySelectorAll('[part="slide"] slot')].map((slot) => slot.assignedElements().length)
      return panes.join(',') === '1,1' ? null : 'holds slides as ' + JSON.stringify(panes)`,
    markup: '<helix-carousel label="Photos"><div>One</div><div>Two</div></helix-carousel>',
    name: 'carousel',
  },
  {
    check: `const divider = host.querySelector('helix-divider')
      const across = divider.shadowRoot.querySelector('[part="line"]').getAttribute('aria-orientation')
      return across === 'vertical' && divider.matches(':state(vertical)') ? null : 'runs its divider ' + across`,
    markup:
      '<helix-toolbar label="Format"><helix-button>Bold</helix-button><helix-divider></helix-divider><helix-button>Italic</helix-button></helix-toolbar>',
    name: 'toolbar-divider',
  },
  {
    check: `const offered = Boolean(host.shadowRoot.querySelector('[part="eyedropper"]'))
      return offered === 'EyeDropper' in window ? null : (offered ? 'offers' : 'withholds') + ' the eyedropper'`,
    markup: '<helix-color-picker label="Accent" value="#3366ff"></helix-color-picker>',
    name: 'color-picker',
  },
  {
    check: `const boxes = [...host.querySelectorAll('helix-checkbox')]
      return host.value === 'cheese' && boxes[0].checked && !boxes[1].checked
        ? null
        : 'holds ' + JSON.stringify(host.value)`,
    markup:
      '<helix-checkbox-group label="Toppings"><helix-checkbox value="cheese" checked>Cheese</helix-checkbox><helix-checkbox value="olives">Olives</helix-checkbox></helix-checkbox-group>',
    name: 'checkbox-group',
  },
  {
    check: `const rows = host.shadowRoot.querySelectorAll('[part~="row"]').length
      return rows > 0 ? null : 'draws no rows'`,
    markup:
      '<helix-object-inspector for="dsd-object" label="Payload"></helix-object-inspector><script type="application/json" id="dsd-object">{"id":42,"tags":["a","b"]}</script>',
    name: 'object-inspector',
  },
  {
    check: `const drawn = host.querySelectorAll('[data-index]').length
      return drawn === 2 ? null : 'draws ' + drawn + ' of 2 rows'`,
    markup:
      '<helix-virtual-list estimate="32" for="dsd-rows" label="Rows"><template><div data-field="name"></div></template></helix-virtual-list><script type="application/json" id="dsd-rows">[{"name":"One"},{"name":"Two"}]</script>',
    name: 'virtual-list',
    twice: 'it works out which rows fit from the box the first render laid out',
  },
  {
    check: `const entries = [...host.shadowRoot.querySelectorAll('[part="entry"]')].map((entry) => entry.textContent.trim())
      return entries.join('|') === 'Off|English|Deutsch' ? null : 'offers ' + JSON.stringify(entries)`,
    markup:
      '<helix-video label="Clip"><track kind="captions" label="English" srclang="en" src="data:text/vtt,WEBVTT"><track label="Deutsch" srclang="de" src="data:text/vtt,WEBVTT"></helix-video>',
    name: 'video',
  },
  {
    check: `const chosen = [...host.querySelectorAll('helix-option')].filter((option) => option.selected)
      return chosen.length === 1 && chosen[0].value === 'banana'
        ? null
        : 'marks ' + JSON.stringify(chosen.map((option) => option.value))`,
    markup:
      '<helix-listbox label="Fruit" value="banana"><helix-option value="apple">Apple</helix-option><helix-option value="banana">Banana</helix-option></helix-listbox>',
    name: 'listbox',
  },
]
