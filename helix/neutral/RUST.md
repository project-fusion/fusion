# Rust components from the neutral source

An assessment of how `helix system` could write Rust UI components from the
families in `helix/neutral/src`, with GPUI, the UI framework of the Zed editor,
as the first target. It answers five questions for the owner, gives a phased
plan, and ends with the decisions left open. Written November 20, 2026, against
the pilot branch at `0ddf2951a5`.

## The recommendation in brief

- **Write a GPUI emitter inside the compiler.** It reads the intermediate form
  in memory as `ir::Family`, the struct `helix system build` serializes, and
  writes one Rust module per family. Each element becomes a GPUI component with
  typed props, and its style table becomes ordered conditional style calls. The
  compiler works out the cascade before any code runs.
- **Pair the generated code with a small runtime crate written by hand**, as
  `helix/native` pairs the React Native components. The crate holds the theme,
  units, focus rings, transitions, layers, and the state of each element.
- **Split the Rust work in two.** A crate with no UI framework holds core's
  machines, its derivations, and the token values, all ported to Rust. A second
  crate is the GPUI runtime. A later Iced, egui, or Blitz target would reuse the
  first crate and write its own emitter stage and runtime.
- **Start with the families that are drawn and pressed**: Badge, Tag, Kbd,
  Divider, Card, Button, Icon Button, and the rest of wave 1 below. They need
  the press machine and nothing more. Layers and text fields come later, since
  they need the most runtime code.
- **Budget about six months of one engineer for waves 1 to 4**, which covers
  about 70 of the 180 elements. Charts, Map, Sandbox, Terminal, and Data Table
  are each a project of their own.

## 1. The source the emitter reads

### What the intermediate form carries today

`helix system build` writes the intermediate form of 180 elements on the pilot
branch, each `build/ir/<family>/<element>.json`. Its version is 2.0. The
struct is defined once, in `helix/cli/src/family/ir/mod.rs`, and it carries
the following:

| Field | What it holds | Size on the pilot |
|---|---|---|
| `api.props` | Each prop's name, type, default, tier, and whether only the web has it | 180 elements |
| `api.events` | Each event's name, whether it can be canceled, and its detail's field names | 180 elements |
| `api.states` | The custom states an element sets | 180 elements |
| `api.derived` | Values computed from props by a derivation in core, by name | 49 elements, 180 derivation names |
| `api.host` | What a screen reader hears of the host: role, label, range values, `busy` | 28 elements |
| `api.<feature>` | A feature's configuration: `toggle`, `collection`, `validation`, `entry`, `stack`, and about 80 others | 1 to 27 elements each |
| `machines` | Which machine runs, and what each binding names: a part, a prop, an event, a key, a state | 92 machine names |
| `tree` | The part tree: `box`, `text`, `pressable`, `region`, `when`, `wrap`, `repeat`, `live`, `layer`, `field`, `image`, with attributes that are literals or `{ "bind": prop }` | 3,392 nodes |
| `rules` | Each rule's target, conditions, declarations, private values, specificity, and order | 7,338 rules, 29 keyframe sets |

The conditions a rule applies under, by how often each appears:

| Condition | Uses | What it asks |
|---|---|---|
| `attribute` | 1,585 | A prop's value, or a `data-` flag on a part |
| `state` | 603 | A custom state |
| `media` | 564 | Forced colors (163), print (149), reduced motion (157), pointer and hover kind (95) |
| `part` | 525 | An attribute a part carries |
| `pseudo` | 448 | `focus-visible` (218), `hover` (185), `active` (68), `focus-within` (33) |
| `not`, `one-of`, `also` | 342 | Combinations |
| `disabled` | 145 | A part's `disabled` |
| `absent`, `filled` | 157 | Whether a prop or a region holds anything |
| `dir` | 87 | Left to right or right to left |
| `within`, `place`, `child`, `host-place`, `host-of-type` | 146 | Where a part stands among others |
| `entering` | 38 | The first frame, `@starting-style` on the web |
| `container`, `window` | 26 | The size of a container or the window |

