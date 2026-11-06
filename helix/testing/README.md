# @fusion.dev/helix-testing

The spec scaffolding every component test reaches for. **Private**: it is
tooling for this repository and nothing here reaches npm.

| Module | Environment |
|---|---|
| `./dom` | happy-dom under bun, for `*.dom.spec.ts` |
| `./browser` | Chromium, for the specs that need real layout |
| `./ssr` | Lit's server shim, for `*.ssr.spec.ts` |
| `./conformance` | Anywhere: the conformance scenarios, the records a half writes, and the comparison |
| `./conformance/web` | A browser, for the web half of the conformance suite |

**One module per environment, because they cannot share a process.** Lit's SSR
shim and happy-dom both patch globals, so `*.dom.spec.ts` and `*.ssr.spec.ts`
run as separate commands. That is why a package's `test` script is
`test:pure && test:dom && test:ssr` rather than one `bun test`.

**Import the code under test *after* `registerDom()`, in `beforeAll`.** A static
import runs first, so anything extending a DOM global captures bun's own rather
than happy-dom's, and the error never mentions the import. It is the module that
matters, not what is taken from it.

`at(list, index)` is here for the same reason the rest is: a spec indexes a
fixture it built, which `noUncheckedIndexedAccess` cannot see is safe, and a
cast would trade a real check for silence. This throws with the index and the
length instead.

It builds to `dist` like every other package. `exports` pointed at `./src/*.ts`
until September 2, 2026, which every consumer here resolves because every consumer is
bun; anything reading it with Node would have been handed TypeScript. `test`
already depends on `^build`, so compiling it costs the task graph nothing.

## Conformance

The conformance suite holds a family's web element and its React Native
component to one behavior. Its scenarios are in `src/conformance/scenarios`,
one file per family, and one, `toggle.ts`, for the families that turn on and
off.

A scenario names a family, a setup written once for both platforms, and the
intents a reader performs: a press, a key, focus, a refusal, a move, a drag,
opening or closing an item, a prop the page writes, a scroll, time passing
on a fake clock, or dismissing a layer. It states no
expectation. Each platform's harness performs the intents with its
own input and records, intent by intent:

- the events the elements sent, with their order, their detail, and whether a
  listener refused them
- the items chosen, the item with focus, the panels shown, and the links
  followed
- for a family that turns on and off, whether the element is checked, or
  mixed
- for a family whose items open and close, the items that stand open
- for a family that draws a picture, whether it is loading, loaded, or in
  error
- for a family whose words are its reading, as Format Date, the words it
  draws
- for a family that opens a layer, as Dialog, Drawer, Megamenu, Menu,
  Popover, Speed Dial, Tooltip, and Tour, whether the layer stands open, and a
  dialog's `close` once it has closed
- for a tour, the stop it shows, under `shown`: the stop the web's tour
  writes `current` on, and the stop whose machine a phone's last said is
  current
- for a family that copies, as Copy Button, where its last copy stands:
  `copied`, `failed`, or `resting`
- for a family whose items say themselves which is current, as Navigation
  and Megamenu, the items a screen reader hears as current: `aria-current`
  on the web, and the words a phone says after an item's own, where a
  closed layer holds them in neither record
- for a family that shows one page of rows at a time, as Drilldown and Menu,
  the rows whose press is drawn on the page showing, which a closed layer
  draws none of, and a row is chosen only where it is drawn

**A family's scenarios can be written before its native component exists.**
They are staged in `STAGED`, and the web half runs and records them in the
browser specs as it does the rest. React Native and the comparison read only
`SCENARIOS`, so a staged family moves there once its neutral form draws it on
React Native, and the native harness then reads whether it is checked from the
`checked` its toggling press tells a screen reader. No family is staged now.
Dialog, Drawer, Megamenu, Menu, Popover, Speed Dial, Tooltip, and Tour are
compared: an item a closed layer holds is not drawn, so it is chosen,
current, and focused in neither record.
The native harness reads how a picture stands, and whether a loader waits,
from the states the element's machines last gave its host.

**A fake image source answers with no network.** `fakeImage('loads')` is a
source whose picture loads, `fakeImage('fails')` one whose picture fails,
and `fakeImage('hangs')` one that never answers. The web half writes a
picture that loads or fails in the inner `<img>`, or no source at all, and
the native half draws each picture with `FakePicture`, which calls `onLoad`
or `onError` as its source says.

**A fake clipboard takes each copy.** Each half sets the clipboard
capability's fake before it draws a setup that copies, as a copy button
does, so a copy lands on it and no real clipboard is asked. A setup with
nothing to copy is a failed copy on both.

**A fake clock moves only when a scenario moves it.** `wait` runs each
timeout due in that many milliseconds, and `hide` and `show` send the page or
the app away from the front and bring it back. Each half sets the timers
capability's fake before it draws a setup whose scenario moves the clock,
and passes the fake to its harness, so an element that reads its time
through the timers capability, as a countdown does, runs the same on both.

