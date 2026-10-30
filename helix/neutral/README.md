# helix/neutral

The platform-neutral sources Helix compiles for the web and for React Native.
This is a pilot, and its families are Accordion, Announcement, App Header, Avatar, Badge,
Blockquote, Breadcrumbs, Button, Button Group, Callout, Card, Checkbox, Checkbox
Group, Code, Color Input, Color Picker, Copy Button, Description List, Dialog, Divider, Drawer, Drilldown,
Empty, File Input, Flex, Format Date, Grid, Icon, Icon Button, Image, Input, Kbd, List, Loader,
Megamenu, Menu, Meter, Motion Toggle, Navigation, Number Input, Outline, Pin Input, Popover, Progress, QR Code,
Quote, Radio, Rating, Scroll Area, Skeleton, Skip Link, Slider, Speed Dial, Splitter, Stat, Steps,
Switch, Tabs, Tag, Text, Textarea, Timeline, Toast, Toggle, Toolbar, Tooltip, Tour, and
Trend.

| Path | What it is |
|---|---|
| `src/families/<family>/<element>/headless.tsx` | The element's props, events, states, features, and part tree, written as one object with its part tree last, as JSX |
| `src/render.ts` | How a `headless.tsx` source is written: `headless()`, its nodes, and the helpers its props and events take |
| `src/families/<family>/<element>/styled.ts` | The props only the styled tier has, and the style table |
| `src/table.ts` | How a style table is written: `styles()`, its groups and rules, and fragments |
| `src/style.ts` | The values a style table's declarations take |
| `src/rules.ts` | The conditions a rule applies under, and the shape a table compiles to |
| `src/fragments/<name>.ts` | Rules or declarations several families share, taken in with `include()` |
| `src/tree.ts` | The features a source declares, each in its own module, and `derive()`, `bind()`, and `not()` |

The package publishes the helpers as `@fusion.dev/helix-neutral`, for a
design system of your own: `render.ts`, `style.ts`, `table.ts`, and `tree.ts`
under their names, as `@fusion.dev/helix-neutral/render`, and the JSX
runtime. The package is experimental, so its API can change. Helix's own
families import the helpers by path.

The runtime that draws the families on React Native is
[`helix/native`](../native), published as `@fusion.dev/helix-native`.

`helix system` reads Helix's prefix, its token source, and where each command
writes from the `system` of the `helix` key in `fusion.json` at the repository
root. To build a design system of your own on the compiler, read
[DESIGN-SYSTEMS.md](DESIGN-SYSTEMS.md).

Every element's headless source is written with its part tree last, as
JSX, in `headless.tsx`, and `helix system` refuses a `headless.ts`:

```tsx
export default headless('tab', {
  memberOf: set('tabs'),
  props: { disabled: false, dismissLabel: 'Close', href: string() },
  events: { beforeSelect: cancelable(['value']) },
  states: ['selected'],
  render: ({ props, send }) => (
    <Pressable
      disabled={props.disabled}
      onPress={send.beforeSelect}
      part="tab"
      role="tab"
      selects
    >
      <Slot part="label" />
    </Pressable>
  ),
})
```

- **Every name the source declares is written in camelCase**, wherever the
  source or its style table names it, and the web's name is its hyphenated
  form: the prop `dismissLabel` is the attribute `dismiss-label`, the state
  `placedTop` is `:state(placed-top)`, and a feature that names the prop
  writes `prop: 'dismissLabel'`. A part, a region, an element's tag, and a
  derivation keep their hyphens, since the web writes them as they are.
- The props, the events, the computed values, and the states are in
  alphabetical order, which `helix system` checks, and so are each node's
  attributes, which Biome sorts. The keys around them are in the order they
  are read, with `render` last.
- A prop is its default, which says its type, or `string()`, `boolean()`,
  `number()`, `object()`, `oneOf([...], default)`, and `numberOrString()` and
  `time()`, which take a default where the prop has one, with `property()`
  for one that is no attribute and `web()` for one only the web element has.
- An event is its detail's fields, `cancelable([...])`, or `bare([...])`.
- The nodes are `View`, `Text`, `Image`, `Pressable`, `Slot`, `Layer`,
  `Announce`, `Repeat`, `Wrap`, `Svg`, and the shapes inside a vector,
  `Path` and `Circle`.
- `memberOf: set('tabs')` names the set the element joins, and pressing the
  element selects it where a `<Pressable selects>` in the render says so.
- A `<Wrap>` always wraps what it holds, and `<Wrap when={props.x}>` wraps it
  only while `x` holds. A `<Wrap href={props.href}>` is the link around what
  it holds.
- `<View draws="button">` draws another family's element in the part.
- A render reads `props.x`, `derived.x`, and `state.x`, each typed from the
  keys before it, and a value a feature computes by the feature and its
  field: `stack.title`, `stop.place`, `stop.words.back`,
  `tour.spotlight.height`, `copy.status`, `total.holds`. A repeat's copy reads
  `entry.x`, or `entry['depth-2']` for a field that is no name, and `index`.
- A child is a node, `x && <Node />`, `!x && <Node />`, or
  `x ? <A /> : <B />`, and an attribute is a literal, a read, `!` before one,
  `x ? 'a' : 'b'`, `x === 'v' ? 'a' : x === 'w' ? 'b' : 'c'`, or a core
  derivation, `derive('kbd-label')`.
- `slots.x` is whether the slot `x` holds something, which a `<Wrap when>`
  and a `<View hidden>` read: `<View hidden={!slots.logo}>` is hidden while
  nothing is passed into `logo`.
- `style={{ '--meter-fraction': derived.fraction }}` sets a CSS custom
  property on the part, as React's `style` writes one.
- **A feature is a plain object**, by its key: `toggle`, `collection`,
  `stack`, `copy`, and the rest below. A field that names an event starts
  with `on`, as a React handler's prop does, `onChange` and `onBeforeOpen`,
  and the field that names the prop holding a feature's state is `prop`, with
  `defaultProp` the one that seeds it, as Radix's controllable state names
  them.
- `helix system` refuses anything else with its line and the form to write
  it in, and an older spelling with the one that replaced it.

`helix system build` writes each element's intermediate form to
`build/ir/<family>/<element>.json` and its web stylesheet to
`build/web/<family>/<element>.css`, beside the helpers' `dist`. The intermediate form keeps the names the
native runtime reads, so a source's spelling can change and nothing a
platform draws does: `helix/cli/src/family/api/spelling.rs` holds each
feature's field beside its name there.

The other generators read these sources and write into the packages that ship
what they write, at the paths Helix's `system` names:

| Command | Writes |
|---|---|
| `helix system components` | Each family's native components, with their props typed, into `helix/styled/native/<family>/index.native.ts`. The styled build runs it and compiles them into its `dist` |
| `helix system platforms` | Prints what each element is called on React Native, which the styled `analyze` writes into `api.json` |
| `helix system stylesheets` | The generated web stylesheets, into `helix/styled/src`, when the styled tier builds |
| `helix system tokens` | Each mode's token values, into `helix/native/src/theme` |
| `helix system types` | The intermediate form's types, into `helix/native/src/ir.generated.ts` |

Each element is a component with its web element's class name, drawn from its
form by `element` with the machines `behaviorFor` binds. Its props are the web
element's properties in camel case, each slot is a prop, and each event is a
handler: `helix-before-activate` is `onBeforeActivate`. A handler gets the
web's detail under `event.detail`, typed from the event classes, with
`preventDefault()` and `defaultPrevented`. A prop or an event only the web
element has is left out, such as an icon's `src` and `load`. The module
carries its forms as constants, and the styled manifest describes each prop.

## Style tables

A style table is the web's stylesheet: `helix system stylesheets` writes it
into `helix/styled/src`, at the table's `stylesheet` path, when the styled
tier builds.

A style table is written with `styles()`, checked against the element's
headless source as you type. A part or a region the render does not draw fails
the typecheck: `helix system parts` writes the names each render draws into
`src/parts.generated`, which is never committed, and `styles()` reads them. This
package's `typecheck` writes them before it runs `tsc`. While you write a render,
`bun run parts:watch` keeps them fresh for your editor. Until they are written,
an editor accepts any name. `part="..."` stays a plain attribute in the render.

```ts
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import tab from './headless.js'

export default styles(
  tab,
  {
    prefix: 'tabs-tab',
    hooks: { color: token('color-foreground-muted') },
    stylesheet: 'tabs/tab/tab.generated.css',
  },
  ({ hook, on, rule }) => [
    on('tab', [
      rule({ color: hook.color }),
      rule({ selected: true }, { color: token('color-foreground') }),
    ]),
  ],
)
```