A declaration's value is a token (11,351 uses), a hook (2,904), a private value
(1,786), a measured length (777), arithmetic (1,850), a color mix (330), a
light and dark pair (120), or raw CSS text (12,075). Of the 7,338 rules, 2,342
are the web's alone and 1,047 carry a selector written out for the web, so a
non-web target reads about two thirds of the rules.

### What a Rust target needs that the form lacks

1. **Typed values.** Most declarations hold CSS text, such as `22%`, `flex`,
   `50% -50%`, or a shadow list. The React Native runtime parses that text on
   the phone, in `helix/native/src/style/values.ts` and `properties.ts`. A Rust
   emitter has to parse it in the compiler. The parser should produce a lowered
   form with typed lengths, colors, keywords, and expanded shorthands, and it
   should list each property a target cannot draw, as native's `dropped` list
   does.
2. **Event detail types.** An event names its detail's fields, such as
   `press: ['pointerType']`, with no types. The React Native emitter types
   them from the TypeScript event classes. A Rust struct needs the types, so
   the form needs them too, or the emitter needs its own table.
3. **The machines' guards and updates.** Core's statecharts are data, and
   `helix system machines` already flattens them into a switch for each state.
   Their guards and updates are TypeScript functions, such as `changeable` and
   `flip` in `core/src/machines/toggle/machine.ts`. The structure can be
   emitted as a Rust `match`. The functions have to be written again in Rust.
   They are small and pure, and core's conformance vectors can hold the Rust
   copies to the same answers.
4. **The derivations.** 180 derivation names point at functions in
   `@fusion.dev/helix-core/derivations`, such as `badgeText`. Each needs a
   Rust copy, held to shared vectors.
5. **The feature machines.** The form names 92 machines. Nine of them are
   core's statecharts. The other 83, such as `combobox`, `date-picker`, and
   `data-table`, exist only as TypeScript in `helix/native/src/machines`,
   about 50,000 lines. A Rust target writes each one again by hand.
6. **Locale words.** Number formats, plurals, and dates come from `Intl` on
   both existing platforms. Rust has no `Intl`. ICU4X is the usual crate.

### In memory, from the form

**The emitter should read `ir::Family` inside the compiler**, the same value
the web emitter in `css/` reads, after `Family::named` has expanded the
machines and tagged the tree. The compiler is Rust, so nothing is gained by
writing JSON and reading it back, and reading the struct keeps the emitter in
step with the type checker. Reading the resolved families before that point
would skip the machine expansion and the tagging, which every platform reads.
The JSON stays the contract for an emitter written outside the compiler.

The typed-value parser and the lowered form belong in the compiler too, beside
`ir/`, so a second emitter reuses them. The React Native runtime could later
read lowered values as well and drop its own parser, which is an option and
part of no phase below.

## 2. The output: GPUI

### The shape of the generated code

Two designs are possible:

- **An interpreter**, as `helix/native` is: one Rust renderer reads each form
  at run time, finds the rules that hold, and draws the tree. A family needs no
  code of its own.
- **Generated code**: the compiler writes Rust source for each element, and a
  runtime crate supplies what the code calls.

**Generated code fits GPUI and Rust better.** Props become a struct with
builder methods, so a wrong prop fails to compile. GPUI's style methods are
typed calls, which generated code can call directly. Rules that can never hold
on a desktop drop out at build time. The result reads like Zed's own `ui`
crate, which writes each component as a `RenderOnce` struct.

The cascade lowers cleanly. The web output writes every condition inside
`:where()`, so every rule on one target has the same specificity, and the
later rule wins. The emitter can therefore write a target's rules in source
order, each as a conditional write, and the last write wins in GPUI's style
refinement too:

```rust
div()
    .flex()
    .bg(theme.color_accent)
    .when(self.emphasis == Emphasis::Outlined, |el| {
        el.bg(gpui::transparent_black()).border_color(theme.color_line)
    })
    .when(self.disabled, |el| el.opacity(0.5))
```

### Where the model maps cleanly