**A setup with Outline Sections is laid out alike on both halves.** The
box they scroll in is `SECTION_LAYOUT.frame` tall and each section
`SECTION_LAYOUT.section` tall: the web sets these lengths in a stylesheet,
and a phone's harness measures each section by where it stands among them.
The web finds each section as an anchor by its id, and a phone registers it
by ref. A `press` with `link` presses the link an outline draws to the
section with that id.

`scroll` scrolls the element's part that scrolls to an offset, where it comes
to rest: the web sets the offset and sends `scroll` and `scrollend`, and a
phone sends its scroll view's scroll and the end of a glide.

**A layer's scenarios say where focus starts and how the reader dismisses
it.** `focus` with `page` puts focus on a control of the page outside the
setup, and a record names focus there `page`, so a scenario holds where
focus goes as a layer opens and where it comes back as it closes.
`dismiss` dismisses the open layer `by`:

- `escape`, the Escape key: the web sends it where focus is, and a browser's
  close request to an open modal dialog where nothing took it. A phone sends
  it from a hardware keyboard.
- `back`, Android's back: a close request on the web, and the last handler a
  layer added on a phone.
- `reader`, a screen reader's escape: a close request on the web, and
  `onAccessibilityEscape` on the layer's view on a phone.
- `outside`, a press outside the layer: at the window's corner on the web, on
  a modal dialog's scrim or on the page, and on the scrim or the app on a
  phone.

**The rows an item passes into its `page` or its `submenu` are items too**,
after the item that opens them, and so are the rows in a Menu Section and
the destinations in a Megamenu Group. Each
half records their events from their own value. An event stopped on its way
down to the element that sent it, as a drilldown stops the `select` of a row
that opens a page, is one a page cannot hear on it, and no record holds it.

**An item with no `value` is known by its `href`**, as a navigation's
destination is: an intent names it by it, and a record says it.

**A tour's stops are known by a `value` its setup writes**, as a toast's
messages are, and the buttons they point at are passed into the tour and
named by their `id`. A `press` on a stop's `next`, `back`, or `skip` presses
the Button the stop draws for that part: the web taps the part in the stop's
shadow root, and a phone the press drawn for the node of that name, which
its renderer keys by the name. A stop's panel holds focus, so a record names
the stop where focus is on its panel.

**A message of a toast's stack is known by a `value` its setup writes**,
which the element does not read, since a message has neither a value nor an
`href`. The stack hears each message's `dismiss` after the message, and a
phone's harness names the message it came from, as the web names the item
that sent the event. A toast's stack records no `layer`, since it opens on
what it holds and the web's region has no `open` state.

`open` and `close` press an item's trigger only where it stands the other
way, or the element's own, which a phone finds by the element's words or,
where it holds none, its `label`, as a megamenu's drawn trigger says it, so
a scenario says where the reader wants the item and not how many presses
that takes. The trigger is the press inside the item that says
whether it is expanded, and never the item's own words, which for an
accordion section are its content. **An app header's folded region opens by
its toggle**: the web presses its `toggle` part where the element draws no
`trigger`, and a phone the press around its words that says whether it is
expanded. Its setups fold at every width either half draws them at. `set` writes a prop as a script sets the property: the
web writes the attribute, and a phone draws the setup again with the prop.

| Half | Where | Runs in | Writes |
|---|---|---|---|
| React Native | `helix/native/tests/conformance` | The native Jest specs, in the `tests` job | `.local/conformance/react-native.json` |
| Web | `helix/styled/src/<family>/root/<family>-conformance.dom.spec.ts` | The browser specs, in Chromium and WebKit | `.local/conformance/chromium.json` and `webkit.json` |

**Each half writes its own record, and no record is committed.** A half fails
only where its harness could not run a scenario. The comparison runs once both
records exist, in the `conformance` job in CI, and holds them to each other
intent by intent:

- WebKit to Chromium, exactly
- React Native to the web, after keeping the events and the detail fields each
  element's neutral form declares, which the native half writes with its record

A difference names the scenario, the intent, and what each platform recorded.

**An intent a platform cannot perform says why**, as a press with a modifier
key does on a phone. A difference that waits on a decision is listed with its
cause in `helix/native/tests/conformance/known.ts`. The comparison reports each
entry, and fails once an entry there no longer differs. The native half prints
which transitions of each family's machines the scenarios took.

**`bun run conformance` runs both halves on your machine and compares them.**
It runs the native specs, then the browser specs of the families the scenarios
cover in Chromium and in WebKit, then the comparison. A browser that cannot run
on your machine is named and left out. The browser specs need a local server
on 127.0.0.1, so where your shell refuses one, nothing is compared, and CI
compares in the `conformance` job. `bun fusion/scripts/compare-conformance.mjs`
compares the records already in `.local/conformance`.
