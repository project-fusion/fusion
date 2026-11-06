import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of App Header, a bar whose middle region folds behind a
 * toggle where it is narrow. Each setup folds at every width either half
 * draws it at, so a record says what the toggle does on both platforms: the
 * web folds at the bar's width and a phone at the window's.
 */

/** A bar that is always folded: a wordmark, and words in its middle region. */
const folded = (props: Setup['props'] = {}): Setup =>
  el('helix-app-header', { 'fold-below': 100000, ...props }, [
    el('helix-text', {}, ['Logo'], 'start'),
    'Overview',
  ])

/** App Header: the toggle a folded bar draws, its refusals, and the page writing `open`. */
export const APP_HEADER: readonly Scenario[] = [
  {
    family: 'app-header',
    intents: [{ kind: 'open' }, { kind: 'close' }],
    name: 'a press on the toggle opens the folded region and a second closes it, each asked first',
    setup: folded(),
  },
  {
    family: 'app-header',
    intents: [{ event: 'before-open', kind: 'refuse' }, { kind: 'open' }],
    name: 'a refused open keeps the folded region closed',
    setup: folded(),
  },
  {
    family: 'app-header',
    intents: [{ kind: 'open' }, { event: 'before-close', kind: 'refuse' }, { kind: 'close' }],
    name: 'a refused close keeps the folded region open',
    setup: folded(),
  },
  {
    family: 'app-header',
    intents: [{ kind: 'open' }, { kind: 'close' }],
    name: 'the toggle at the start opens and closes the folded region as the one at the end does',
    setup: folded({ 'toggle-placement': 'start' }),
  },
  {
    family: 'app-header',
    intents: [{ kind: 'set', prop: 'open', value: true }, { kind: 'close' }],
    name: 'the page opens the folded region by writing open, which asks nothing, and the toggle closes it',
    setup: folded(),
  },
]