| Neutral model | GPUI |
|---|---|
| An element with props and regions | A `#[derive(IntoElement)]` struct with builder methods, and `impl RenderOnce` |
| A `box` part | `div()` with the part's style calls |
| A `text` part | A `div()` holding a `SharedString`. GPUI passes text color, size, and weight down to the text inside a `div` |
| Flex layout | Taffy flex: `flex()`, `flex_col()`, `gap()`, `items_center()`, `justify_between()`, `flex_grow()`, `flex_wrap()` |
| Block layout, `display: none` | Taffy block; a part that is not drawn |
| `display: contents` | The emitter places the part's children in its parent |
| Sizes, padding, margin, borders, radii, opacity, `overflow` | `Styled` methods, with lengths in pixels and `relative()` for percentages |
| `box-shadow`, including `inset` and a spread | `shadow(vec![BoxShadow { .. }])`, with `.inset()` |
| A prop condition, a state, `absent`, `filled` | `.when(..)` on a value the render function holds |
| `hover`, `active`, `focus-visible` on a part | `.hover(..)`, `.active(..)`, `.focus_visible(..)` on that part |
| `hover` on the host styling a part | `.group("host")` on the host and `.group_hover("host", ..)` on the part |
| Tokens, by mode | A theme struct read through a global, as Zed's `ActiveTheme` does, written by a token emitter beside `helix system tokens` |
| Light and dark values, color mixes | Worked out once for each mode when the theme loads, with the OKLCH code `fusion-helix-theme` already has in Rust |
| Private values (`own`) set on the host | `let` bindings in the render function, set in rule order, and read by the parts below |
| A press | `.id(..)`, `.on_click(..)`, and an action bound to Space and Enter under the element's `key_context` |
| Tab order | A `FocusHandle` per pressable, with `.tab_index()` and `.tab_stop()` |
| Keyframe animations | `with_animation(id, Animation::new(..).repeat().with_easing(..), ..)` |
| A layer placed against an anchor | `deferred(anchored().child(..))`, with a priority for stacking |
| Long lists | `uniform_list` and `list` |
| Roles, labels, and range values | `.role(Role::..)`, `.aria_label(..)`, and `.aria_numeric_value(..)`, through AccessKit since May 2026 |

### Where it does not

These are the hard spots, each with the way through it:

- **One hover style per element.** GPUI keeps one `hover_style`, one
  `group_hover_style`, and one `focus_visible_style` per element, and a second
  `.hover()` call replaces the first. The web has many hover rules on one part,
  each under other conditions. The emitter merges them into one closure that
  applies each conditional write in order. A rule that asks for hover on the
  host and focus on the part at once has no GPUI form, and the emitter works it
  out from state the runtime tracks.
- **No transforms on a `div`.** GPUI transforms only an `svg`. `translate`
  (52 elements), `scale`, and `rotate` have no direct meaning. A translate in
  lengths becomes an offset. A translate in percentages of the element's own
  size, as Badge's `50% -50%`, needs the element's size, which a custom element
  in the runtime can measure in its layout pass. Scale and rotate are dropped
  until GPUI draws them.
- **No implicit transitions.** 88 elements declare `transition`. GPUI animates
  only what `with_animation` names. The runtime needs a transition driver,
  which "Motion and computed values" below describes.
- **No outline.** Focus rings are outlines, with an offset, in 293 rules. The
  runtime draws a ring as an absolute child with a border, sized by the offset.
- **Grid tracks.** GPUI exposes Taffy grid as `grid_cols(n)` with equal
  tracks, and `col_span` and `row_span`. Helix's tables write track lists,
  `minmax()`, and named areas (41 elements). Taffy supports them, and GPUI
  needs either a change upstream or a custom element that sets the Taffy style
  itself. `helix/native/src/render/grid.tsx` solved the same problem on a
  phone by measuring and laying out cells by hand.
- **Inline flow.** A paragraph that holds other elements, such as Code, Kbd,
  or Quote inside Text, has no GPUI form. GPUI lays out boxes, and text runs
  only within one text element. The emitter can join runs of plain text into
  one styled text. Elements inside a line need a custom element, or wait.
- **Right to left.** GPUI has no direction. The emitter maps logical
  properties, such as `padding-inline-start`, to physical sides for left to
  right, and the 87 `dir` conditions drop out until a right-to-left mode
  exists.
- **Custom properties across elements.** A hook one element sets on another
  (39 elements) and a value the page sets (`inherited`, 26 elements) reach
  down the tree on the web. A GPUI component cannot read anything from its
  parent. The runtime needs a scope element that pushes values while its
  children lay out and paint. Inside one element, the emitter resolves every
  value at build time.