- `on(target, [...])` is a group, and every rule in it is on one target:
  `'host'`, a part, several parts, a region, slotted children, or a part's
  `before` and `after`.
- `rule(set)` or `rule(when, set)`. `platform` and `supports` are conditions
  in `when`.
- **The later rule on a target wins**, however many conditions either has.
  The web starts every rule at the host and writes every condition inside
  `:where()`, so each rule on one part ranks as `:host` and the part do, and
  a phone ranks them the same way. A selected tab drawn over its hover writes
  `{ selected: true }` after `{ hover: true }`. A `{ part, selector }` rule
  ranks as its selector does.
- **What the host holds is written inside `:host()`**:
  `:host(:where(:focus-within)) [part="field"]`, and `:host [part="field"]`
  where the rule asks nothing of the host. WebKit does not match a rule
  again as the host's focus or hover changes when `:host()` is itself inside
  `:where()`.
- `variants(prop, { value: set })` is one rule for each value of a prop.
- **A condition's name is resolved in one namespace**, from the headless
  source: `{ hover: true, disabled: false }` on a tab is the part's
  `disabled`, since the tab's press carries it, `{ selected: true }` is the
  state, and `{ emphasis: 'solid' }` is the prop. A name that is a state and
  an attribute of the part is the state. `part: { ... }` reads an attribute
  the part carries that the source does not write, as the floating
  controller's `data-placed`, and one whose name is a state as well, as an app
  header's `hidden`.
- `formDisabled` is the host's own `:disabled`, which a disabled fieldset
  around it sets too, on the host and on any part.
- `startingStyle: true` holds the values a part starts from as it is drawn,
  `@starting-style` on the web.
- A `set` names CSS properties in camelCase, another element's hook as a
  quoted custom property, and the private values the rule sets under `own`.
- **`hooks` and `own` are objects**, each one's default by its name in
  camelCase, `null` for one with none. A hook is named for its name after
  the prefix, so `hook.color` is `--tabs-tab-color`. A private value is named
  by its whole name, so `own.tabHeight` is `--_tab-height`: the table's own
  values, and another family's it reads or sets, as a tab reads
  `own.tabsDismissRest` from the tab set around it. `hooks` may be
  `({ own }) => ({ ... })` to read private values. A rule reads `hook.color`
  with the default, and `hook.color(fallback)` with its own. `helix system
  build` refuses a fallback that is the default the header gives, which
  `hook.color` reads already.
- `first(own.tabHeight, hook.blockSize, token('size-control'))` is the first
  of several reads that is set, and the last argument where none is.
- `hookOf('button', 'radius-end-end')` reads another family's hook,
  `inherited('list-rail-inline-size')` a custom property the element around
  sets, `measured('meter-fraction')` one the element's tree sets in a part's
  `style`, and `derive('grid-template')` a derivation in core, as a headless
  source names one.
- `web([rule(...)])` and `native([rule(...)])` are rules one platform's
  alone, and a set's `web: { cursor: 'pointer' }` holds declarations of
  properties a phone does not have. `inlineSize: web('max-content')` is a
  value a phone does not have, of a property it does. A rule that is the
  web's alone holds no `web` block and no `web()` value, which would say
  nothing there.
- `include(field)` takes in a fragment imported from `src/fragments`, written
  with `fragment()`, or `declarations()` for a fragment a `set` takes in.
- `over` names the element a table is drawn over, as Copy Button's names
  `icon-button`. The web element adopts that element's stylesheet before its
  own, so the generated stylesheet holds the table's own rules, and a phone
  lays that element's rules under these, each hook still that element's,
  `--icon-button-size`.
- `{ part, selector }` writes a selector out, on the web alone, for what the
  vocabulary does not name. Each one says why in a comment that starts
  `Written out:`.

`helix system build` refuses a name the source does not declare, a declared
name no rule uses, and two rules in groups on different targets, as a part
and the second name it carries, that set one property on one node to
different values. It also refuses a hook another family does not read,
a private value no family sets, and a custom property read inside a string.
`src/table.ts` describes every form.

## What a source says

Text, Flex, and Grid have no headless tier on the web, and each one's
`headless.tsx` holds the props and the tree of its element all the same.

A prop's values may include `true`, the attribute present with no value, so
`wrap: oneOf([true, 'reverse'], false)` is a switch with one named value: a
phone types it `boolean | 'reverse'`.

A view marked `run` is a run of words: a phone draws it as a `Text`, so the
words and the runs passed into it flow as one paragraph, and a run nested in
other words wraps with them. An element whose host is `display: inline` is
drawn as a run too, as Code, Quote, and an inline Text are. Words a node takes
can be derived from the props with `derive()`, by the name of a derivation in
`@fusion.dev/helix-core/derivations`, as a key's chord is.

An element can compute values from its props, in its source's `derived`,
each `derive()`, a derivation in `@fusion.dev/helix-core/derivations`, or
`bind()`, a prop or whether a region holds something, by its name in
camelCase. A render reads one as `derived.x`, and a rule by its name, as a
trend is in its `better` state while `derive('trend-better')` holds. The web
element works each value out itself, and a native view calls the derivation
with the element's props, its regions, and its locale.

A view's `data-` attribute is a flag the web writes on its part, which a rule
reads by its name: a badge's indicator is `data-dot={derived.dot}`, and
`{ 'data-dot': true }` styles it. The attribute keeps HTML's name, since it is
the one the web element writes.

The source's `host` says what a screen reader hears of the host, where the
web element sets it through `ElementInternals`: its `role`, and its `label`,
which may bind a region, as a stat is named by the words of its label. A
range's reading is the host's too, `valuemin`, `valuemax`, `valuenow` and
`valuetext`, and so are `busy` and `ariaHidden`. A phone gives a `group` no
role while it has no name.

A prop of type `object` holds an object, which the web's attribute writes as
JSON, as `format-options` holds `Intl.NumberFormat` options. A prop of type
`number | string` holds either, as a badge's `value` holds `8` or `New`.

A wrap only a phone draws, `platform="native"`, leaves its children where it
stands on the web, as a stat's figure and unit share one line on a phone and
stand in the host's grid on the web.

`helix system check` also holds each element with a part tree to what the
styled manifest says it has: its attributes, events, slots, parts, and states.

Events follow the web's grammar. A request a handler may refuse is
`before-<verb>` and declared `cancelable`, and the plain verb, declared
without it, is the notification once the change stood, as a menu row sends
`before-select` and then `select`. Where an element declares both, the native
runtime sends the notification once nothing refused the request, before
anything the change does, as a menu's close. An element that declares the
request alone sends nothing after it, as a tab's `before-select` is followed
by its tab set's `activate`. An attribute the web keeps for one release under
an old name, as List's `empty-label` beside `empty-text`, is declared with
`web()`, so a phone's component has only the new name.

## Collections

The elements of one family find each other through a collection. A tab set
holds which tab is selected, and its tabs and panels join it by `value`: the
web element reads its children, and the native runtime joins them through
context. A list holds which rows are selected, as many as its
`selection-mode` says, and numbers its rows with counters, which the runtime
runs over them.

```tsx
collection: {
  defaultProp: 'defaultActive',
  keys: { loop: true, selectionFollowsFocus: true },
  manualActivation: 'manual',
  onBeforeChange: 'beforeActivate',
  onChange: 'activate',
  prop: 'active',
},
```

- `prop` names the prop that holds the selected value, and `defaultProp` the
  one that seeds it. `onBeforeChange` is the cancelable event a change asks
  first, and `onChange` the event, or several in order, sent once it stands.
- `keys` says how the keys move among the items: `loop` comes round from the
  last item to the first, `selectionFollowsFocus` selects the item focus
  arrives on, unless `manualActivation` names a prop that holds, `typeahead:
  false` turns off the typed letter that moves focus, as on a radio group,
  `orientation` names the prop whose `vertical` leaves Left and Right to the
  page, and `itemKeys` lists the moving keys the items keep for themselves,
  as a list's rows keep Left and Right.
- `selectionMode` names the prop that says how many items a reader can
  select, and `selectionBehavior` the prop that says what a press does to the
  items already selected.
- `disabled` and `readonly` name the props that disable every item and keep
  the selection as it is, while the arrow keys still move focus.
- `numbering` names the props and values that number the items, as a list's
  `start` and `reversed` do.
- `empty` names the state that holds while no item has joined.

A collection that declares `reorder` lets a reader move its items, as a
`reorderable` list does. `onBeforeReorder` and `onReorder` are the events a
move sends, `enabled` the prop that allows it, and the rest the words a
screen reader hears at each step. Where and when an item lands is worked out
by `@fusion.dev/helix-core/reorder`, which the web's own reordering uses too.