- **Slots and slotted styles.** A named region becomes a builder method that
  takes `impl IntoElement`, and the default region takes `.child(..)` through
  `ParentElement`. Whether a region holds something is `Option::is_some`.
  A rule that styles what is passed in (106 elements) cannot reach into an
  `AnyElement`. Text styles still reach it, since GPUI passes them down. Box
  styles land on a wrapper `div` around each child, as native's
  `slotted-box.ts` does.
- **Styling a part from outside.** The web's `::part()` lets a page style a
  part. GPUI has no such channel. The hooks become typed fields a caller sets,
  and the owner decides whether each part also takes a style refinement.
- **Text fields.** GPUI has no text field. Its `input` example builds one in
  912 lines, through `EntityInputHandler`, with IME and selection. Seven
  elements use the entry machine. The runtime either writes its own field from
  that example or depends on `gpui-component`'s `Input`.
- **State the caller does not hold.** A checkbox that keeps its own checked
  value needs state that outlives one render. `window.use_keyed_state` holds
  it by the element's ID, and the generated component also takes the value as
  a prop for a caller that controls it, as Radix's controllable state does.
- **Media.** Print and forced colors have no meaning on a desktop window and
  drop out. Reduced motion needs the system setting, which the runtime reads.
- **Accessibility is new.** GPUI reports an element to assistive technology
  when it has an ID and a role, since PR 56065 in May 2026. The form already
  says every role, label, state, and live region, so the emitter writes them.
  How complete the screen reader support is on each platform is unknown, and
  Zed's own issue about Windows is still open. Each family's screen reader
  behavior needs testing on macOS before it is called done.

### Motion and computed values

**On React Native, Reanimated plays most of Helix's motion.** It reads the
CSS `transition` and `@keyframes` a style table writes and runs them on the UI
thread, so `helix/native` adds only what Reanimated lacks, such as presence
and opening to a measured height. GPUI has no such engine. It gives
`with_animation(id, Animation, |el, t| ..)`, `window.request_animation_frame()`,
keyed state that lasts across frames, and springs. A Rust target therefore
splits motion in two:

- **The compiler parses every motion declaration** into typed data at build
  time: each transition's properties, durations, curves, and delays, each
  keyframe table, and each rule under `entering` or reduced motion.
- **The runtime crate plays that data** each frame, in pieces written by
  hand.

The motion and computed values on the pilot branch, and how each ports:

| What | Uses | How it ports |
|---|---|---|
| `transition` | 88 elements | A transition driver in the runtime |
| `@keyframes` and `animation` | 29 elements | Keyframe tables the compiler writes, played with `with_animation` |
| `entering` and the `exiting` and `closed` states | 38 `entering` rules | A presence phase in the runtime: closed, opening, open, and closing |
| Reduced motion | 157 rules | A flag the runtime reads from the system setting and the app's Motion Toggle |
| `translate`, `scale`, `rotate` | 52 elements | A translate through a runtime element; scale and rotate wait on GPUI |
| `calc()`, `color-mix()`, `light-dark()` | 1,850, 330, and 120 uses | Folded at build time where they read tokens alone |
| Measured lengths, `clip-path`, backdrop blur | 777 uses, 41 and 16 elements | Runtime elements that measure in the layout pass |

The spike eases Button's `transition`, as the next two paragraphs describe,
and holds none of the rest. The keyframe code further down is the planned
output.

**A transitioned property is resolved into one value first.** Without a
transition, the emitter writes each rule as a style call and the last call
wins. A transition needs the final value in one place, so the driver can ease
toward it. For each transitioned property, the emitter applies the rules in
order to a variable and hands the variable to the driver:

```rust
let button_background_color = {
    let mut value;
    value = theme.color_accent;
    if emphasis == Some(ButtonEmphasis::Outlined) {
        value = gpui::transparent_black();
    }
    value
};
let button_background_color = super::theme::eased_color(
    window, cx, &id, "button-background-color",
    button_background_color, theme.duration_quick, theme.easing_out,
);
// … and on the part, once:
div().bg(button_background_color)
```

That is the spike's output for Acme's Button, formatted. `eased_color` is the
driver. It keeps keyed state on the element: the color it eases from, the
target, and when the move began. It interpolates in sRGB with premultiplied
alpha along the token's Bézier curve, as CSS interpolates a color, so a fill
fades to transparent without darkening. It asks for the next frame until the
value arrives. A first render shows the target at once, and so does every
render while `cx.reduce_motion()` holds. GPUI holds that flag for the app and
does not read the system setting, so the runtime sets it from the system
setting and the Motion Toggle. The driver is about 100 lines.
`helix/native/src/drivers/motion.ts` does the same on a phone in about 300.

**A hover that transitions is tracked in state.** GPUI applies a `.hover()`
style at paint, with no render, so the driver never sees it. For a property
that transitions, the emitter tracks hover with `on_hover` in keyed state and
reads it while it resolves the value. A property with no transition keeps the
`.hover()` closure.

**Keyframes become constant tables.** Badge's `badge-bounce` becomes the
offset at each stop, played over the duration its hook or token gives:

```rust
const BADGE_BOUNCE: &[(f32, f32)] = &[
    (0.0, 0.0), (0.2, 0.0), (0.4, -0.3), (0.43, -0.3),
    (0.53, 0.0), (0.7, -0.15), (0.9, -0.04), (1.0, 0.0),
];
indicator.when(attention == Some(BadgeAttention::Bounce) && !blank && !motion.reduced(), |el| {
    el.with_animation(
        "bounce",
        Animation::new(hooks.attention_duration.unwrap_or(theme.duration_turn * 1.25)).repeat(),
        |el, t| helix::translate_y(el, relative(sample(BADGE_BOUNCE, t))),
    )
})
```

**Transforms are the largest gap.** GPUI transforms an `svg` alone:

- A translate in pixels becomes a relative offset, which GPUI draws today.
- A translate in percentages of the element's own size, as the bounce above
  and Badge's `50% -50%`, needs that size. A runtime element reads its bounds
  in the layout pass and offsets its child as it paints.
- Scale and rotate need GPUI to transform a paint layer, upstream or in a
  fork. Until then they are dropped and named, as native's `dropped` list
  names a property a phone cannot draw.

**Presence and opening port from `helix/native`.** A dialog or a toast stays
drawn through its exit transition, its first frame takes its `entering`
values, and an accordion's content moves to its measured height. The runtime
holds each in a phase of closed, opening, open, and closing, as
`render/presence.ts` and `useOpenPhase` do on a phone. The compiler marks the
rules under `entering`, so the first frame draws them and the driver moves
away from them.

**Reduced motion is a runtime value.** A rule under
`prefers-reduced-motion: reduce` becomes a condition on `motion.reduced()`,
which holds while the system asks for less motion or the app's Motion Toggle
has paused it. Every transition takes no time while it holds.

**Most computed values are folded at build time.** A `calc()` or a color mix
that reads tokens alone becomes one value for each mode when the compiler
writes the theme, with the OKLCH code `fusion-helix-theme` already has in
Rust. A value that reads a prop or a hook a caller sets becomes a small
expression in the render, such as
`hooks.size.unwrap_or(theme.size_badge) / 4.0`.

The motion work sits in three phases below:

- **Phase 1:** the parsing, the keyframe tables, and the dropped list.
- **Phase 3:** the transition driver, reduced motion, and translate.
- **Phase 5:** presence and opening, which the layers need.

Scale and rotate wait on GPUI. After the machines, the motion runtime is
likely the largest piece written by hand, since Reanimated supplied most of
it on React Native.

## 3. Scope: GPUI and the other Rust options

The research behind the table below was done on November 20, 2026, from
crates.io, the projects' sources, and their pull requests.