## Toggles

An element that turns on and off declares a `toggle`: the prop that holds
whether it is checked, `prop`, the props that seed it, show it indeterminate,
and make it read-only, `defaultProp`, `indeterminate`, and `readonly`, and the
events a press sends before and after it turns, `onBeforeChange` and
`onChange`. Its pressable marked `toggles` is the part a press turns it with,
and the native runtime runs the toggle machine from `@fusion.dev/helix-core`
behind it. A checkbox's or a switch's pressable writes `pressKey="space"`, so
Space turns it and Enter does not, as on the web.

A toggle whose state no prop holds names what the runtime holds it in with
`shared`. Motion Toggle's is `page-motion`, whether the page's motion is
paused: the document element holds it on the web, and the native runtime on a
phone, where every Motion Toggle in the app shares it and its parts read it as
the `paused` state.

A toggle that opens names the event sent before each direction,
`onBeforeOpen` and `onBeforeClose`, in place of `onBeforeChange`, as an
accordion section sends `before-open` and `before-close`. Either is
cancelable, and its detail is `open`, the state the toggle would leave. Its
pressable says `expanded`, so a phone announces it as expanded or collapsed
and never as checked.

A toggle that only closes names `onBeforeClose` alone, as a callout's
`dismiss`: a press closes it after the event stands, and only the page opens
it again, with nothing sent. A toggle with no seed starts as its prop's
default, so a callout stands open until it is dismissed.

A toggle's `onToggle` names the event sent once it stands the other way,
however it came to: a press, the page writing its prop, or its set, as an
accordion section sends `toggle`. Its detail is `newState` and `oldState`,
`open` or `closed`, as the platform's `ToggleEvent` carries them, and a
phone's event carries them on itself as well as under `detail`, as a `bare`
event does. A press's turn sends it before the press's own event, on both
platforms. Its `onClose` names the event sent after it once it stands
closed, as a dialog sends `close`.

An element whose toggle only closes and whose states include `exiting`,
`entering`, and `closed` fades as its host's rules say, on a phone as on
the web: the host is `exiting` while the transition it takes in that state
runs, then `closed`, and `entering` as it shows again, from the values its
rules under `entering` give it. Its dismissal hands focus to the dismiss
press of the element of its kind beside it, the next ones first. A phone
counts as beside it the elements of its kind drawn in the same Helix
element, or outside any, in the order they were drawn.

A set whose items open names the prop that holds its mode with its
collection's `openMode`, and says `itemsToggle: true`, as an accordion's
`mode` does. It needs no `prop`:

- Where the prop holds nothing or `multiple`, any number of items stand open.
- Under `single-collapsible`, an item that opens asks each other open item to
  close, with its own `before-close`, which may refuse.
- Under `single`, the same, and a press on the open item keeps it open and
  sends nothing. Its press is disabled to a screen reader and keeps its
  stop, as the web's `aria-disabled` is.

An item that opens closes its peers once its own events are sent. The arrow
keys move focus between the items' presses, Home and End to the first and
the last, coming round at the ends and passing over a disabled item, and
each press stays a stop of its own. On a phone they are a hardware
keyboard's.

The set settles on the first open item as it draws, and on the first item
under `single` where none is open, with nothing sent, as the web does.

A view that stays drawn while closed says when it shows with `open`, as an
accordion's content is `open={props.open}`, as a `<details>` element's
content is. The web keeps it `hidden="until-found"` and `inert` while it does
not, so find in page reaches it. A phone draws it, with no press and nothing
in it a screen reader reaches.

A toggle's `onChange` may name several events, sent in order once it turns,
as a checkbox sends `input` and then `change`. A collection's `onChange` may
too, as a radio group's does.

## Sets whose items are pressed

A set whose items are pressed, as a toggle group's toggles and a button
group's buttons are, says how in its collection:

- `pressMode` names the prop that says how the items are pressed,
  `selection-mode`. Where it says `multiple`, each item is a toggle button
  that presses on its own: the selected prop holds the pressed values,
  separated by commas, the keys move focus without pressing, and no item is
  marked. Under any other value each item is a radio.
- `roves` names the prop that must hold a value for the arrow keys to move
  among the items, and for `pressMode` to make them radios or toggle buttons.
  A button group's is `selection-mode`: until it holds a value, each button
  is a control of its own.
- `keys.selects: false` leaves Space and Enter to each item's own press,
  which selects it as a tap does, where a list's selection takes them. An
  item whose press hears its own keys is a control of a toolbar around the
  set, so inside a toolbar the set moves nothing, and the toolbar's arrow
  keys walk its items, as they walk a button group's. A toggle group leaves
  its toggles no keys of their own and keeps its arrow keys inside a
  toolbar, as on the web.
- `disallowEmptySelection` names the prop that refuses a press that would
  leave nothing selected, and `allowEmptySelection` the prop that lets a
  press on the selected item take it back.
- `label` names the prop a phone announces the set by on its host, since the
  web element sets its role on the host and draws no part to carry it.

Such a set is announced as its items are pressed: a radio group where they
are radios, a toolbar where they are toggle buttons, and a group where they
are neither. A phone announces a toolbar inside another toolbar as a group of
it, so a reader meets one toolbar. A set with a `label` is announced on its
host. A set whose part carries the role picks it by a prop's value, as a
toggle group's row does:
`role={props.selectionMode === 'multiple' ? 'toolbar' : 'radiogroup'}`.

An item names the state it is in while its set selects it with `memberOf`'s
`selectedState`, as a Button is `pressed` in a Button Group. A Button with no
`value` names nothing in the set's value. A Toggle is an item of its group
and a toggle of its own, and turns as a toggle only while it has joined no
group.

## Current items

An item that is marked as the one its set is on by a prop other than
`selected` names it with `memberOf`'s `current`, as a step is `current` while
its sequence is on it: its markup opens the set there, and the set holds the
prop as the item's state. An item with no `value` keeps its own prop on a
phone.

A part's `describedby` names the regions whose words describe it, separated
by spaces, as a menu row is described by its `description` and its `end`:
`aria-describedby` on the web, and a phone's hint. Mark those regions
`ariaHidden`, so their words describe the part and do not name it.

A set whose items say themselves which of them is current says
`currentFromItems: true` in its collection, as a navigation's destinations do:
it holds no selected value, a press and a key select nothing, and the page
moves the mark by writing each item's `current`. A prop that holds a word
marks its item while it holds any but `false`, as a destination is `current`
as `page` or `location`, and a view that is an `indicator` stands at the item
marked, the one marked `page` where several are. An item's `value` in
`memberOf` names the prop it stands for in its set where it has no `value` of
its own, as a destination stands for its `href`: its events carry it, and a
phone knows the item by it. `helix system build` refuses a set that is
`currentFromItems` and names a `prop`, a `selectionMode`, or `openMode`,
mixes, or says `itemsToggle`.

An item's `current` may name a value the element computes in place of a prop,
as a megamenu is `current` in its navigation while `derive('megamenu-current')`
finds the page among what is passed into it, so it holds while its panel is
closed. A set whose items mark themselves may close its element as an item
is chosen, with its collection's `closeOn`, which then names the items' own
event, as a megamenu closes once a Megamenu Item's `before-select` stands. An
element may join a set as an item and hold a set of its own, as a megamenu
is a navigation's destination and holds its panel's items.

A collection's `itemOpen` names the state the element is in while an
element drawn among its items stands open, as a navigation is `open` while a
megamenu among its destinations is. The web element hears each `toggle` sent
inside it. A phone's elements each say whether they stand open, in their
`open` state or by a toggle that opens, to the element around that names
one, through a context that reaches into layers.

A part says which of a set it is with `current`, as `aria-current` does, and
a phone says it in words after the part's own, "Current page" or "Current
step". Words that describe a part, `aria-describedby` on the web, are its
`description`, a phone's hint, as a finished step's name is described by its
`complete-label`. A press with an `href` that joins no set opens it once its
event stands, as a crumb does, and a press whose one job is its link draws
as a view while it has nowhere to go.

An element that is a toolbar declares a `toolbar`: the props that say which
way it runs, `orientation`, and that stop its arrow keys at the ends,
`stopAtEnds`. Every press drawn inside the part whose role is `toolbar` that
hears its own keys is one of its stops, a toolbar inside another gives its
stops to the outer one, and the native runtime runs the roving focus machine
over them.

A radio group's collection says three more things. `optional` lets it hold no
answer: it opens on a radio its markup writes `selected`, and on nothing
where none is. Its `disabled` and `readonly` name the props that disable every
radio and keep the answer as it is, while the arrow keys still move focus.
`keys: { typeahead: false }` gives it no typeahead, as on the web.