| | Styling | Layout | State | AccessKit | Text field | Platforms | Release and license |
|---|---|---|---|---|---|---|---|
| **GPUI** | Typed style methods, named as Tailwind names them; no cascade | Taffy flex, block, simple grid | Entities, with `Render` and `RenderOnce` | Yes, since May 2026 | None built in | macOS, Linux, Windows; basic web (February 2026) and iOS (October 2026) | `gpui` 0.2.2 on crates.io is a year old; weekly snapshots ship as `gpui-pre` 0.3.x; pre-1.0; Apache-2.0 |
| **Dioxus Native (Blitz)** | Real CSS through Stylo, Servo's engine, with selectors, media queries, and custom properties | Taffy flex, grid, block, table | Signals and hooks | Yes | HTML `input` | Desktop and mobile through winit | Blitz 0.3 beta, "many bugs" by its own account; MIT or Apache-2.0 |
| **Iced** | A style function per widget | Its own rows and columns | Messages, update, and view | Not upstream | Yes | Desktop, web | 0.14; MIT |
| **egui** | A global style; immediate mode | Its own | The app holds it | Yes | Yes | Desktop, web | 0.37; MIT or Apache-2.0 |
| **Slint** | Its own language, with built-in styles | Its own | Reactive properties | Yes | Yes | Desktop, embedded, web, Android | 1.19; GPL-3.0, royalty-free, or commercial |

What each comparison says about Helix:

- **Blitz is the one target that reads Helix's CSS as it is.** A Dioxus
  emitter could write the part tree as elements and ship the generated
  stylesheet, with hover, custom properties, grid, transforms, and transitions
  handled by Stylo. It would still need every machine in Rust, and the
  stylesheets lean on shadow DOM, `:host`, `::part()`, and `:state()`, which
  the emitter would have to flatten. Blitz is in beta.
- **Iced and egui fit a cascade poorly.** Iced styles each widget with a
  function of its status, and egui redraws everything each frame from code.
  Generated components would be possible, and each would need a runtime as
  large as GPUI's.
- **Slint's license** leaves an open source user with GPL-3.0 or Slint's
  royalty-free terms, which a library that ships Helix under MIT would pass on
  to its users.
- **GPUI** is the framework of a large editor, has AccessKit, and is the one a
  Rust desktop app in Fusion's orbit would most likely pick. Its API changes
  often.

**Recommendation: GPUI first, with the framework-neutral parts in their own
crate.** A generic Rust runtime trait with GPUI behind it would sit at the
level where the frameworks differ most: state, events, and drawing. The parts
that are the same for any Rust target are the machines, the derivations, the
token values, and the lowered style form. Those go in a crate that depends on
no UI framework, and in the compiler. The emitter's last stage and the runtime
crate are GPUI's. A second target later is a new last stage and a new runtime,
which is the cost the React Native target paid too.

## 4. Families

The order follows what each element needs from a runtime. 60 elements run the
press machine or no machine at all.

| Wave | Families | What the runtime needs first |
|---|---|---|
| 1 | Badge, Tag, Kbd, Divider, Card, Empty, Skeleton, Text, Flex, Blockquote, Quote, Description List, Stat, Trend, Progress, Meter, Button, Icon Button, Icon, Avatar | Theme, units, press, focus ring, transitions, image loading, icon assets |
| 2 | Checkbox, Switch, Toggle, Radio, Tabs, Accordion, Toggle Group, Button Group, Toolbar, Breadcrumbs, Steps, Pagination, List, Callout, Loader | Core's toggle, roving focus, typeahead, single and multiple selection, delay, and validation machines in Rust; the scope element for cross-element values |
| 3 | Tooltip, Popover, Menu, Dialog, Drawer, Toast, Speed Dial, Megamenu, Select, Navigation | The layer host: placement, a modal focus trap, the scrim, Escape, entering and exiting motion |
| 4 | Input, Textarea, Number Input, Pin Input, Slider, Rating, Color Input, Combobox, Filter Input | The text field, the range, spin, and scale machines, and the combobox machine |
| Later | Charts, Graph, Heatmap, Map, Canvas, Sandbox, Terminal, Code Block, Data Table, Video, Lightbox, Date Picker, Chat | Each needs a large hand-written machine, vector drawing through GPUI's `canvas` and paths, or an engine of its own |

Skip Link, Device Screen, and Sandbox Preview are the web's alone, as they are
on React Native.

The runtime pieces a Rust target writes by hand, and the React Native file
each one answers:

| Runtime piece | What it does | React Native counterpart |
|---|---|---|
| Theme | Token values by mode and density, the reader's text size | `theme/`, `style/variables.ts` |
| Units and colors | Rem, em, percentages, color mixes, light and dark values | `style/values.ts`, `style/color.ts`, `style/oklch.ts` |
| Transition driver | Eases each declared property toward its new value | `drivers/motion.ts`, `style/animations.ts` |
| Focus ring | Draws an outline with its offset | `render/ring.tsx` |
| Scope | Carries hooks and inherited values into children | `style/context.ts`, `render/inheritance.ts` |
| Slotted box | Wraps a passed child to give it box styles | `render/slotted-box.ts` |
| Press and keys | Space and Enter, focus when disabled, key contexts | `machines/press.ts`, `capabilities/keys.ts` |
| Layer host | Overlays, placement, the focus trap, the scrim | `render/layer.tsx`, `machines/layer*.ts`, `root/layers.tsx` |
| Text field | Typing, selection, IME, clearing | `render/field.tsx` |
| Grid | Track lists and areas through Taffy | `render/grid.tsx` |
| Live regions | Announces words as they change | `render/live.tsx`, `capabilities/announce.ts` |
| Locale words | Numbers, plurals, dates | `capabilities/intl.ts`, `capabilities/number-format.ts` |

For scale, `helix/native/src` holds about 72,000 lines of TypeScript outside
its tests: 50,000 in `machines`, 12,000 in `render`, and 5,000 in `style`.
The machines are the largest share there, and they would be the largest share
in Rust.

## The spike

The spike compiles the Acme fixture in `helix/cli/tests/fixtures/acme` to
Rust and draws it in a GPUI window. It has three pieces:

- **`helix system gpui --out <dir>`**, an internal verb, in
  `helix/cli/src/family/gpui/`. It reads `ir::Family` and the token file and
  writes `theme.rs`, one module per element, and `mod.rs`. It writes an
  element only when the spike maps everything the element needs, and it names
  each element it leaves out with the reasons.
- **The written modules**, committed in `helix/rust/gpui-spike/src/acme/`, so
  the output can be read in review. Button is 141 lines and Badge is 108.
- **A small GPUI app** in `helix/rust/gpui-spike/src/main.rs`. It draws five
  buttons and two badges, in light mode or with `cargo run -- dark` in dark
  mode. Switch emphasis turns the first button between solid and outlined, so
  its background transition runs. `acme-light.png` and `acme-dark.png` beside
  it are captures of the window. `acme-transition.png` is a capture taken
  midway through the transition.

What it shows:

- **The written code compiled against GPUI with no errors and no
  warnings** the first time it was built. The mapping in section 2 holds for
  these elements: `RenderOnce` structs, `.when()` chains in rule order, theme
  fields, a hook struct, `.focus_visible()`, `.role()`, and `.aria_label()`.
- **The cascade lowered as planned.** Acme's outlined button is the base
  rule, then `.when(emphasis == Some(ButtonEmphasis::Outlined), ..)`, then
  `.when(disabled, ..)`, in source order.
- **The written code draws what the web draws.** The outlined button sets a
  border color and no border width, so it draws no border on GPUI, as on the
  web. A caller's hook replaces the default radius.
- **A transition eases as on the web.** With `cargo run -- flip slow top`,
  which switches the emphasis every two seconds and stretches
  `duration-quick` to two seconds, captures about 0.25 seconds apart read the
  button's fill at 221, 236, 243, 248, 251, 253, and 255 in its blue channel.
  That is a fast start and a slow end, as `easing-out` draws, from the
  accent to the page color. The label changes at once, since the transition
  names `background-color` alone. With `reduce` added, the fill jumps from
  one color to the other.
- **A covered window drew no new frames.** While another app's window was
  in front, the timer switched the emphasis and every capture showed the
  first frame. The spike's `top` argument keeps the window above the others,
  so a capture sees each frame.
- **The emitter names what it leaves out.** Tabs and Tab are left out, with
  the machines and the states they need.
- **GPUI needs a newer Rust than the workspace.** The `gpui-pre` 0.3.12
  snapshot calls a library function that Rust 1.97 lacks. The spike pins Rust
  1.100.0 in its own `rust-toolchain.toml`. GPUI asks for the latest stable
  Rust, so a GPUI crate will often run ahead of the workspace's
  `rust-version`.