A checkbox group's collection says `itemsToggle: true`: its items turn on
their own, and the selected prop holds the values of those that are on. A
box's turn asks its own `before-check`, then the group's `before-change`, with
the whole set that would result, and either refusal keeps the box as it was.
Each box is a stop of its own, so the collection says nothing of keys, and
the native runtime hosts the set as `toggle-set`. Its `selectAll` names the
box that turns every item at once: the prop that draws it, the prop that
holds its words, and its part, a view that `draws="checkbox"`. A view that
draws another element is that element, and its `exports` names the
element's parts the view exposes, each as `select-all-` and the part's name.

## Sets that mix commands and choices

A set that mixes commands and choices, as a menu's rows, says `mixes: true`
in its collection, with `keys` and no `prop`. Each item that can be a choice
names its props in `memberOf`:

```tsx
memberOf: set('menu', {
  checkable: 'checkable',
  checked: 'checked',
  closeWhen: 'closeOnSelect',
  exclusive: 'exclusive',
  onBeforeChange: 'beforeCheck',
}),
```

- `checked` holds whether the item is checked, and seeds it. An item that
  names `checkable`, `exclusive`, or `onBeforeChange` names it too.
- `exclusive` makes the item one of a run, and `checkable` a choice of its
  own. Any other item is a command.
- `onBeforeChange` is a cancelable event a press sends before it turns the
  item, its detail the `checked` the press asks for.

A set that mixes may close its element as an item is chosen, as a speed
dial and a menu do: its collection's `closeOn` names the item's event and
`closeWhen` the element's prop that must hold, `closeOn: 'beforeSelect',
closeWhen: 'closeOnSelect'`, and an item's own `closeWhen` names its prop that
wins where it holds a value. A choice that stands closes the element's
toggle, and a row that opens a page closes nothing. The set's `onChange`
events are sent as a press turns a choice, as a menu sends `change`.

`@fusion.dev/helix-core/menu-items` says what kind of item it is, its role,
what a press turns it to, and the other items of its run, for the web's
Menu Item and a phone alike. `helix system build` refuses a set that mixes
and names a `prop`, a `selectionMode`, or `itemsToggle`; an item's switch
that is no boolean; an `onBeforeChange` that cannot be canceled; and an item
that names `checked` and joins a set that does not mix.

## Stacks of pages

An element that shows a stack of pages one at a time, as a drilldown does,
declares a `stack`, and its collection holds the rows. A row that holds a
page names the region its page is passed into with `memberOf`'s `pageSlot`:

```tsx
stack: {
  back: 'back',
  drilled: 'drilled',
  onBeforeChange: 'beforeNavigate',
  prop: 'page',
  title: 'pageLabel',
},
```

- `back` is the pressable that goes back one page.
- `onBeforeChange` is a cancelable event a move sends first, its `value` the
  row whose page would show, empty for the top page.
- `drilled` and `title` name values the element computes: whether a page
  below the top is showing, and the page's words, which a render reads as
  `stack.drilled` and `stack.title`, and a rule by their names.
- `prop` is the prop that holds the `value` of the row whose page is showing.
- `forward` and `backward` name the states the element is in after a move
  into a page and after a move back out, until the next move, as a drilldown
  is `forward` and `back`. The part that holds the rows starts its motion
  again with each move, so a page slides in each time, on both platforms.
- `topTitle` names the prop or the computed value whose words `title` holds
  on the top page, as a drilldown's top page is named by its `label`.
- `writes` names the props the stack writes on each row it draws as a row,
  by the row's prop, from the element's prop that holds each, as a
  drilldown under `navigation` writes its rows `listed`:
  `writes: { listed: 'navigation' }`. A phone lays each over the row's host,
  where its rules and its derivations read it as the prop, and a row whose
  page is showing, or holds the page showing, is written none.

`@fusion.dev/helix-core/stack` enters, goes back, and reads the depth, the
title, and the rows of the page showing from a tree of rows, for the web's
`DrilldownController` and a phone alike. `helix system build` refuses a
`back` that is no pressable, an `onBeforeChange` that cannot be canceled, a
stack with no collection, a `pageSlot` region the row does not draw, and a
row with a `pageSlot` that joins an element with no stack.

## Drawing another element

**A rule may style a part a view exports**, by that name:
`on('select-all-box', [...])` is `[part="select-all"]::part(box)` on the web,
and on a phone the style the element around gives the drawn element's `box`,
laid over the box's own. Such a rule reads the props, the states, and the
media of the element around, and `helix system build` refuses one that reads
a state of the part, an interaction on it, its place, a part around it or
inside it, a region, or generated content, which `::part()` cannot follow.

**A wrap that draws another element draws it around what the wrap holds**,
while its `when` holds, and the element takes what the wrap holds as its
default region. `gives` names props the element takes from the element
around, each a value or a read, as a copy button draws a tooltip around its
press with the words of its result:

```tsx
<Wrap
  draws="tooltip"
  gives={{ content: copy.status, open: copy.status, persist: true }}
  part="tooltip"
  when={derived.tips}
>
  <Pressable copies part="button" role="button" />