- **A build took 53 seconds**, with sccache holding the dependencies from an
  earlier attempt, and left 1.7 GB in the spike's `target`.

Not checked in the spike: the focus ring and pressing with Space or Enter,
since the spike's window runs as a bare binary that cannot take synthetic
keystrokes; the screen reader output; and Linux and Windows.

## 5. Phases

The estimates are weeks of one engineer who knows Rust and the compiler. They
are rough, and phase 0 should correct them.

| Phase | What it delivers | Weeks |
|---|---|---|
| 0. Spike | Acme's Button and Badge compiled to Rust and drawn in a small GPUI app, done on `feat/helix-rust-components`; the decisions below made | 1 |
| 1. Lowering | Typed values and the dropped list in the compiler; the cascade lowered to ordered conditional writes; a Rust token module emitted from the token layer; a `helix system` verb, internal at first | 3 |
| 2. Rust core | The nine statecharts emitted as Rust from `helix system machines`, with their guards and updates ported and held to core's conformance vectors; the derivations waves 1 and 2 need, about 60 of 180 | 4 |
| 3. Runtime and wave 1 | Theme, units, press, focus ring, transition driver, image, icons; wave 1's families with screenshots compared with the web's | 4 |
| 4. Wave 2 | Toggles, sets, and roving focus; the scope element; screen reader checks on macOS | 3 |
| 5. Wave 3 | The layer host and its families | 4 |
| 6. Wave 4 | The text field and the range families | 5 |

Waves 1 to 4 come to about 24 weeks, or six months, for about 70 elements.
The later families are not estimated.

### Risks

- **GPUI's API changes often.** It is pre-1.0, the crates.io release is a year
  old, and the weekly snapshots are published by the author of
  `gpui-component`. The runtime has to pin one snapshot or one Zed commit, and
  each upgrade is work.
- **Two copies of core's logic.** Machines and derivations in TypeScript and in
  Rust can drift. Shared test vectors, as core's conformance specs already use,
  keep them answering alike, and CI has to run them on both sides.
- **Visual drift from the web.** The existing visual tests capture the web.
  Rust components need captures of their own. GPUI can draw offscreen on
  macOS, which is unconfirmed for CI's Linux runners.
- **Accessibility coverage is young.** GPUI's AccessKit support is six months
  old.
- **The toolchain runs ahead.** GPUI tracks the latest stable Rust, and the
  workspace pins 1.97. The spike already needed 1.100.
- **Rust build load.** GPUI is a large dependency, and the owner's Mac builds at
  most about three Rust sessions at a time. The GPUI crates should stay outside the
  default workspace build, so the CLI and the rest of the workspace build as
  fast as they do now.

## Decisions for the owner

1. **The GPUI dependency.** Decided on November 20, 2026 for the spike: an
   exact `gpui-pre` snapshot from crates.io, 0.3.12. Open for the real crates:
   whether to stay on those snapshots, which the author of `gpui-component`
   publishes, or pin a Zed commit by git.
2. **The Rust toolchain.** GPUI needs the latest stable Rust. Either the GPUI
   crates keep a toolchain of their own, as the spike does, or the workspace
   moves its `rust-version` with each GPUI bump.
3. **Generated code or an interpreter.** The plan recommends generated code.
4. **One framework-neutral Rust core crate under the GPUI runtime**, as
   recommended, or GPUI alone in one crate.
5. **Where the crates live and whether they publish.** For example
   `helix/rust/core` and `helix/rust/gpui`, outside the default workspace
   members.
6. **The text field.** Write Helix's own from GPUI's example, or depend on
   `gpui-component`'s `Input`.
7. **ICU4X** for number, plural, and date words, a new dependency.
8. **Styling parts from outside.** Hooks alone, or a style refinement for each
   part as well.
9. **What "done" means for a family.** Drawn to match the web's screenshot,
   keyboard behavior held to the web's specs, and a macOS screen reader pass,
   or a subset of those for the first release.
10. **Blitz.** Whether to try a Dioxus Native target, which reads the web
   stylesheet as it is, before or beside GPUI.