</Wrap>
```

The drawn element's host takes the margins and the flex placement the
wrap's own rules give, as the web's part is that host, so a tour stop's Skip
keeps to the start of its row. Words the wrap holds take the text style of
the region they land in, as slotted text inherits from the slot's part, so
the stop's Next is in its button's label color on a phone too.

A flag given words holds while they are not empty, as the tooltip stands
open while the result has words. `gives` may write words out, as a tour
stop gives its Skip button `emphasis: 'ghost'`, and no other attribute of
parts takes words.

A text's `widest` names the words it may say, each a prop or a computed
value, and the text is as wide as the widest of them, as a copy button's
label keeps its width from Copy to Copied: the web stacks the words in one
cell, and a phone measures each.

**A token a rule sets on a part reaches that part's subtree**, as
`'--helix-color-foreground'` on a panel does: the parts inside it, the
elements passed into a region inside it, and an element a view inside it
draws, on a phone as on the web, where the custom property inherits through
the flat tree. The parts beside it read the theme's own value.

## Form controls

An element that is a form control declares a `validation`: the prop that
makes an answer required, `required`, the prop that holds the page's own
message, `feedback`, and the prop that holds the sentence for a missing
answer, `valueMissing`. The answer is what its toggle or its collection
holds. The native runtime runs core's validation machine behind it, so a
missing answer shows its message once the reader has changed the control or
called `validate()` on its ref, and the page's message shows at once. A
form's submission stays the web's.

**An element a reader types into declares its `text`**: the prop that holds
it, `prop`, the one that seeds it, `defaultProp`, and the events an edit
sends, `onBeforeChange`, `onInput`, `onChange`, and `onClear`. Its render
draws one `<TextInput>`, an `<input>` on the web and a `TextInput` on a phone,
whose `type`, `inputMode`, `enterKeyHint`, and `autoComplete` take the web's
words. A `<Pressable clears>` empties it, drawn while `text.clearShown` holds.
Its `validation` names the props that bound its text as well, `minLength`,
`maxLength`, `pattern`, and `type`, and `message`, the sentence a render
reads as `validation.message`. A phone checks the text with core's
`textVerdict`, and the web asks its `<input>`. A style table colors the words
a field shows while empty with `{ placeholder: 'control' }`.

**An element a reader moves along a track declares its `range`**: the prop
that holds the value, `prop`, the one that seeds it, `defaultProp`, the props
that bound and step it, `min`, `max`, `step`, and `pageStep`, and the events a
move sends, `onBeforeChange`, `onInput`, and `onChange`. Its render draws one
`<View role="slider">`, the control, with its reading, `valuemin`,
`valuemax`, `valuenow`, and `valuetext`, and it may be `disabled` and
`readonly`. A render reads what the range computes as `range.fraction`,
where the value sits along the track, `range.fillFrom`, `range.fillSpan`, and
`range.fillTo`, where its fill starts, how far it runs and where it ends,
`range.reading`, the value, and `range.said` and `range.spoken`, the value as
a reader sees it and as a screen reader says it. The web element is a native
`<input type="range">`, and a phone runs the `range` machine over the
control, with a drag along it, a press that jumps, the keys, and a screen
reader's increment and decrement.

**A number a reader types and steps declares both**, a `text` and a
`range` on the same prop, and its control is a `<TextInput
role="spinbutton">`. Its range names `largeStep`, how many steps Page Up and
Page Down take, and `atMin` and `atMax`, the states it is in at either end,
and each `<Pressable steps="down">` or `steps="up"` steps it, again while it
is held. A phone runs the `spin` machine over the field the entry types
into: the text settles into the range as the reader leaves the field or
presses Enter, shows in its format while the field has no focus, and the
keys, a screen reader, and the steppers step it, with core's number-field
arithmetic, the same the web element reads. Its `validation` names the
sentences for text that is no number, `badInput`, a number past either end,
`rangeUnderflow` and `rangeOverflow`, and one off its step, `stepMismatch`.

**A score a reader picks from a row of steps declares a `range` too**, and
its control is a `<View role="radiogroup">`, as a rating's row of marks. Its
steps run from `step` to `max`, those below `min` left out, and its value is
empty until a reader picks one. Its range names `clearable`, the prop that
lets a reader take the score back to none, `onClear`, the event that says
so, `onPreview`, the event that says the score a drag shows, and
`optionLabel`, the words each score is named by, with `{score}` and `{max}`.
A render reads `range.full` and `range.part`, how many marks the score it
shows fills whole and how much of the next. A phone runs the `scale` machine
over the row: a press or a drag picks the step under the finger, the keys
and a screen reader pick the step after or before, and core's rating
arithmetic says where each step stands, the same rules the web lays its
options out by.

**A split a reader moves between two panes declares a `range` too**, and
its control is a `<View role="separator">`, the divider. Its value is the
start pane's share, as a percentage. Its range names `collapsed`,
`defaultCollapsed`, `collapsedSize`, and `collapsible`, which pane is shut,
which starts shut, how much of a shut pane still shows, and which panes may
shut; `onBeforeCollapse` and `onCollapse`, the events a pane shutting or
opening sends; `collapsedLabel`, the words a screen reader hears while one
is shut; `endMin`, the least the end pane keeps; `primary`, the pane that
keeps its length as the element's changes; `snap` and `snapThreshold`; and
the states `collapsedState` and `vertical`. A render reads `range.basis`,
where the divider stands as a length for the start pane, `range.flush`,
whether it stands against an edge with no pane beside it, and
`range.lowest` and `range.highest`, its bounds as a screen reader hears
them. A phone runs the `resize` machine over the divider: a drag on the
resize driver, a double tap, the keys, and a screen reader move it, and
core's splitter arithmetic bounds it, the same the web element reads.

**An element a reader picks files into declares its `files`**: `list`, the
value a repeat's `each` reads as `files.list`; `accept`, `maxFileSize`,
`maxFiles`, and `multiple`, the props that screen a pick; `bytesLabel`,
`locale`, `removeLabel`, `rejectedText`, and `removedText`, the words its rows
and its announcements take; `hasFiles`, the state it is in while it holds a
file; and `onBeforeChange`, `onInput`, `onChange`, and `onReject`, the events a
change sends. A `<Pressable picks>` opens the picker, and a `<Pressable
removes>` in the repeat takes its row's file out. Each entry of the list holds
`key`, `name`, `size`, `kind`, `removeLabel`, and `file`, and how its upload is
going: `statusHidden`, `barHidden`, `wordsHidden`, `fill`, `statusText`,
`progressLabel`, `done`, `failed`, and `sending`. A phone runs the `files`
machine over the files capability, and core's file-field rules screen a pick,
the same the web element reads. The web element holds `File`s and a phone holds
the capability's records.

**An element a reader builds a color in declares its `color`**: `prop`, the
prop that holds the text of the color, and `defaultProp`, the one that seeds
it; `alpha`, `format`, `readonly`, and `swatches`; `onBeforeChange`, `onInput`,
`onChange`, and `onCopy`, the events it sends; and the names of what it
computes, which a render reads as `color.x`: `reading`, `hue`, `saturation`,
`brightness`, `painted`, `tint`, `markX`, `markY`, `wheelX`, `wheelY`, `square`,
`squareReversed`, `sampleLabel`, `formatWord`, `formatLabel`, and the lists
`channels`, `fields`, and `presets`. Its render draws the parts the machine
binds by name: `grid`, `grid-mark`, `grid-saturation`, `grid-brightness`,
`wheel`, `wheel-hue`, `wheel-band`, `wheel-ring`, `sample`, `channel`, `value`,
`field-input`, `format`, and `swatch`. `<TextInput>` and a box whose role is
`slider` are the color's to hold, with no `text` and no `range`. A phone runs
the `color` machine, and core's color picker arithmetic says where each point
and key takes it, the same the web element reads. A rule reads
`color-picker-tint`, the hue at full strength, on a phone, where the web builds
it with `hsl()` from a number.

**A text field that opens a color picker declares a `colorField`** beside its
`text`: the names of what it computes from the text, `picked`, the last text
that was a color, `painted`, the color its swatch paints, and `said`, the
trigger's name. A phone runs the `color-field` machine over the box that draws
the picker, so a move in the picker is an edit of the text.

**A prop may hold a function**, written `callback()` with the signature a
phone's component types it by, as `validate` is. No attribute holds one. An
event whose detail differs on a phone is declared again in core's
`events/details.ts` as `Native` and its name, as `NativeRejectDetail` carries
the capability's records. A `<Wrap renders={props.x} passes={entry.y}>` draws
what the function returns in place of what it holds, given `passes` and the
copy's place, and draws what it holds where no function is given.

A node only a phone draws says `platform="native"`, as a checkbox's tick does,
which the web draws as a mask on the mark. The web element and the manifest
leave it out. A node drawn while a prop or a state does not hold is
`!props.x && <Node />`, as a checkbox draws its `check` region while it is not
indeterminate, and a region can be `hidden`, as a switch's `on` region is
while it is off.

A rule's `within` can say what holds of the part around, an interaction or a
part inside it that holds one: `[part="field"]:hover [part="control"]`.
`holds` says the same of a part inside the target, `:has()`, `also` reads the
parts a node is as well, and `lacks` an absent attribute.

An element only the web has, such as a skip link, says `platform: 'web'`.
`helix system components` gives it a component that draws nothing on a
phone, and `helix system platforms` names no native component for it.

A node asks whether a region holds something by reading `slots.x`: a wrap
drawn `when={slots.headerActions}`, as a card's header row is, and a view
`hidden={!slots.default}`, as a divider's content is. A phone reads the
region's prop, and the web element its slot.

A part that opens and closes writes its one row as `fit(0)` or `fit(1)`, a
value of `gridTemplateRows` alone, as a step's stage does. The web writes
`0fr` and `1fr`. A phone measures what the part holds and draws the part at
that height or at none, and a transition of `grid-template-rows` moves the
height between them. Once open, the part takes the content's own height, so
content that reflows while open is never clipped or left short. Closed, what it holds stays
drawn. Pair `fit(0)` with `visibility: 'hidden'`, as a step's stage does, so
a screen reader and a press skip it on both platforms. `helix system build` refuses
`fit()` on any other property, inside a value of several words, and with any
share but `0` and `1`.

A rule under `inlineSize: { below: '22rem' }` holds while the element is
narrower than that: `@container (inline-size < 22rem)` on the web, on a host
that is its own size container, and the host's laid-out width on a phone.

Each family's conformance scenarios, which hold its web element and its native
component to one behavior, are in
[`helix/testing`](../testing/README.md#conformance). A family that binds a new
machine adds the scenarios that take its transitions.

## Custom properties, repeats, pictures

A view's `style` sets a custom property the web writes in the part's style,
as a meter writes how much of its bar is filled as `--meter-fraction` on its
fill: a rule's `measured()` reads it on that part, on a phone as on the web.
The property keeps the name React's `style` writes, since it is the one the
web element sets. A `<Repeat>` draws what it holds as many times as its
`count` says, each copy standing where it is drawn among the others, as a
skeleton draws a line of its paragraph for each of its `lines`. With `each`,
it draws a copy for each entry of a list, a prop that holds one or a
derivation that computes one, such as `kbd-key-list`, keyed by the entry's
`key` field. What a copy holds reads the entry's fields as `entry.x` and its
place, from 0, as `index`. A part whose `labelledby` names a region is named
by the words passed into it, or the words the region falls back to:
`aria-labelledby` on the web, and the label a phone reads. It may name
several, separated by spaces, and the part's own name reads its `label`, as
a stepper's `labelledby="decrement label"` names it "Decrease Guests". A
role may be picked by a prop and be none otherwise, as open content is a region:
`role={props.open ? 'region' : ''}`. A rule on a part that is `exact` is on
its part alone, `[part="skeleton"]`, and not on a node that is another part
as well, `skeleton line`. A slot that `names` the element takes words given
to the prop of its name as the element's name, and draws only content passed
in, as a meter's `label` does.

An `<Image>` draws a picture from its `src`: an `<img>` on the web and
React Native's `Image` on a phone, which takes the part's `object-fit`. Its
load machine stands `idle` with no source, then `loading`, then `loaded` or
`failed`, and a new source starts it over. The element is in the state
`loading`, `loaded`, or `error` as the machine stands, as Image's states are
named. A picture with no source stands in the state its `empty` names,
`loading` or `error`. `onLoad` and `onError` name the events it sends, and an
empty `alt` is a picture that is decoration.

## Layers

A `<Layer>` is what the element opens over the page: a dialog, a popover, a
menu, or a tooltip. The web element draws it in the top layer, as a
`<dialog>` or a popover, and a phone draws it in the layer host `HelixRoot`
draws over the app, with the theme and the element's sets provided again
inside it. Its `open` reads the prop it stands open while, which the
element's `toggle` holds as its `prop`, so a press, a dismissal, and the page
writing the prop turn one toggle, and such a toggle needs no pressable. The
element is in the state `open` while the layer stands open.

- `modal` holds the reader in the layer until it closes, as `showModal()`
  does: the rest of the page takes no press, no focus, and nothing a screen
  reader reaches.
- `anchor` names the part the layer is placed against, which may be a
  region's `part`, as a popover's trigger is, and
  `placement` the side it would stand on, as Floating UI names placements,
  `bottom-start` where it names none. The layer turns to the other side where
  that one has no room, and the element is in the state `placedTop`,
  `placedRight`, `placedBottom`, or `placedLeft` for the side it lands on,
  and `alignedStart` or `alignedEnd` for the end of that side, as the web's
  floating controller writes them. `offset` is its distance from the anchor.
- `target` reads the prop that holds the id of what the layer is placed
  against, where that is no part of the element, as a tour stop's `for`
  names the control it explains. The web element finds the element by its
  id. A phone has no document to search, so the view registers under the id,
  a Helix element given an `id` its own view and any other view with
  `useTarget` from `@fusion.dev/helix-native`, and the layer is placed
  against the view registered last under it. A target that holds no id
  places the layer in the window, as a value the element computes may say,
  as a tour's dialog stop reads `derive('tour-stop-aim')`. A layer takes an
  `anchor` or a `target`, and the rest of this list holds of either.
- `ariaHidden` makes a layer a look alone, as a tour's spotlight and its
  backdrop are: it takes no touch, no key, no close request, and no focus,
  no screen reader reaches it, and a phone draws it under every other
  layer. It may hold nothing, and it may carry the custom properties a view
  carries, which its rules read with `measured()`.
- `arrow` names a part inside an anchored layer that points at the anchor.
  Floating UI stands it on the edge that faces the anchor, half its own box
  outward, and over the anchor along that edge, kept the layer's largest
  corner radius from each end. The layer's offset is measured to the
  arrow's point, and its rules read where the arrow is centered as
  `floating-arrow-x` or `floating-arrow-y`, with `measured()`.
- `presentation` makes an anchored layer a sheet or a popover, as core's
  `presentedAs` decides on both platforms: under `auto`, a sheet along the
  window's bottom edge in a window narrower than 30rem, Dialog's breakpoint,
  and a popover placed against its anchor in a wider one; under `sheet` or
  `popover`, that one at every width. A sheet is placed by no anchor, its
  element is in the state `sheet` and in no `placed` or `aligned` state,
  and a press beside it dismisses it as `closedby` says and reaches nothing
  under it. The web element passes `presentation` to core's
  `PopoverController`, which runs `PresentationController`, lets go of the
  anchor while the panel is a sheet, and stops a press beside the sheet on
  the window, as a popover's `::backdrop` takes no press. A phone reads the
  window at the reader's text size.
- `notice` draws the layer above every other, dialogs included, whenever it
  opened: it stays read and pressable while a modal layer holds the reader,
  and a close request goes to the layer under it while one is open, as a
  toast's stack does. A notice is never `modal`.
- `closedby` says how a reader dismisses it, as `<dialog closedby>` does:
  `any`, a press outside it or a close request; `closerequest`, a close
  request alone, which is Escape, a phone's back, or a screen reader's escape;
  `none`, neither. A dismissal asks the toggle to close, so its
  `onBeforeClose` event may refuse it. It may read a value the element
  computes, as a dialog's reads `dialog-dismissal`, `none` under `persistent`
  and `any` where `closedby` names nothing, so a press on its scrim closes it
  as the web's dialog closes.
- `refuses` answers a press outside that `closedby` keeps open: the layer's
  part is `data-refused` for the length of the animation its rules give it
  under `part: { 'data-refused': true }`, as a dialog swells and settles.
- `band` stands an anchored layer under its anchor across the whole
  window, from the anchor's bottom edge, as a megamenu's band spans the page
  under its bar: it is placed on no side, so its element declares no
  `placed` or `aligned` state, and nothing that places a layer on a side,
  `placement`, `offset`, `cross-offset`, `flip`, `arrow`, `side`, or
  `presentation`, reads with it. A phone measures the anchor in the window
  each frame while it is open, and its rules read the room under it as
  `floating-available-block-size`. The web element places its own band.
- `alone` keeps one layer of the element's kind open at a time, as a
  bar's megamenus: opening one asks the one open to close, through its
  toggle, which may refuse, and a press on another's anchor is no press
  outside, so it opens that one in place. The web element hands its own
  over.
- `cross-offset` slides an anchored layer along the side it stands on, and
  `flip={false}` keeps it on that side where the other has more room, as a
  popover's do.
- `anchorPress` says what a press drawn in the layer's anchor does to it once
  the press's own event stands: `toggle` opens it or closes it, as a
  popover's trigger does; `close` closes it, as using a control spends its
  tooltip; and `none` leaves it. A press that says whether it is expanded,
  as a Button does, says whether a layer it toggles stands open.
- `longPress` opens the layer on a long press of a press drawn in its anchor,
  ranked as that press's own, as a speed dial does under
  `open-on="long-press"`. `arrows` opens it on Down or Up on such a press,
  with focus on its first or its last control, and with Alt where it holds.
- `initialFocus="press"` moves focus into it only as a press or a key in its
  anchor opens it, as a menu written open by the page leaves focus where it
  is, and `initialFocus="down"` only as Down on a press in its anchor opens it
  or finds it open, as a megamenu's trigger leaves focus on itself as a press
  opens the panel and takes Down into it. Closing gives focus to the anchor
  however it closes, unless `restoreFocus="held"` gives it there only where a
  control inside held it, as a menu's does, or `restoreFocus="dismissed"`
  only where a close request or a press outside closed it, as a megamenu's
  does.
- `hint` is the words a tooltip says of its anchor. Each press drawn in the
  anchor is described by them, `aria-describedby` on the web and a phone's
  hint, unless they are already its name, and a long press on it opens the
  layer where the press has no long press of its own, as hover opens it on
  the web. A layer whose role is `tooltip` leaves focus where it is.
- The layer's part is `data-placed` once it stands against its anchor, as
  the web's floating controller writes it, so a rule under
  `part: { 'data-placed': true }` moves it in from where its other rules
  hold it. A layer is another part as well while a state holds, as any part
  is: `also={{ 'surface-bottom': state.placedBottom }}`.
- `side` is the edge of the window the layer stands along, as a drawer
  does: `top`, `bottom`, or `start` and `end`, which the writing direction
  turns into a side. A phone draws it against that edge, stretched along it.
- `swipe` lets a touch move the layer toward its side and take it out
  through it, or reads the prop that says so, as a drawer's `swipe` does. A
  sheet swipes along the bottom edge. A swipe out is a dismissal, which
  `closedby="none"` and a refused `onBeforeClose` keep open. `snapPoints`
  reads the prop that holds the shares of the layer a reader can leave on
  screen, as a drawer's `snap-points` holds `0.5 1`: the layer opens at the
  smallest and a swipe rests it at the one core's `settleSwipe` gives, and
  its element is in the state `snapped` while it rests short of the whole.
  The web's drawer swipes with core's `SwipeController`, and a phone with
  Gesture Handler. **A list inside the layer hands its drag to the layer** as
  core's `handsOver` says, on both platforms: a drag toward the edge once the
  list can scroll no further that way and has stood still for `SCROLL_LOCK`,
  half a second, and a drag away from the edge while the layer rests short
  of the whole.

**A layer's attributes may read what a feature before it computes**, as a
tour stop's `open` reads `stop.shown` and its `offset` reads `stop.reach`,
and a layer may open on such a value with no toggle and no `open` state.

`helix system build` refuses a layer with no `open`, one that is not
`ariaHidden` with nothing inside it, a `placement`, an `offset`, an `arrow`,
or a `presentation` with no `anchor`, a layer inside another layer, a
repeat, or a vector, an anchor inside the layer, an arrow outside it, a
modal notice, and an element that does not declare the states its layer
sets. It refuses a layer that swipes with neither a `side` nor a
`presentation`, `snapPoints` on a layer that does not swipe, `snapPoints`
written out where it reads a prop of words, and an element whose layer snaps
and that declares no state `snapped`. A layer that may be a sheet needs a
`presentation` prop that takes `auto`, `popover`, and `sheet`, and a rule on
it under `{ sheet: true }` that pads it by `safeArea('bottom')`, so its last
row clears the home indicator.

**A layer's rules alone read the window**, as a component cannot know the
window and a layer's box is placed in it:

- `window: { below: '30rem' }` in a rule's `when` holds while the window is
  narrower: `@media (width < 30rem)` on the web, and the window's width at the
  reader's text size on a phone.
- A viewport length, such as `100vw` or `100dvh`, is a share of the window. A
  phone's `dvh` is the window less the software keyboard where `HelixRoot`
  keeps layers above it, and its `vh`, `svh`, and `lvh` the whole window.
- `on({ backdrop: 'surface' }, [...])` styles the scrim behind the layer,
  `::backdrop` on the web, which a phone draws under the layer.
- `safeArea('bottom')`, or another edge, is how far content keeps from that
  edge of the window to clear the home indicator, a notch, or a rounded
  corner: `env(safe-area-inset-bottom, 0px)` on the web, and the safe area
  `HelixRoot` hears on a phone, which is 0 at the bottom while the software
  keyboard shows. A sheet pads its last row by it:
  `paddingBlockEnd: sum(token('space-lg'), safeArea('bottom'))`.

A rule on any other part that does one of these is refused. **The host's own
rules may read the safe area too**, as an app header at the top of the window
stands clear of the status bar: a phone measures where the host stands in
the window and reads the share of each inset that reaches into it, and the
host's `safeArea('top')` is none under a router's own header and inside a
scroll view.

## Features that follow time and scrolling

A source's `pageScroll` follows the page the element stands over as it
scrolls, as an app header lifts off the page once it has scrolled:

- `scrolled` names the state that holds once the page has moved 8 from its
  top, until it is back within 2, and `onScrolledChange` the event sent each
  time that turns, its detail `scrolled`.
- `hideOnScroll` names the prop that moves the element out of the way on a
  scroll down past its own height, and `hidden` the state that holds then. A
  scroll up of more than 4 takes it out, as does a return within that height
  of the top, and `keepInView` names a prop that keeps the element in view
  while it holds.
- `scroller` names the prop that holds the id of what scrolls. The web
  follows the window, or the element of that id, and a phone the scroll
  view the element is drawn in, or the view registered under the id with
  `useTarget`, through the scroll capability's `observe`.

`helix system build` refuses a `pageScroll` with no `scrolled`, and a
`hideOnScroll` named without its `hidden`.

**One press drawn in two places is one press**, as an app header's toggle
stands at the start of its bar or at its end: two pressables of one name,
each drawn while a value holds that never holds with the other's, run one
press machine, and the toggle counts them as the one press that turns it. A
`banner` is the page's header, a landmark of its own, which a phone
announces nothing for.

A view blurs what is behind it with a backdrop filter, and is clipped by an
inset, which a transition of `clip-path` moves:

```ts
rule({ backdropFilter: fn('blur', token('material-blur-md')) })
rule({ clipPath: fn('inset', ['0', '0', '100%', '0']) })
```

The web writes both as they are. A phone draws the blur through expo-blur on
iOS and the inset as a view that clips the box, as
[`helix/native`](../native/README.md#styles-a-phone-draws) says.

A source's `delay` is a wait the element starts as it is drawn: `duration`
names the prop that holds the wait in milliseconds, `pending` the state that
holds while it runs, and `idleWhen` a prop that stops the state while it
holds and starts the wait again as it stops holding, as a loader waits out
its `delay` and waits again when its `idle` clears. `restartOn` names a prop
whose change starts the wait again, as a new image `src` holds its
placeholder back once more. Both platforms run core's `delay` on the timers
capability, so a fake clock moves both.

A source's `copy` puts text on the clipboard as its pressable that `copies`
is pressed, as a copy button copies its `value`:

- `prop` names the prop that holds the text, and `duration` the prop that
  holds how long the result stands, in milliseconds.
- `onCopy` names the event sent once the text is on the clipboard, with it as
  `value`, and `onError` the event sent where a press put nothing there,
  because the text was empty or the clipboard refused the write.
- `copied` and `failed` name the states the element is in while each result
  stands. The press's part is `data-copied` or `data-failed` then.
- `label` names the words the element is named by as it stands, taken from
  `labels`: `idle`, `copied`, and `failed`, each a prop or a computed value.
  `status` names the result's words while it stands, and nothing at rest. A
  render reads them as `copy.label` and `copy.status`.

Both platforms write through the clipboard capability and end the result
on the timers capability, so a fake clipboard and a fake clock move both. A
phone says the result's words to a screen reader as the web's live region
does. `helix system build` refuses a `copy` with no pressable that `copies`,
or more than one, and a pressable that `copies` in an element with no `copy`.

A source's `countdown` is a time the element spends once it is drawn, as an
announcement dismisses itself after its `duration`: `duration` names the
prop that holds the time, `onDone` the event sent once it is spent, `paused`
the state that holds while it is stopped partway, and `waitWhile` a state
that keeps it from starting until the state stops holding. Both platforms run
core's `countdown` on the timers capability. A touch, focus, and a page or an
app away from the front each hold it, and it runs on from what was left.
React Native says whether a screen reader runs and never where its focus is,
so a phone holds the clock for as long as one runs.

A source's `queue` has a queued element wait its turn behind the queued
elements of its kind before it: `prop` names the prop that queues it, and
`queued` the state that holds while one before it is still drawn. A phone has
no parent to read, so the elements of one kind drawn directly inside the same
Helix element, or outside any, are siblings, in the order they were first
drawn.

A countdown whose `onDone` is the event its element's toggle closes with
closes the toggle once it is spent, as a toast item's spent `duration`
dismisses it through the same `dismiss` as its button, which a handler may
refuse. A toggle that says `closeOnEscape` closes on Escape from a hardware
keyboard on its pressable that `toggles`, as a press does.

A source's `notices` holds the messages passed into the element, as a
toast's stack holds its items, and a source's `notice` makes the element one
of them:

- `showing` names the value the stack computes, whether it holds a message,
  which its layer's `open` reads as `notices.showing`. Such a layer needs no
  toggle and no `open` state.
- `maxVisible` names the stack's prop that says how many messages show at
  once. Past that many open messages, in the order they were drawn, a message
  is in the state its `deferred` names, which its countdown's `waitWhile`
  reads.
- `swipeDirection` names the stack's prop that names the edge a touch swipes
  a message's `part` toward, `end` unless it names `start`, `top`, or
  `bottom`. Past halfway, or quickly, the swipe asks the message's toggle to
  close, and a refused close springs it back.
- `bubbles` names the event of its messages the stack hears after each
  message's own handler, with the same event, as the web's event bubbles to
  its region.

A touch on any message holds every message's countdown. The web's region is
written by hand and sets these on its items itself, and a phone joins the
messages to the stack through a context its layer carries.

A live node that is `urgent`, or reads a value that says so, says its words
assertively, as a toast's `danger` message is said: the web's `alert`
region, and an assertive announcement on a phone. A rule may read
`data-color-mode` as present or absent, with `lacks` or `has`, as a toast's
stack draws its messages in the scheme opposite the page's unless it names
a mode, and `inherited()` may read the theme's `_helix-mode-inverted`.

## Tours

A source's `tour` holds the stops passed into the element and shows them
one at a time, as a tour does, and a source's `stop` makes the element one
of them, as `src/tour.ts` describes field by field:

```tsx
tour: { onAsk: 'tourAsk', onBeforeChange: 'beforeActivate', onChange: 'activate', prop: 'index', ... },
stop: { back: 'back', next: 'next', onAsk: 'tourAsk', skip: 'skip', target: 'for', ... },
```

- **The element's `toggle` holds whether the tour runs.** A skip asks the
  toggle's `onBeforeClose` event and closes it, and finishing the last stop
  closes it with nothing asked, after `onComplete` and `onStatus`. A tour's
  toggle needs no pressable.
- **A move asks `onBeforeChange` first and tells `onChange` once it stands**,
  each with the new index as `value`. Writing the `prop` moves with nothing
  sent. Back passes over a `wait` stop, and the arrow keys along the line
  move from a stop's panel and never finish the tour.
- **A press on a stop's `back`, `next`, or `skip` sends the stop's `onAsk`**
  with `what` it asks, and the tour hears the same event after it, as the
  web's bubbles to the tour.
- **The tour computes `lit`, `veiled`, and the lit box**, the four lengths
  after its `spotlight`, which its decorative layers open on and read as
  `tour.spotlight.x` and the rest. A stop computes whether it is `shown`,
  its `place` in words, whether that place is `counted`, its panel's `name`,
  what it `said` as it shows, its `reach` from its target, and the words of
  its three controls, `stop.words.back` and the rest, and the tour writes
  `current`, `first`, and `last` over the stop's own props. The words of the
  controls are the tour's `backLabel`, `nextLabel`, `skipLabel`, and
  `doneLabel`.
- **A `wait` stop waits for its target to be drawn**, in the tour's
  `waiting` state, after `onStatus` with `waiting`, and a stop's `effect`
  runs as the tour reaches it, with the tour `preparing` while a promise it
  returns settles.

The web's tour is written by hand and reads its stops from its slot. A
phone's stops join the tour through a context, in the order they are first
drawn. `helix system build` refuses a name either source holds that the
element does not have.

## Scroll areas, sections, clocks, and counts

A source's `scroll` names a part that scrolls and what the element tells
of it, as a scroll area does with its viewport:

- Each edge, `blockStart`, `blockEnd`, `inlineStart`, and `inlineEnd`, names
  the state that holds while there is more past that edge, as
  `moreBlockEnd`. The edges are logical: `blockStart` is the top.
- `overflows` names the state that holds while the content is longer than
  the part on an axis it scrolls.
- `onScroll` names the event sent each time the part moves, and `onScrollEnd`
  the event sent once it comes to rest, as the web's `scroll` and
  `scrollend`.

The web element measures its own box. A phone reads the scroll
capability's `observe` on the part's scroll view, and the part shows the
platform's scroll indicators. On both platforms the part is a stop of
keyboard focus while it overflows, and the keys scroll it. A phone makes the
frame around the scroll view the stop, and the host is `focusVisible` while
that frame shows the ring.

A source's `sections` follows the sections of a page as it scrolls, as an
outline marks the link of the section being read. A phone has no document to
find a section in by its id, so each section registers its view with
`useSection` from `@fusion.dev/helix-native`, and the runtime gives the
element the list `list` names, which a render reads as `sections.list`. Each
entry holds:

- `id`, `label`, and `level`, as the section registered them
- `href`, the fragment that links to it
- `depth`, its depth in the outline from 1, and the flags `depth-2` to
  `depth-6`
- `current`, which is `location` while the section is marked, and the flag
  `marked`

`offset` names the prop that holds the reading line, `marks` the prop that
marks the section being read or every section on screen, `scrollBehavior` the
prop that says whether a press on a link glides, and `onChange` the event
sent with the marked section's id as `value`. A repeat draws a link for each
entry, `<Repeat each={sections.list} key="id" part="links">`, and a part of a
copy is another part as well while a field of its entry holds, with
`also={{ 'link-current': entry.marked }}`. A press whose `href` is a fragment
goes to the section registered under that id. `follow` names the prop that
keeps the marked link in view, `link` the part drawn for each section, which
takes a ref for each copy, and `indicator` the part that travels to the marked
link, placed against the box that holds it, as an indicator is placed at a
selected tab.

A source's `section` makes the element a section of the page, with
`section: { id, label, level }`, each a prop's name. The web finds the
element by its id, and a phone registers its view under the id the `id`
prop holds, as Outline Section does with `anchor`.

A source's `clock` ticks on the time of day: `expires` names a derivation in
`@fusion.dev/helix-core/derivations` that says, from the props and `now`, how
many milliseconds what is drawn holds, as a relative time moves from "4
minutes ago" to "5 minutes ago". Every derivation of the element is given the
time of the last tick as `now`. A derivation that answers `undefined` keeps
no clock, and one that answers a wait that is not finite draws once, as
Format Date does while `frozen`. Both platforms run core's `wallClock` on the
timers capability, which stops while the page or the app is away and catches
up as it comes back. `restartOn` names the props whose change starts the
clock again and reads the time of day afresh, as Format Date's `date` and
`relative` do. A change of any other prop draws from the last tick. With no
`restartOn`, every prop starts it again.

A source's `maxVisible` names the prop that says how many of the elements
passed in are drawn, its `prop`, as an avatar group folds the people past its
`max` into a count. The web hides the rest from its sheet, and a phone
leaves them out. What the element computes from its default region still
counts them all, so a count can say who it stands for. **`middle` folds the
middle away**: the first element and the last `prop` less one stay, and the
first takes how many were folded, the elements folded, and the element's
`words` prop, in the props `middle` names, as a trail's first crumb draws
the menu of the crumbs folded after it:
`maxVisible: { middle: { count: 'fold', items: 'foldCrumbs', label: 'foldLabel', words: 'expandLabel' }, prop: 'maxItems' }`.

A wrap that `draws` another element passes a node it holds `into` a region
of that element in place of its default region, as a crumb's fold passes
its button into its menu's `trigger`. An item drawn inside an element that
another one draws joins that element's set, as the fold's rows join its
menu, and an item an element draws of its own set joins no set, as a
checkbox group's select-all is no box of the group. `bubbles` names the
drawn element's events, separated by spaces, that reach the element around
as its own, as a composed event leaves a shadow root on the web: a crumb's
fold has `bubbles="before-select select"`, so choosing a row of its menu
sends the crumb's `before-select` and `select`, and a handler that refuses
the request refuses the row's.

An `<Announce>` holds words a screen reader is told, its child: a live region
on the web, and an announcement on a phone. A node that `follows` a value
says them as the value changes, as an event that follows it is sent, as a
meter says its reading under `live` as it moves into another band. A node
that `arrives` says them as the element is drawn, as an empty view says its
heading. Any other says them as its `when` turns on, to the reader who
pressed the element, as a button says it is pending. A `when` on any of them
says when the words may be said.

An event that `follows` a value the element computes is sent as that value
changes after the first render, and a flag's only as it turns on: a meter
sends `band` as its reading moves into another band, and a progress bar sends
`complete` as it arrives at its end. An event that `arrives` is sent on the
first render too, where its value already holds, as a QR code whose value is
too long from the start sends `error`. `gives` names what each field of its
detail holds, a computed value or a prop, on any event: a callout's `dismiss`
gives its `label` from its heading's words, or its content's.

## Sets whose items a reader removes

A set whose items a reader removes says how in its collection: `removeOn`
names the event an item's press sends to ask, which Delete and Backspace on
the item send as well where that press is drawn, and `focusWhenEmpty` the
part that takes focus once no item is left, as a tag group's `dismiss` and
its `empty` part. The set removes nothing: the page takes the item out, and
focus that was on it moves to the next item, or to the one before after the
last, and to the `focusWhenEmpty` part where none is left. A selected item
that asked and left takes its value out of the set's selection, which sends
the set's `onChange` event. Any other press of an item reaches its set once
its event stands, as a tag's `dismiss` reaches its group, and a press a
screen reader is offered as an action of the press around it runs when the
reader takes the action.

`keys: { enter: 'selects' }` has Enter on an item that is no link select it
as Space does, as a tag group's does, where a list's acts on the row.
`keys: { adds: 'replace' }` has Control or Command with Space add or take
out an item only under `selection-behavior="replace"` in a set that selects
many, as a tag group's does. Elsewhere a phone takes the key and does
nothing with it, as the web's tag, a grid cell, does nothing with it. A
list's adds or takes out the row wherever Space presses it.
`keys: { escape: 'plain' }` has Escape let go of the selection only with
neither Control nor Command held, as a tag group's does, where a list's lets
go with either held too. `order: 'pressed'` writes the selected values in the
order they were pressed, as a tag group writes `late,open` after a press on
Late and then on Open. A Shift range and Control or Command with A write them
in the order the items stand, which is the order every change writes without
it, as a list's does. **A press on an item whose link is drawn inside its
press**, as a tag's label and a list row's words are, opens the link and
selects nothing in a set that selects, as a press on the web's link part only
follows it. An item named by more than its default region lists the regions
in `memberOf`'s `labelledby`, as a tag is named by its `start` and `default`:
typeahead matches their words, and an item with no `value` stands for them in
its set's value.

`mix()` takes a fourth argument, `'srgb'`, to mix the encoded channels, as a
tag's fill is mixed, and a phone mixes the same channels. A rule under
`canHover: true` holds where a pointer can hover, `@media (hover: hover)`, the
web's alone. A link part's `href` is a part condition, `[part="link"][href]`,
while the link has somewhere to go.
