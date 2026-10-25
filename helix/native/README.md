# @fusion.dev/helix-native

The React Native runtime that Helix's components draw with. It holds the
renderer, the machines that give each component its behavior, the theme, and
the capabilities a phone provides, such as focus, haptics, and opening a link.

The components ship from
[`@fusion.dev/helix`](https://www.npmjs.com/package/@fusion.dev/helix), which
depends on this package. Accordion, Announcement, App Header, Avatar, Avatar Group, Badge,
Blockquote, Breadcrumbs, Button, Button Group, Callout, Card, Checkbox,
Checkbox Group, Code, Copy Button, Description List, Dialog, Divider, Drawer,
Drilldown, Empty, Flex, Format Date, Grid, Icon, Icon Button, Image, Kbd,
List, Loader, Megamenu, Megamenu Group, Megamenu Item, Menu, Meter, Motion
Toggle, Navigation, Outline, Popover,
Progress, QR Code, Quote, Radio, Scroll Area, Skeleton, Speed Dial, Stat,
Steps, Switch, Tabs, Tag, Tag Group, Text, Timeline, Toast, Toast Item,
Toggle, Toggle Group, Toolbar, Tooltip, Tour, Tour Stop, and Trend are drawn on React Native so far, and each is experimental there. Skip
Link is the web's alone, and its component draws nothing on a phone.

```sh
npx expo install @fusion.dev/helix react-native-gesture-handler react-native-reanimated react-native-worklets
```

Wrap your app in `HelixRoot` once, and import each family from its entry in
`@fusion.dev/helix`:

```tsx
import { HelixRoot } from '@fusion.dev/helix-native'
import { HelixButton } from '@fusion.dev/helix/button'

export default function App() {
  return (
    <HelixRoot>
      <HelixButton emphasis="solid" onPress={() => console.log('saved')}>
        Save
      </HelixButton>
    </HelixRoot>
  )
}
```

`HelixRoot` installs the native capabilities, draws Gesture Handler's root view,
which every drag needs above it, draws the host the layers are drawn in, and
gives the components a theme. Its `mode`
draws in `light` or `dark` where you do not want the system's scheme, and its
`tokens` lay values over Helix's own for either mode, by name after `--helix-`.
`useTokens` gives your own styles the values of the mode in use, at the
reader's text size.

## Brand colors

`HelixRoot` and `HelixTheme` take `seeds`, the inputs that
`@fusion.dev/helix-theme` derives a theme from on the web, such as a brand
color:

```tsx
<HelixRoot seeds={{ brand: '#3b82f6' }}>
```

The theme engine derives every color from the seeds in light and dark mode,
on the device. It is the same Rust that runs as WebAssembly on the web, so a
phone and a browser give the same colors for the same seeds. `tokens` lie
over the derived colors. `ThemeSeeds` names the seeds a phone reads, which
are the ones that set colors: `accent`, `background`, `brand`, `chroma`,
`contrastTarget`, `neutral`, `status`, and `tokens`.

**The engine is a native module, so it needs a development build.** Expo
autolinks it into any build of an app that depends on this package, as it
does the keys module. In Expo Go and in Jest, which load no module of their
own, the seeds are left unread, and the theme draws Helix's own colors, which
were derived when the package was built. A seed the engine cannot read, such
as a brand that is not a color, throws an error that names it.

The package carries the engine already built: an XCFramework for iOS devices
and simulators, and a shared library for each Android ABI. You need no Rust to
build your app.

## Text size

The reader's text size setting scales Helix on iOS and Android. **Text grows
with the setting all the way, and space stops growing at the largest standard
size**, as iOS's own controls do:

- **Text grows fully.** Font sizes, line heights, and letter spacing grow with
  the setting, to 3.571 times the default at the largest of iOS's
  accessibility sizes.
- **Space stops at 1.353.** Every other length Helix writes in rems grows with
  the setting up to 1.353 times the default, iOS's largest standard size, and
  stays there: padding, gaps, corner radii, icon and glyph sizes, and control
  heights. Android's standard sizes, 0.85 to 1.3, are all below it.
- **Points stay.** A length in points, such as a border, stays the same at
  every size.

Above 1.353, a control's height is the least it can be, so a control grows
taller for its text. Words no component sizes, such as a tab panel's, are
drawn at the page's text size, `text-md`. An em in a font size, a line height,
or a letter spacing is the full font size, and an em in any other length, such
as a mark one em wide, is the font size at 1.353. A least width in ems, such
as an entry of a timeline across six ems wide, is the full font size, so the
words it holds stay whole. An avatar's initials and an
avatar group's count are a share of their circle, so they stop with it and
fit it at every size. The theme draws again when the setting changes.

`useTokens` gives your own styles the numbers Helix draws. `text-*`,
`leading-*`, and `tracking-*` grow fully, and every other length stops at
`SPACE_SCALE_LIMIT`, which is 1.353. `useFontScale` gives the setting as a
multiple of the default size: 1 at the default, and 3.571 at the largest of
iOS's accessibility sizes. To stop a size of your own where Helix stops space,
multiply it by `Math.min(fontScale, SPACE_SCALE_LIMIT)`.

**Helix scales its own text, so the text it draws has React Native's
`allowFontScaling` off.** A `Text` of your own that takes a size from
`useTokens` or `useInheritedText` turns it off too, or React Native scales its
words a second time:

```tsx
const tokens = useTokens()

return (
  <Text allowFontScaling={false} style={{ fontSize: tokens['text-md'] }}>
    Total
  </Text>
)
```

Helix sets no largest text size. A length you give `HelixTheme`'s `tokens` as a
number is points and stays the same. One written in rems, such as `'1.25rem'`,
grows fully where its name starts with `text-`, `leading-`, or `tracking-`, and
stops at 1.353 otherwise.

A tab strip whose tabs do not fit scrolls along its line. Tabs at
`width="full"` share the strip when their labels fit, and each tab is at least
as wide as its label.

## Window and safe area

The environment capability reads the window's size, its safe area, and
whether a screen reader is on, beside the color scheme, the direction, the
text size, and reduced motion.

- **The window** is `Dimensions.get('window')`, read again on each change.
- **The safe area** comes from `react-native-safe-area-context`: `HelixRoot`
  draws its provider and reads its insets as a turned phone moves them.
  Without the package, the safe area is 0 on each edge.
- **The screen reader** is VoiceOver or TalkBack, asked once at install and
  kept current from `screenReaderChanged`. The web cannot tell, and reads
  `false`.

**A component whose host reads the safe area stands clear of the share of it
that reaches into the host**, as App Header at the top of the window stands
clear of the status bar and the notch. The host measures where it stands in
the window each time it is laid out, and each edge's inset is the part of it
the host covers: all of the top inset for a host at the window's top, less
for one lower down, and none for one below it, as under a router's own
header. A host drawn inside a scroll view reads none, since the view moves it
under the status bar and out again as it scrolls. Before the host is
measured, it reads none. A layer reads the whole
safe area, as a sheet clears the home indicator.

## Layers

**A dialog, a popover, a menu, or a tooltip is drawn in the layer host
`HelixRoot` draws over the app**, inside Gesture Handler's root view, as the
web draws one in the top layer. React Native's `Modal` is not used, so a drag
works inside a layer. What a layer holds reads the theme and the sets of the
element that opens it, as it would where the element is drawn, and no
toolbar: a menu opened from a toolbar is in no toolbar, as on the web.

- **A modal layer holds the reader.** The app and every layer opened before
  it are hidden from VoiceOver and TalkBack while it stands open, its view is
  `accessibilityViewIsModal`, and its scrim takes every touch outside it.
- **A reader dismisses a layer as its `closedby` says**: a close request is
  Escape from a hardware keyboard, Android's back, or VoiceOver's escape
  gesture, and a press outside is a press on a modal layer's scrim, or a
  touch on the app outside a layer that is not modal. A press on the layer's
  anchor is the anchor's own. The last layer opened takes each request, and
  its element's toggle may refuse it. A press beside a sheet is a press on
  its scrim.
- **Focus moves into the layer as it opens**, to the first control inside,
  and goes round inside a modal layer with Tab and Shift with Tab from a
  hardware keyboard. Closing puts focus back on what held it as the layer
  opened, or on the layer's anchor. React Native tells where the keyboard's
  focus is and never where a screen reader's is, so a screen reader's focus
  goes back to the anchor where nothing held keyboard focus, and stays where
  the screen reader puts it where the layer has no anchor.
- **A layer with an anchor is placed by `@floating-ui/react-native`**, with
  the margin of 8 points the web's layers keep: on the side it asks for,
  turned to the other side where that one has no room, and slid along to
  stay in the window. A layer beside its anchor moves below it, then above
  it, where neither side has room, as a tour's first stop beside a rail as
  wide as the phone stands under the rail on both platforms. Its element is in the state of the side it landed on
  and of the end of that side it is aligned to, and its rules read the room
  left as `floating-available-block-size` and its anchor's width as
  `floating-anchor-inline-size`, as on the web. While it is open its anchor
  is measured each frame, so it follows an anchor in a scroll view, and a
  turn of the phone places it again. On Android, Floating UI adds the status
  bar's height to each anchor it measures in the window, where React Native
  0.88 already measures from the root view's top, so the layer takes it back
  out, with the host's own place in the window.
- **A press drawn in a layer's anchor reaches the layer** once its own
  event stands, as its `presses` says: a popover's trigger opens it and
  closes it, and says whether it is expanded, and using a tooltip's trigger
  takes the bubble down unless `persist` is set. The anchor's view provides
  a context each press inside it reads, since a phone has no element to
  listen on, and a press in the layer itself reads none.
- **A tooltip's words are each press's hint** in its anchor, unless they are
  already the press's name, and a long press on the press shows the bubble
  where the press has no long press of its own. A tooltip leaves focus where
  it is as it opens and as it closes.
- **A layer that `holds` opens on a long press** of a press in its anchor,
  ranked as that press's own long press, as a speed dial's trigger under
  `openOn="long-press"` opens its actions, while a quick press stays the
  press's own. **A layer that takes `arrows` opens on Down or Up** from a
  hardware keyboard on a press in its anchor, with focus on its first or its
  last control, and with Alt where it holds. A press its own element draws
  in the anchor reaches the layer too, as a speed dial's drawn trigger does.
- **A layer that `enters` on a press takes focus only as a press, a long
  press, or a key in its anchor opens it**, and leaves focus where it is
  when your app writes `open`. Closing gives focus to its anchor all the
  same, as a speed dial gives its trigger focus however it closes, and a
  layer that `returns: 'held'` gives it to its anchor only where a control
  inside it held focus, as a menu leaves focus where a press outside put it.
- **A close request on a page below the top goes back a page** in a layer
  whose element shows a stack of pages, as Escape leaves a menu's page, and
  closes the layer on the top page.
- **A band stands under its anchor across the window**, as a megamenu's
  panel does: its top at the anchor's bottom edge, measured in the window
  each frame while it is open, so it follows a bar that scrolls, its left at
  the window's left edge, and as wide as the window. It is placed on no
  side, so its element is in no `placed-` or `aligned-` state, and its rules
  read the room left under it, less the software keyboard, as
  `floating-available-block-size`.
- **A layer that `enters` on `down` takes focus only from Down** on a press
  in its anchor, from a hardware keyboard: Down opens it with focus on its
  first control where it stands closed, and moves focus there where it
  stands open, as a megamenu's trigger does. A press that opens it leaves
  focus on the press, and Up is the press's own.
- **Focus goes back to the anchor's first press**, never to the box around
  it, so the next key from a hardware keyboard reaches the trigger. A layer
  that `returns: 'dismissed'` gives it back only where a reader dismissed
  it, by a close request or a press outside, as the web's megamenu does,
  and leaves it where a press on its trigger or on a control inside put it.
- **A layer that stands open `alone` is one of its kind open at a time**,
  across the app, as a bar's megamenus: opening one asks the one open to
  close, through its toggle, which may refuse, and a touch on the anchor of
  another of its kind is no touch outside, so its press opens that one in
  place.
- **A layer slides along its side by its `cross-offset`**, and keeps its side
  where `flip` is false, as Floating UI's `offset` and `flip` say. Its part
  is `data-placed` once it is placed, so it moves in as its rules say.
- **A layer placed against a `target` is placed against a view you
  register** under the id its prop holds, since a phone has no document to
  find an element in by its id. **A Helix element given an `id` registers
  its own view under it**, so code you share with the web names a target as
  the web does, and any other view registers with `useTarget`:

  ```tsx
  <HelixButton id="publish">Publish</HelixButton>

  const save = useTarget('save')
  <View ref={save}>{/* the control the stop explains */}</View>
  ```

  The view registered last under an id stands in for the ones before it
  while they are drawn. In code shared with the web, any element with an
  `id`, a `div` among them, registers its view through the JSX runtime. A
  `target` that holds no id places the layer in the window, along its
  `edge` or in the middle, as a tour's dialog stop stands.
- **A decorative layer is a look alone**, as a tour's spotlight and its
  backdrop are: drawn under every other layer, it takes no touch, no key,
  no close request, and no focus, and no screen reader reaches it. It may
  hold nothing, and its rules read the lengths its attributes hold, as the
  spotlight reads the lit box its tour measures.
- **A machine bound before a layer may answer for it**: the attributes it
  binds read what that machine computes, as a tour stop's `offset` reads the
  spotlight's padding, and a close request or a press outside asks that
  machine before the layer's toggle, as a stop's skips the tour.
- **A layer's arrow stands where the web's does**, from core's
  `arrowEdges`: on the edge that faces the anchor, over the anchor along it,
  and kept the layer's largest corner radius from either end. The layer's
  offset is measured to the arrow's point.
- **An anchored layer that names a `presentation` may be a sheet** along
  the window's bottom edge: under `auto` in a window narrower than 30rem at
  the reader's text size, and under `sheet` always. A sheet is placed by no
  anchor, its scrim takes the touches beside it, and its rules read the safe
  area through `safeArea('bottom')`, which is 0 while the software keyboard
  covers the bottom edge.
- **A notice stands above every other layer**, as a toast's stack does: it is
  drawn above the dialogs whenever it opened, stays read and pressable while
  one holds the reader, and takes a close request only while no other layer
  is open. A notice that takes no close request leaves Escape to what has
  focus, and it takes no touch of its own, so a touch between the messages
  it holds reaches the app under it. **A layer may open on what a machine
  before it computes**, where no toggle holds it, as a toast's stack opens
  while a message is passed into it.
- **A layer that swipes follows the finger** toward the edge of the window
  it stands along, its `edge`, or the bottom edge while it is a sheet, on
  the UI thread through Gesture Handler. A release rests it at the snap
  point core's `settleSwipe` gives, as the web's drawer rests, or takes it
  out through the edge, which asks its toggle to close as every other way
  out does: a `closes` handler that refuses it, or `closedby="none"`, sends
  it back to where it rested. It opens at its smallest snap point, and its
  element is in the state `snapped` while it rests short of the whole.
  **A scroll view inside it hands it the drag**, as a sheet on iOS and the
  web's drawer take their list's drag: a drag toward the edge moves the
  layer once the scroll view can scroll no further that way, its top for a
  layer along the bottom and its end for one along the top, and has stood
  still for half a second, core's `SCROLL_LOCK`. A scroll view flung to its
  top and still moving, or bouncing there, keeps the drag, so its momentum
  takes no layer with it. A drag away from the edge moves the layer while it
  rests short of the whole, and the scroll view is held where it stands
  while the layer moves. **Focus moving to a control past the window's edge
  opens a layer that rests short of the whole to its largest snap point**,
  as the web's drawer does, as the layer opens and as Tab moves through it.
- **A layer along an edge stands against it**, stretched along it, as a
  drawer stands at the end of the window. `start` and `end` turn with the
  writing direction.
- **A layer stands above the software keyboard.** `HelixRoot`'s `keyboard`
  is `avoid` by default: the host ends above the keyboard, so a sheet or a
  dialog stands over it, a placed layer has the room above it, and `dvh` is
  the window less the keyboard. Under `none` the layers stand where they
  would without it, for an app that moves its content out of the keyboard's
  way itself.

- **A layer that `refuses` answers a press on its scrim that `closedby`
  keeps open**: its view is `data-refused` for as long as the animation its
  rules give it then runs, and at once where they give none, as under
  reduced motion. Dialog swells and settles so.
- **A layer's attributes may bind what the element computes**, as Dialog's
  `closedby` binds `dialog-dismissal`, which `persistent` and `closedby`
  decide together.
- **A part that scrolls moves and blurs as its rules say**: its frame takes
  the part's transitions, its animation, and its backdrop blur, as a
  dialog's panel that scrolls what it holds fades, rises, and swells.

A layer drawn with no `HelixRoot` around it is drawn where its element is,
with a warning in a development build.

### Dialog and Drawer

**Dialog is a modal layer** in the middle of the window, and a sheet along
its bottom edge in a window narrower than 30rem, with its last row clear of
the home indicator. **Drawer is a layer along the edge its `placement`
names**, the end where it names none, modal unless `modal` is false, clear
of the status bar and the home indicator along the edges it meets, and
swiped toward that edge as a layer that swipes is. Each one:

- asks `onBeforeClose` before every way out, sends `onToggle` once it stands
  the other way, and `onClose` once it has closed, as the web's `close`;
- is named by `label`, then the words passed into `header`, then
  `fallbackLabel`, and says its name as it opens, since React Native has no
  dialog role for VoiceOver or TalkBack to read it by. An alert dialog says
  the words of its body after its name, as a screen reader announces an
  alert dialog's description on the web;
- draws its close control under `dismissible`, which closes it whatever
  `persistent` and `closedby` say.

These are the web's: the invoker commands `command` and `commandfor`,
`close(value)` and `returnValue`, `snapTo()`, a `<form method="dialog">`,
the page's scroll held still, a description drawn from the leading words of
the body, and a drawer's travel written as `--drawer-swipe-x` and
`--drawer-swipe-y`. Open and close a dialog or a drawer on a phone through
`open`, from your own state, as the gallery's examples do.

### Popover, Tooltip, and Copy Button

**Popover is a layer placed against the trigger passed into `trigger`**, on
the side `placement` names, `offset` from it, slid by `cross-offset`, and
turned to the other side unless `flip` is false. A press on the trigger
opens it and closes it, a close request or a touch outside closes it, and
`modal` holds the reader over a scrim a press on which closes it. It is
named by `label`, then `fallbackLabel`, and says its name as it opens.

**Tooltip describes the trigger passed into it** with the words of
`content`, or of the content passed into `content`: each press inside is
described by them, a phone's hint. A long press on the trigger shows the
bubble, and so does focus from a hardware keyboard landing on it, until
focus leaves, as on the web. A touch elsewhere or a close request takes it
down, and a press on the trigger takes it down unless `persist` is set.
`disabled` keeps it from showing.

**Copy Button copies `value` to the clipboard as it is pressed**, through
expo-clipboard, and for `feedbackDuration` it is named Copied, draws a check,
says the word to a screen reader, and shows it in the tooltip it draws
around its press. A press with nothing to copy, or one the clipboard
refuses, is named by `errorLabel` and sends `onCopyError`. Under
`showLabel` its words keep the width of the widest of the three, measured
as each is drawn, as the web stacks them in one cell. It is drawn with Icon
Button's rules, laid under its own.

These are the web's: Popover's `anchor` by id, `container-padding`, a name
taken from the first heading inside, the invoker commands, and focus leaving
the trigger and the panel closing it; Tooltip's `for` by id, the pointer's
delays, `hoverable`, `show-on`, `skip-delay`, and `within`; and Copy
Button's `from` by id. A phone keeps every layer 8 points from the window's
edges, has no pointer to time, and shows a copy button's tooltip only for
the result of a press. Open a popover or a tooltip from your own state
through `open`, as the gallery's examples do.

### Speed Dial

**Speed Dial is a layer of actions placed against its trigger**, the
trigger passed into `trigger` or a round button it draws, named by `label`,
with a plus that `icon` replaces. A press on the trigger opens the actions
on the side `placement` names, `offset` from it, with focus on the first of
them, and Down and Up open them on the first or the last. **Choosing an
action sends its `onSelect`**, which reaches the dial's `onSelect` too, and
closes the dial once it stands, with focus back on the trigger. A handler
that refuses it keeps the dial open. Under `openOn="long-press"` a quick
press is the trigger's own, and a finger held still for half a second, or
Alt with Down or Up, opens the actions; the trigger is described by
`longPressLabel`. An action draws its `shortcut` in the keyboard's glyphs,
and a `HelixSpeedDialGroup` names a set of actions by its `label`. The
actions arrive one after another, nearest the trigger first, and are simply
there under reduced motion.

These are the web's: `openOn="hover"`, which a phone opens on a press, and
an action's `rel`, `target`, `download`, and `aria-keyshortcuts`.

### Menu

**Menu is a panel of rows placed against its trigger**, the trigger passed
into `trigger`, on the side `placement` names, `offset` from it, at least
12rem wide. **In a window narrower than 30rem it is a sheet** along the
window's bottom edge, as wide as the window, its last row clear of the home
indicator, over a scrim, and a press on the scrim closes it. `presentation`
draws a sheet or a popover at any width. A press on the trigger opens it
with focus on its first row, and Down and Up open it on the first row or the
last. **Choosing a row sends its `onSelect`**, which reaches the menu's
`onSelect` too, and closes the menu once it stands, with focus back on the
trigger where a row held it, unless `closeOnSelect` or the row's own is
false. A Space from a hardware keyboard on a choice row keeps the menu open,
unless the row's `closeOnSelect` says otherwise. A `checkable` row turns
over as it is chosen, and an `exclusive` row turns on and the rest of its
run off, each after its `onBeforeToggle`, and the menu's `onChange` follows
the row's `onSelect`. A checked row draws a check at its end.

**A row whose `submenu` holds rows opens that page** in place of the one
showing, under a header with the way back, named by `backLabel`, and the
page's name, which names the panel. The way back, the arrow back, and
Escape go up one level, and Escape on the top page closes the menu. A row
draws what is passed into `start` before its label, a `description` under
it, and its `shortcut` as a key after it, and a page keeps a column for the
first and for the check or the caret wherever one of its rows fills one.
`HelixMenuSection` names a group of rows by its `label`. Under
`openOn="long-press"` a quick press is the trigger's own and a long press
opens the menu, the trigger described by `longPressLabel`, and under
`context` a long press on the area opens it. While `loading` holds, the
panel says `loadingText`, and with no rows `emptyText`.

These are the web's: `submenus="flyout"`, a panel beside its row, which a
phone shows in place of the page instead; the filter, `filterable`,
`filterLabel`, `noResultsText`, and `resultsLabel`; a context menu placed at
the pointer and `for` and `targets`; rows a mouse resting on them focuses; a
row's `rel`, `target`, `download`, and `aria-keyshortcuts`; and the panel's
`aria-busy`, which a phone's layer has no place for.

### Megamenu

**Megamenu is a trigger that discloses a band of destinations** under it,
across the window, as the web draws the panel in a page narrower than
`bandBelow` and under `variant="band"`. The trigger is a button named by
`label`, or the trigger passed into `trigger`, and says whether the panel is
expanded. **A press on the trigger opens the panel and closes it**, under
either `openOn`, and leaves focus on the trigger. Down from a hardware
keyboard on the trigger moves focus to the panel's first destination,
opening the panel first where it is closed. Escape, a phone's back,
VoiceOver's escape, and a touch outside close it with focus back on the
trigger. Every way it opens and closes asks `onBeforeOpen` or
`onBeforeClose` first, which a handler may refuse, and `onToggle` follows
once it stands the other way, with `newState` and `oldState`.

**The panel holds `HelixMegamenuGroup`s of `HelixMegamenuItem`s**, from
`@fusion.dev/helix/megamenu`. A group is a column under a heading of its
`label`, or what you pass into `label`, which a screen reader hears as a
heading. **An item with an `href` is a link**: a press sends `onSelect` with
the `href` as its value, opens it through the open-link your app sets, and
closes the megamenu, unless the handler refused it. An item draws what you
pass into `icon` before its words, what you pass into `description` under
them, and a dot before its name where it has no icon, filled while it is the
page. An item that holds its words alone is a plain link of the panel. A
screen reader hears the words and the description as the link's words, and
"Current page" after them where its `current` is `page`.

**While the window is narrower than `bandBelow`, 640 points**, the
megamenu is in its `narrow` state: the groups stand in one column and the
band scrolls to the bottom of the window. In a wider window they stand side
by side in tracks of at least `--megamenu-column-size`. While an item in the
panel is the page, the megamenu is `current`, read from what you pass in, so
it holds while the panel is closed.

**In a `HelixNavigation` a megamenu is one of its destinations**: under
`arrows` the navigation's arrow keys reach its trigger, the navigation's
mark stands at the trigger while the megamenu is current, the navigation is
`open` while the panel is, and the megamenu stands for its `label` there, so
give each megamenu of one navigation a different label. An arrow among the
panel's destinations moves nothing, as on the web.

These are the web's: hover intent, `openDelay`, and `closeDelay`, since a
phone has no pointer to rest; the card the web draws in a wide page, hung
off the trigger and placed by `placement`, which a phone draws as the band;
the band's top at the bar the trigger stands in, where a phone hangs it from
the trigger's bottom edge; the direction one panel hands over to the next
in, the `from-start`, `from-end`, `to-start`, and `to-end` states, and the
sizes written as `--megamenu-surface-inline-size`,
`--megamenu-surface-block-size`, `--megamenu-from-inline-size`, and
`--megamenu-from-block-size`, which no rule of the styled tier reads and a
phone has no stylesheet of yours to read; a press on a link or a control of
your own in the panel closing it, which a phone hears from its Megamenu
Items alone; your own links styled by the `data-megamenu-group`,
`data-megamenu-heading`, and `data-megamenu-item` recipes; and an item's
`rel` and `target`. **One panel stands open at a time**, as on the web:
opening one asks the one open to close, and a touch on another trigger
opens that one in its place.

A screen reader's focus is put back as best a phone can, as the list above
says: React Native reports where a hardware keyboard's focus is and never
where VoiceOver's or TalkBack's is, so a reader who opened a dialog by touch
is left where the screen reader puts them as it closes.

## Long presses

**A finger held still on a press for half a second is a long press**, as
core's press machine times it, on the timers capability, and as Speed Dial
and Menu read one on the web. A finger that drifts more than ten points
first makes an ordinary press, and the release after a long press presses
nothing.

**A press takes a long press only where something claims one**, and the
trigger's own wins, as the plan's decision on hover-only patterns says:

1. The press's own, where its node says `held`, which opens its element's
   toggle, as a speed dial's trigger opens its actions.
2. The last claim of the trigger's own made on its view with
   `claimLongPress(view, 'own', take)`, as a layer that `holds` claims each
   press in its anchor, as a speed dial under `openOn="long-press"` does.
3. The last `hint` claim, as a tooltip shows its bubble on a long press of
   the control it describes, where that control has no long press of its own.
   A tooltip's layer makes the claim on each press drawn in its anchor.

A press nothing claims stays an ordinary press however long it is held.
`claimLongPress` gives the stop that takes the claim back.

## Clipboard

The clipboard capability puts text on the system clipboard through
`expo-clipboard`, as a copy button and a color swatch copy on the web, and
gives whether the text is there. An element whose source declares a `copy`
copies through it as its pressable that `copies` is pressed, and ends the
result on the timers capability, as Copy Button does. Without the package, or its native module,
each write gives `false`, as a browser that refuses the write does.

## Scrolling

**A part whose overflow scrolls is a scroll view**, along the axis its
`overflow` names. A part that scrolls both ways is a scroll view across
inside one down, and the scroll capability takes the pair as one node.

The scroll capability's `observe` tells where a part that scrolls stands
each time it moves: its offset, and whether it is at each end of each axis.
It tells once more with `settled` as the scroll comes to rest: at the end of
a glide, or 100 ms after the last move where nothing glides, about when the
web sends `scrollend`, and again as its frame or its content changes length.
`to` scrolls a part to an offset. `ScrollArea` takes a `ref`, which
`observe` and `to` take as its node.

**Scroll Area is in a state for each edge with more past it**, as on the
web, from where its viewport's scroll view stands, and sends `onScroll` as
it moves and `onScrollEnd` once it comes to rest. It shows the platform's
scroll indicators where the web draws its own scrollbars. A phone draws no
mask, so each fade is drawn in the surface color, `color-background`, and
`hooks.fadeColor` sets another color for an area on a card or a panel.
Inside an area that scrolls both ways, words wrap at the area's width less
the padding at each side of its content. Under `orientation="horizontal"`,
what the area holds is laid out at the area's width, as a block fills the
viewport on the web, and wider only where it runs past that, so the entries
of a timeline across share the width and the area scrolls only where their
words need more room. **Inside an area that scrolls both ways, an outline
reads the area**, so its sections there are marked as the area scrolls.

**A part that scrolls takes the keys of a hardware keyboard**, as a browser
scrolls a box that overflows. A scroll view takes no focus, so the frame
around it is `focusable` while the part overflows, and the module's keys
reach it while focus is on the frame or a view inside it:

- The arrow keys scroll by 40 points.
- Page Up, Page Down, Space, and Shift with Space scroll by seven eighths of
  the frame.
- Home and End scroll to each end, down where the part scrolls down and
  across where it scrolls across alone.

A key goes on to the views around where a view nearer the focus took it, a
text field has focus, a modifier is held, or the part already stands at that
end. The frame draws the focus ring after a key, as the web draws it on
the viewport.

## Sections

An outline on a phone draws a link for each section of the page, since a
phone has no document to find a section in by its id. Each section
registers its view with `useSection`, under its id, the words its link
says, and its heading's level:

```tsx
import { useSection } from '@fusion.dev/helix-native'
import { HelixOutline } from '@fusion.dev/helix/outline'

function Install() {
  const section = useSection('install', { label: 'Install', level: 2 })
  return <View ref={section}>…</View>
}
```

- **The links are drawn in the order the sections were drawn**, nested by
  level, as the web nests a flat run of links by `data-level`.
- **The marked link is the section being read**: the last whose top has
  passed the reading line, `offset` below the top of the scroll view the
  sections are drawn in, and the last section once the view stands at its
  end. **In a view that does not scroll, the last section is marked from
  the start**, read from the lengths the view reports or, before it has,
  from the sections laid out inside its frame, so the outline sends one
  `activate` for it. A view with neither is read by the reading line alone.
- **One mark travels to the marked link**, as on the web, placed from the
  link's box against the navigation and moved by the motion driver.
- **A press on a link scrolls to its section**, gliding under
  `behavior="smooth"` unless the reader asks for reduced motion, and the
  link is marked until the scroll comes to rest.
- **Any press whose `href` is a fragment**, `#install`, goes to the section
  registered under that id, and focus moves to the section.
  `scrollToSection` scrolls to one from your code.
- **`follow` keeps the marked link in view** in the scroll view the links
  are drawn in, as the web keeps it in a rail with a scrollbar of its own.
  The scroll view the sections are drawn in never moves for it.

**Code you share with the web marks a section with Outline Section.** The
web element takes `anchor` as its id, and an outline with no links of yours
draws a link for each one on the page. On a phone it registers its view as
`useSection` does:

```tsx
<helix-outline></helix-outline>
<helix-outline-section anchor="install" label="Install" level={2}>
  …
</helix-outline-section>
```

**Each copy of a repeated part can take a view of its own.** A binding's
`view` is shared by every copy a repeat draws, so a ref there holds one
copy. A binding's `copy` makes a view from each copy's entry, as an
outline gives each link a ref by its section's id.

## Waits and clocks

Three hooks keep time for a component, each on the timers capability, so a
fake clock drives the web's and a phone's alike.

- **`useDelay`** waits once and draws again as the wait ends, as a loader
  shown only after a delay does. A form whose source declares a `delay`
  runs it as the delay machine, which sets the state the source names while
  the wait runs.
- **`useCountdown`** is a lifetime that pauses, as a message that dismisses
  itself does. Its holds are counted, so a pointer and focus each hold it
  and only the last one out starts it again. With `holdWhileHidden`, the app
  in the background holds it too.
- **`useWallClock`** gives the time of day, again each time what is drawn
  from it changes, as a relative time does. It stops while the app is in the
  background and catches up at once as it comes back. A form whose source
  declares a `clock` runs it as the clock machine, which gives every
  derivation of the element the time of the last tick as `now`.

## Peers

| Package | Needed for |
|---|---|
| `@floating-ui/react-native` | Placing a layer against its anchor, as a popover against its trigger. Optional: an app that draws no such layer does without it, and one that draws one is told to install it |
| `expo-blur` | The blur `backdrop-filter` draws behind a box on iOS, and behind a layer on Android. Optional: without it, a box draws its own background alone |
| `expo-clipboard` | Putting text on the clipboard, as a copy button does. Optional: without it, every copy fails and says so |
| `expo-haptics` | The touch a phone plays as you lift, move, and drop a list row. Optional: without it, nothing plays |
| `react` 19 | Everything |
| `react-native` | Everything |
| `react-native-gesture-handler` 3 | Dragging a row by its grip |
| `react-native-reanimated` 4 | Motion, such as the tab indicator, a row making room, and keyframes |
| `react-native-safe-area-context` 5 | The safe area the environment capability reads. Optional: without it, the safe area is 0 on each edge |
| `react-native-svg` 15 | Vectors, such as a meter's ring and an icon. Optional: an app that draws none does without it |
| `react-native-worklets` | Reanimated's worklets |

**Each peer is optional to npm**, since `@fusion.dev/helix` depends on this
package and a web app installs it too, and npm installs a dependency's
required peers. A React Native app needs every peer but
`@floating-ui/react-native`, `expo-blur`, `expo-clipboard`, `expo-haptics`,
`react-native-safe-area-context`, and `react-native-svg`. Where
one is missing, Metro stops the bundle and names it, and a runtime that loads
each module as it runs it, such as Jest, throws one error that names every
missing peer and the command that installs them.

## Motion

**A component's keyframes and transitions run on the UI thread**, as
Reanimated's CSS animations and transitions. Reanimated reads the CSS a
component's style writes, so each of these means what it means on the web:

- A frame selector, such as `0%, 100%` or `from`.
- A transform in each frame: a scale, a rotation, and a translate in
  percentages of the part's own size.
- Any number of runs, `infinite` among them, a delay, a direction, and a fill
  mode.
- Helix's motion tokens, whose curves are the same on a phone. The spring
  token is a `linear()` curve on both.

**A press moves its look as a box does.** A button's fill and border move to
their pressed and hovered values over the time its rules name, through
Reanimated's `Pressable`, and at once under reduced motion.

A frame moves a part from where its own style places it, as CSS composes a
part's `translate` with an animated `transform`. Where no frame is at `0%` or
at `100%`, the run starts or ends at the part's own style.

A transition moves the properties it names when a state changes them:
opacity, a transform's scale, rotation, and translate, a background color,
a border color, a shadow, a width, and a height. A transform moves as one,
with the timing of the first of its parts the transition names. A shape's
fill, stroke, and dashes move the same way. `transition-delay` delays each
move, and an element passed into another moves as the other's
`::slotted()` rules' transitions say, as a speed dial's actions arrive one
after another.

**A reader who asks for reduced motion gets what the web gives them.** A
component's reduced-motion rules stop or slow its keyframes, and every
transition takes no time.

**An app can pause its motion as a page does.** `HelixMotionToggle`, from
`@fusion.dev/helix/motion-toggle`, is one toggle button for the whole app,
and every Motion Toggle in the app shows the same choice. iOS and Android keep
the reduced-motion setting for the reader alone, and an app cannot set it, so
while the app's motion is paused, every Helix component draws as it does when
the reader asks for reduced motion. `pauseMotion`, `motionPaused`, and
`onMotionChange` from this package set and read the same choice, and
`useMotionPaused` draws again as it changes, for motion of your own:

```tsx
import { useMotionPaused } from '@fusion.dev/helix-native'

const paused = useMotionPaused()
```

**A part that opens and closes moves to its content's measured height.** A
row written `grid-template-rows: fit(0)` and `fit(1)` is `0fr` and `1fr` on
the web. On a phone the part measures what it holds, and its
`grid-template-rows` transition moves its height between none and that
measure. Once open, the part takes the content's own height, so content that
grows or shrinks while open moves the part with it. Content that changes
while the part opens moves where the motion ends. Closed, what the part holds
stays drawn at no height.

**A part that is `visibility: hidden` is hidden as on the web**: it is drawn
unseen, a press does not land on it, and a screen reader passes over it and
what it holds. A part that opens and closes pairs `fit(0)` with it, as a
step's stage does. Where `visibility` has a transition, a part that hides
stays seen, pressable, and reachable by a screen reader until the transition
ends, as on the web. It shows again at once, and under reduced motion it
hides at once.

The part's open phase is `closed`, `opening`, `open`, or `closing`.
`opening` and `closing` end when the transition has run, and under reduced
motion the phase goes straight to `open` or `closed`. `useOpenPhase` gives
the same phase for motion of your own, and calls its third argument with
`open` or `closed` once each motion is done:

```tsx
import { useOpenPhase } from '@fusion.dev/helix-native'

const phase = useOpenPhase(open, { duration: 200, easing: 'ease' }, (end) => console.log(end))
```

## Styles a phone draws

A component's style is written once, in CSS's terms, and these parts of it
draw on a phone as on the web:

- **Transforms.** `scale`, `rotate`, `translate` in lengths or percentages,
  `transform` with any 2D function, and `transform-origin`.
- **Shadows.** A `box-shadow` list, with `inset` and a spread. **A
  spotlight's shadow is a ring.** One shadow with no offset and no blur,
  spread more than 1,000 points, as a tour's `0 0 0 200vmax` dims the window
  around its target, is drawn as four bands of its color around the box, as
  far out as the spread, with small vector corners that round the hole by
  the box's radius. A phone draws a shadow, and a rounded border that wide,
  into a picture as large as the ring, which iOS does not draw at all.
- **Backdrop blur.** `backdrop-filter: blur()` blurs what is behind the box
  through `expo-blur`, kept to the box's corners, on the host as on a part,
  as Card's `material` draws. Of a list of filters, the blur alone is
  drawn. expo-blur takes an intensity and no radius, so a radius is drawn
  as its share of `material-blur-lg`, 32 points. **Android blurs only what
  a `BlurTargetView` holds**, so `HelixRoot`'s layer host draws the app
  inside one, where expo-blur is installed, and a sheet, a popover, or a
  menu over the app blurs the app under it. A box inside the app draws its
  own translucent background alone on Android, as a browser without
  `backdrop-filter` does, since the blur cannot read a view that holds it.
- **Clips.** `clip-path: inset()`, with one to four insets and a `round`,
  clips the box, and a transition of `clip-path` moves the insets, so a
  panel revealed from its top edge down is revealed on a phone too. An
  inset in a percentage is a share of the box's own size, so the box is
  measured first and drawn once it is. Any other shape has no native
  meaning yet.
- **Edges.** A border or an outline written with a width, a style, and a
  color in any order, a border on one side, logical or physical, and
  `border-width` on each side. An edge with no style draws nothing, as on
  the web.
- **Lines of text.** `white-space: nowrap` keeps text on one line, as wide
  as the whole line, so a long button label runs past its button as on the
  web, `text-overflow: ellipsis` ends it with an ellipsis, and `line-clamp`
  stops it after a number of lines. `text-wrap: balance` and `pretty` choose
  how Android and iOS break lines.
- **Fonts.** `font-style`, `font-variant-numeric` such as `tabular-nums`,
  ligatures, and `font-feature-settings`.
- **Layout.** `flex` with a grow, a shrink, and a basis, `flex-wrap`,
  `row-gap`, `column-gap`, `aspect-ratio`, `margin-block`, `inset-block`,
  `pointer-events`, and an `overflow` that hides or clips.
- **Gradients.** A linear or radial gradient is the box's background image,
  with its size, position, and repeat.
- **Generated boxes.** A `::before` with empty content and an `::after` each
  draw a box, and the `::after`'s words are drawn in it.
- **Slotted values.** A style an element gives what is passed into it reads
  each child's own private value where it names one, as `var(--_avatar-size)`
  does on the web, so an avatar group overlaps each avatar by a quarter of
  that avatar's size.
- **Presses.** A control a finger holds down draws its `:active` look, as a
  pointer held on it does on the web.
- **Color schemes.** A part with `color-scheme: light` or `dark` draws what
  is passed into it in that scheme's tokens, as a QR code's logo plate draws
  its mark as on a light page.

A property with no native meaning yet is left out, and the component's
`dropped` list names it.

## Density

`data-density` on a component, `sm`, `md`, or `lg`, draws it and the
components inside it at that density, as the attribute does on the web: the
control's text and inset, and the sizes of a control, an icon, a checkbox, a
switch, and a tag, each at the step of that name, with the tight and loose
sizes 0.8 and 1.2 of the control's. A stop inside another does not compound.
`<Density density="sm">` does the same for components of your own layout.

```tsx
<HelixCallout data-density="sm" tone="info">
  A tight callout, for a dense settings page.
</HelixCallout>
```

## Grids

React Native lays out with flexbox and has no grid, so **`HelixGrid` lays its
children out with a grid of its own**. It measures its width, works out each
column's width and each child's place, and draws the children in rows of
views, each child as wide as the columns it spans. Until it has its width,
its children are drawn one to a line.

- **Columns** from `columns`, `min`, or a track list the element around sets
  through `--grid-columns`: lengths, `fr`, `auto`, `minmax()`, `repeat()`,
  and `auto-fill` and `auto-fit`. A length in rems grows with the reader's
  text size all the way, so a `min` column fits its words at every size.
- **Rows** from a track list the element around sets through
  `--grid-rows`: a length sets a row's height, and `minmax()` its least,
  so `minmax(30rem, auto)` is 30rem until a child is taller, as on the web.
- **Gaps** between columns and between rows, which stop growing at 1.353, as
  every gap does.
- **Placement** in row order, as the web places with `auto-flow="row"`. A
  child spans columns with a `data-grid-span` prop, `"full"` or a number from
  2 to 6, as on the web:

  ```tsx
  <HelixGrid columns={3} gap="md">
    <HelixText as="h3" data-grid-span="full">Reports</HelixText>
    <HelixCard data-grid-span="2">Revenue</HelixCard>
    <HelixCard>Refunds</HelixCard>
  </HelixGrid>
  ```

- **Alignment**: `alignItems` places each child in its row, and
  `justifyItems` in its columns. A child stretches across its columns and
  down its row unless they say otherwise, and a Helix component grows to fill
  its row.

**A column sized by its content is measured once**: each child alone in an
`auto` column is drawn at its own width, and the column is then as wide as
the widest.

These stay the web's, and a phone draws each as follows:

- `auto-flow`'s column flow and dense packing: a phone has no `autoFlow` prop
  and places every child in row order.
- Named areas and lines: a child named for an area is placed in row order.
- Subgrids: a `HelixGrid` child that is a subgrid is a track of its own,
  sized by its content.
- A row's height in `fr` or a percentage: the row is as tall as its tallest
  child, and at least the least a length sets.

**An element that is a subgrid of the element around lines its parts up
with its siblings'** while it lays them out in a row. Each item of a
`HelixDescriptionList` is one, so under `direction="row"` every term is as
wide as the widest term, as the web's label column is, and each value takes
the rest of its line, holding several values one under another. The terms
are measured at their own width once, and again at a new text size or as an
item arrives or leaves. A list narrower than 22rem stacks each term over its
value, and each term takes its own width.

`HelixFlex` is a flex view. Its `switch` layout measures its width too, and
until it has it, its children share one row. A Helix component passed into a
`flank` or a `switch` takes its basis and its grow from the flex, and a view
of your own keeps the size its own style gives it.

## Pictures

A component that draws a picture, such as an image or an avatar, draws it
with React Native's own `Image`, so it needs no peer. The part's
`object-fit` is the `Image`'s `objectFit`, and `object-position` has no
native equivalent yet. The component is in the state `loading`, `loaded`,
or `error` as its picture stands, as on the web, and sends the events its
`image()` node names once each picture loads or fails. A new `src` starts over at `loading`.
The `load` event's `target` gives the picture's `naturalWidth` and
`naturalHeight`, as the web element does, and a picture that fails gives 0
by 0. An image with no `--image-aspect` is 16 by 9 on a phone, which has no
picture's size to read before it loads. A picture that fails is a box 16 by 9
that holds the fallback, on a phone and on the web, until `--image-aspect`
says otherwise.

## Lists

A part a component draws once for each entry of a list, such as each key
of a chord, is a view for each entry, keyed by the entry's key, so a view
keeps its state as the list changes around it. A part named by a region is
named by the words you pass into that region, as `aria-labelledby` names it
on the web.

## Vectors

A component that draws a shape, such as a meter's ring, draws it with
`react-native-svg`. Install it where your app draws one:

```sh
npx expo install react-native-svg
```

A shape's dashes are measured in its path length, as on the web, and its
fill, stroke, and dashes take the component's colors and move as its state
does. Without the package, the first shape drawn throws an error that names
it and the command that installs it.

`glyphs` makes the `Glyph` `HelixRoot` draws a component's icons with, from
icons that are SVG markup and a view box, such as `@fusion.dev/helix-icons`.
Each icon keeps its own strokes and fills, and what it does not paint is drawn
in the color the component asks for:

```tsx
import * as icons from '@fusion.dev/helix-icons'
import { glyphs, HelixRoot } from '@fusion.dev/helix-native'

const Glyph = glyphs(
  (name) => icons[name.replace(/-(\w)/g, (_, letter) => letter.toUpperCase())],
)

<HelixRoot Glyph={Glyph}>
```

`HelixIcon`, from `@fusion.dev/helix/icon`, draws the icon its `name` names
with that `Glyph`, in the color of the words around it. Its size is the
`size-icon` token, which a theme's `tokens` can change, or the size a
component it is passed into gives it: a button draws its icons at 1.15 times
the size of its words, and a tab's close button at the size of its words. Like
every length that is space, it stops growing at the largest standard text
size. An icon with a `label` is an image with that name, and one without is
hidden from screen readers. `rotate`, `flip`, `mirror`, and `animation` turn,
flip, and move it as on the web. The web's `src`, `load`, and `error` are the
web's alone: a phone fetches no file, and an app's `Glyph` draws nothing for a
name it does not know.

## Runs of words

Text, Code, and Quote draw their words as a `Text`, and one nested in the
words around it wraps with them, as a `<span>`, a `<code>`, and a `<q>` do on
the web:

```tsx
<HelixText as="p">
  Add <HelixCode>data-density</HelixCode> to a container.
</HelixText>
```

**A nested `Text` takes a background, and no padding and no corners**, on iOS
and Android both, so a code fragment's wash is the width of its words. A Text
that is `p` or `h1` to `h6` is a block of its own, and `lines` stops its words
after that many lines with an ellipsis.

A Kbd is a box in the line of words, which keeps its border and its size and
does not break across lines. Its `keys` chord is drawn in the reader's
keyboard's glyphs, `⌘K` on an iPhone or an iPad and `Ctrl+K` on Android, and
said in words.

## Quotation marks

A Quote, and a Blockquote with `marks`, draws the quotation marks of its
language, the outer pair at first and the inner pair inside another
quotation. Its language is its `lang`, then the `lang` of the component it is
in, then the reader's, and a screen reader reads its words in it:

```tsx
<HelixQuote lang="de">Bitte nicht berühren</HelixQuote>
```

A Blockquote's mark stands over the passage on a line of its own, since a
phone has no float to set it beside the first lines, as the web does.

## Roles and readings

A component's parts are announced on a phone with the roles they have on the
web. A role becomes React Native's `accessibilityRole` where iOS and Android
have a trait of that name, and React Native's `role` for the rest:

- A heading is a header, with no level.
- A meter is a progress bar. A range's reading is the view's
  `accessibilityValue`: its least, its greatest, where it stands, and the
  words it is read as. A Meter and a Progress are each one element a reader
  reaches, named by `label` or by the words of their `label` region, and an
  indeterminate Progress has no place it stands. A Meter that holds
  `HelixMeterSegment`s measures the sum of their values, and draws each
  segment as a slice of its bar, in the next color of the chart series or in
  its `tone`. A segment says nothing of its own. A Skeleton is a progress
  bar while it is named, busy while what it holds loads, and hidden while it
  is a placeholder with no name.
- A radio is checked as its set chooses it, and a button that stays pressed,
  or that turns on and off as a Toggle does, is a toggle button. A Toggle in
  a Toggle Group is a radio where the group chooses one, and a toggle button
  where several can be pressed. A button that opens, as an Accordion
  section's trigger, is a button that says it is expanded or collapsed.
- A toolbar inside another toolbar is a group of it, so a reader meets one
  toolbar: a Toolbar inside a Toolbar, and a Toggle Group or a Button Group
  whose items press on their own inside one.
- A group, a figure, a list item, a separator, a term, and a definition pass
  their role to React Native, which each platform announces where it has one.
- A keyboard key is announced as a key.

A part with a role that holds only words, such as a heading, is one element
with that role. A decorative part is drawn and hidden from screen readers. An
inert part takes no touch and is hidden from screen readers too.

**React Native has no state for the current item of a set**, the web's
`aria-current`, so a phone says it in words, as the part's
`accessibilityValue`: "Current page" after the current crumb's words, and
"Current step" after the current stage's name. Register the words in your
language under `helix-current`, by `aria-current`'s values:

```ts
import { registerWords } from '@fusion.dev/helix-core/words'

registerWords('de', { 'helix-current': { page: 'Aktuelle Seite', step: 'Aktueller Schritt' } })
```

Words that describe a part on the web, `aria-describedby`, are its
`accessibilityHint` on a phone, as a finished stage's name is described by
its `complete-label`.

**What the web says in a live region, a phone announces**, politely, after
what the screen reader is saying:

- An Empty says its heading as it is drawn, and again each time it is drawn
  anew, unless `noAnnounce` holds.
- A Meter under `live` says its reading as it moves into another band.
- A Progress says its `completeLabel` as it arrives at its end.
- A Button or an Icon Button says its `pendingLabel` as it turns pending,
  to the reader who pressed it.

A Meter that is drawn in a band, and a Progress that is drawn full, say
nothing, since neither has moved.

## Numbers and plural words

Components write numbers and plural words in the reader's locale, through
`formatNumber` from `@fusion.dev/helix-core/numbers` and `formatMessage` from
`@fusion.dev/helix-core/words`. `useLocale` gives a component's own `locale`
where it names one, and the reader's locale otherwise, and draws again when
the reader changes it.

Hermes writes numbers with its own `Intl.NumberFormat`. `HelixRoot` installs
the plural rules, list formats, and display names Hermes lacks, with English
data. **Hermes on iOS writes some numbers wrongly**: a time in minutes or
hours as seconds, a narrow day as "42 day", and no compact notation or sign.
`HelixRoot` asks the engine for each, and where one is wrong, FormatJS's
`NumberFormat` writes the numbers with that option, in English and in any
locale whose data the app loads, as
`@formatjs/intl-numberformat/locale-data/de` loads German. Every other number
stays the engine's, in every locale. The polyfill and its English data add
about 134 KB, minified, to every app's bundle, 88 KB of it the data.
`numberSupport()` says which of the three options are written right, with
what `HelixRoot` installs over the engine, and
`dateTimeSupport()` which `Intl.DateTimeFormat` options it writes: `formatToParts`, another calendar, a time zone's name, and a day
period. **To count in another
language, load its plural data once**, after `HelixRoot` first draws:

```ts
import '@formatjs/intl-pluralrules/locale-data/pl'
```

## Widths in characters

A length in `ch` is a number of widths of the font's `0`, as a reading three
digits wide is `3ch`. A component that writes one draws an unseen `0` in its
text and measures it. Until that measure, a `ch` is half the font size, which
is what the web takes where it cannot measure a font.

## Expo web

**A universal Expo app's web build draws the web elements.** Expo's web
bundler does not ask for the `react-native` export condition, so on the web
`@fusion.dev/helix/tabs` registers `helix-tabs` and its parts, as in any web
app, and this package is not loaded.

## Shared code

**`@fusion.dev/helix/jsx-runtime` draws a page written for the web on a
phone.** Write the page with `helix-*` tags, as for the web, and give its
files this runtime: set `jsxImportSource` to `@fusion.dev/helix` for them in
Babel, or have Metro resolve `react/jsx-runtime` and `react/jsx-dev-runtime`
to it. It exports only under the `react-native` condition, so the web build
of the same file uses React's own runtime and draws the elements.

- A `helix-*` tag is the native component of that name, with its attributes
  as props, so `selection-mode` is `selectionMode`.
- A child with a `slot` fills the region prop it names. A `helix-text` with a
  `slot` gives its words to the region, and in a region that names the
  element, as a meter's `label`, draws them, as the web draws them, and the
  element is named by them. `regionNames()` says which regions name one.
- A `span` passed into a region takes the text style the region gives and
  the margins its host's `::slotted(*)` rules give, as a drawer's title keeps
  a step clear of the content under it. `useSlottedBox()` reads the same box
  style for a view of your own.
- `data-density` on a `helix-*` tag or a `div` draws what it holds at that
  density, and `data-color-mode`, `light` or `dark`, draws it and what it
  holds in that mode's tokens, as it does on the web.
- A custom property in a `style` that names one of the element's hooks sets
  that hook, as `hooks` does: `style={{ '--qr-code-size': '8rem' }}` on
  `helix-qr-code`. Its value can name a token, `var(--helix-text-md)`, or an
  `oklch()` color. The rest of a `style` is the web's.
- An `onhelix-*` handler hears the native event, and `onClick` is `onPress`.
- A `section` with an `id` registers itself for Outline, named by the words
  and the `data-level` of the link to it.
- A tag a phone does not draw shows a placeholder where it would be.

**A development build warns about what a phone leaves out.** Each component
says once, with `console.warn`, when it is given a prop or an event handler
that only the web element has, such as a list row's `rel`, or a CSS
`className`. `warnWebTag` says the same of a DOM element or a family drawn on
the web alone, for a JSX runtime that draws a page's tags and has no component
for one. A release build says nothing.

`helix shared`, in `@fusion.dev/helix-cli`, reports the same from your code
before it runs, with the browser's globals, a `style` React Native does not
take, a custom property that is not a hook of the element it is set on, and
stylesheet imports as well. It reads every module except those named
for one platform, such as `page.web.tsx` and `page.native.tsx`.

## Keyboards

The arrow keys, Home, End, typed letters, Space, Enter, Escape, and Control or
Command with A reach the components from a hardware keyboard, on iPad, on an
iPhone with a keyboard, and on Android, through a native module this package
carries. It hears each key before the focused view does, and a key a
component takes goes no further.

**A checkbox and a switch turn on Space alone, as on the web.** The module
takes Enter on them and does nothing with it, so the platform does not press
them with it either. A tap on a checkbox or a switch moves keyboard focus to
it, as a click on its label does on the web, so Space turns it next.

**A focus ring shows after a key, as `:focus-visible` shows it on the web.**
A part with keyboard focus draws its `focusVisible` look once the module has
heard a key, and a touch anywhere in the app takes the ring away until the
next key. A phone with no hardware keyboard never shows one.

**The module hears a key go down, and not come up.** Space presses a button
as it goes down, where a button on the web presses as it comes up.

**A disabled Button or Icon Button with `focusableWhenDisabled` keeps its
focus.** It is `focusable`, a screen reader hears it as disabled, and a
press or a key does nothing, as on the web, so a hint can say why it is
disabled.

**The module holds focus on the item the arrow keys move to.** React Native
moves keyboard focus to a view only where the app turns on its
`enableImperativeFocus` flag, so without the module the next key would still
start from the item focus left.

**The module needs a development build.** Expo autolinks it into any build of
an app that depends on this package, with `expo` installed, after
`npx expo prebuild` or `npx expo run:ios` and `run:android`: no plugin or app
code. In Expo Go, which loads no module of its own, the components hear no
keys and nothing fails.

## Props

Each component has its web element's class name, such as `HelixTabs` for
`helix-tabs`.

- Each property of the web element is a prop of the same name in camel case.
  A property only the web has, such as a form's, is left out.
- Each slot is a prop that takes React nodes, and the default slot is
  `children`.
- Each event is a handler: `helix-before-activate` is `onBeforeActivate`. The
  handler gets the web's detail under `event.detail`, and an event the web
  sends as the platform's own carries its fields on itself too, as a
  `toggle` carries `event.newState` and `event.oldState` as a `ToggleEvent`
  does, and `PlatformEvent` types it.
  `event.preventDefault()` refuses what a cancelable event proposes. Where
  the element that sent the event has a value, `event.target.value` reads it,
  as on the web: the list's value in a list's `onChange`, and the row's in
  its `onAction`. An element that turns on and off gives `event.target.checked`
  as well, an image's `onLoad` its `naturalWidth` and `naturalHeight`, and `event.currentTarget` is the same as `event.target`, as a
  handler on the element reads it on the web.
- `hooks` sets the component's public hooks, each by its name in camel case:
  `<HelixButton hooks={{ backgroundColor: '#0a84ff' }}>` sets what
  `style="--button-background-color: #0a84ff"` sets on the web. A hook set
  this way stands over the hooks the components around set and the fallbacks
  of the component's rules, as an inline style does, and the components
  inside inherit it, as they inherit a custom property. Its type, such as
  `HelixButtonHooks`, lists each hook with its description.

The types are written from the same sources as the components. TypeScript
reads them under the `react-native` condition, which Expo's `tsconfig.base`
sets.

## Toolbars

`HelixToolbar`, from `@fusion.dev/helix/toolbar`, is announced as a toolbar
named by its `label`. **The arrow keys move focus among its controls**: Right
and Left in a horizontal toolbar, Down and Up in a vertical one, and Home and
End to the ends, from the last back to the first unless `stopAtEnds` holds.
A disabled control is passed over, and the arrows across the toolbar are
left to the control with focus. A disabled Button or Icon Button with
`focusableWhenDisabled` stays a stop of the arrows, as on the web.

**A control is a Helix press that hears its own keys**, drawn anywhere
inside the toolbar: a Button, an Icon Button, a Toggle, a Checkbox, or a
Switch, and each button of a Button Group. A press of your own is no
control of the toolbar's, and neither is a radio group or a tab set inside
it yet. The keys need the keys module, as every component's do.

A toolbar inside another is a group of the outer one, whose arrows walk its
controls and on past them. A Button Group inside a toolbar is a group too,
and its buttons are the toolbar's controls.

A divider in a toolbar runs across it, as on the web: vertical in a
horizontal toolbar, unless its own `orientation` says otherwise. A toolbar
gives its axis to what it holds through `ToolbarAxisContext`, and its
controls join it through `ToolbarStopsContext`. A menu, a popover, a dialog,
or a drawer opened from one gives `undefined` for both, so a divider inside
it is no longer in the toolbar, and its controls are not the toolbar's.

## Button groups

`HelixButtonGroup`, from `@fusion.dev/helix/button-group`, joins its Buttons
and Icon Buttons into one shape: the inner corners go flat and each button
after the first sits on its neighbor's edge, in a row or, under
`orientation="vertical"`, in a column. `variant="spaced"` parts them with a
gap, and `size` sets every button's size.

**Under `selectionMode`, a button with a `value` stays pressed.** Its own
press, a tap, Space, or Enter, presses or releases it, and the group asks
with `onBeforeChange` before it sends `onChange`, as on the web. Under
`multiple` the group is a toolbar of toggle buttons, whose `value` holds the
pressed values in the order they were pressed, separated by a comma and a
space, as `"bold, italic"`, and under `single` a
radio group of radios, where a press on the pressed one lets it go unless
`disallowEmptySelection` holds. The arrow keys move focus among the buttons
and press nothing. A pressed Button or Icon Button takes the solid fill, as on
the web.

## Toggle groups

`HelixToggleGroup`, from `@fusion.dev/helix/toggle`, holds its `HelixToggle`
children as one control. **Where one is chosen**, a press, or an arrow key
that arrives on a toggle, chooses it: the toggle sends `onSelect`, the group
asks with `onBeforeChange`, and then sends `onInput` and `onChange`. With
`allowEmptySelection`, a press on the chosen toggle takes it back. **Under
`selectionMode="multiple"`**, a press presses or releases one toggle, `value`
holds the pressed values separated by commas, and the arrow keys move focus
and press nothing. The indicator slides under the chosen toggle, and each
pressed toggle takes its fill where several can be pressed. A toggle outside
a group is a toggle button of its own. Inside a toolbar, the group keeps its
own arrow keys, as on the web.

## Checkbox groups

`HelixCheckboxGroup`, from `@fusion.dev/helix/checkbox-group`, holds its
`HelixCheckbox` children as one set, and its `value` is the values of the
boxes that are checked. **A box turns on its own and asks the group first**:
its own `onBeforeToggle`, then the group's `onBeforeChange` with the whole set
that would result. Where both stand, the group sends `onInput` and `onChange`,
and then the box sends its own. Writing `value` checks exactly the boxes it
names. `selectAll` draws a checkbox above the set that checks every enabled
box, or unchecks them all once every one is checked, and shows a dash while
only some are. Each box is a stop of its own.

**An element another element draws takes its parts' styles from it**, as
the web's `::part()` does: Checkbox Group's rules on `select-all-box` style
the select-all checkbox's `box`. A token a part of the element around sets,
such as `--helix-color-foreground`, reaches the element drawn inside that
part, as it reaches the parts and the elements passed in there.

## Sets of commands and choices

A set whose collection says `mixes: true`, as a menu's does, holds commands,
choices that turn on and off, and runs of choices of which one is on, and
the runtime hosts the set as `mixed-set` and each item as `mixed-item`:

- **An item's kind is core's**, from `@fusion.dev/helix-core/menu-items`,
  which the web's Menu Item reads too. `exclusive` makes it one of a run,
  `checkable` or `checked` a choice, and any other item is a command.
- **A press turns the item before its press's event is sent**, once its
  `before` event stands, as `onBeforeToggle` with the `checked` the press
  asks for. A choice turns over, an item of a run only turns on, and a
  command never turns. Refusing the turn keeps the item as it was, and the
  press's own event still goes out, as on the web.
- **An item of a run that turns on turns the rest of its run off**, with
  nothing sent. The run is the items drawn next to it that are `exclusive`
  too, up to the first element that is not, so a divider between two runs
  parts them, as on the web. An item with no `value` stands in a run among
  the items next to it in the set.
- **The press is checked or not as the item holds it**, and a command's
  press says no checked state, so a screen reader hears a choice's state
  alone. Its `checked` prop seeds the item, and writing it again sets it.
- **The arrow keys move focus among the items**, with Home, End, and the
  typed letters, and arriving chooses nothing. Space and Enter press the
  item focus is on.

## Stacks of pages

An element whose source declares a `stack`, as a drilldown does, shows one
page of rows at a time. The runtime hosts it as
`stack` and each row that holds a page as `stack-row`, and core's
`@fusion.dev/helix-core/stack` walks the rows, as the web's
`DrilldownController` walks the document:

- **Each row registers with its parent**, the row whose page holds it, so
  the stack has a tree to walk. A row taken away takes its page with it,
  and the stack goes back to the top.
- **A press on a row that holds a page shows that page**, and sends nothing
  of its own. The back press goes up one level. Each move asks first with
  the stack's `before` event, its `value` the row whose page would show,
  empty for the top page, and a refusal keeps the page showing.
- **Focus moves with the page**: to the first row of a page going in, and to
  the row whose page was left going back, once that row's press is drawn,
  as the rows a layer holds are drawn a turn after the move. The arrow along
  the line into the page shows it, and the arrow back, or Escape, goes back.
- **Only the page showing is drawn.** A row whose page is showing draws its
  page and none of its other parts, and any other row off the page draws
  nothing, though it stays registered. Content in a page region that is no
  row draws while its row is on the page showing.
- The element computes its `drilled` value while a page below the top shows,
  and its `label` value as the page's words, which its title says, or the
  words its `top` names on the top page. Writing its `page` prop shows the
  page of the row with that value.
- **Each move starts the page's motion again.** The element is in its
  `entered` state after a move into a page and its `left` state after a move
  back, and the part that holds the rows runs its animation from the start
  with each move, as the web's drilldown writes its direction anew.
- **A row on a page that is not showing is out of reach of the keys**, so
  the arrow keys and the typed letters move among the rows drawn.

### Drilldown

`HelixDrilldown`, from `@fusion.dev/helix/drilldown`, shows one page of
`HelixDrilldownItem` rows at a time. **A row whose `page` holds rows goes
into that page** on a press, or on the arrow along the line, and the page
slides in from the side it came from. The header over a page below the top
holds the way back, named by `backLabel`, and the page's name, which names
the page too. The way back, the arrow back, and Escape go up one level, and
each move asks `onNavigate` first, with the `value` of the row whose page
would show, empty for the top page. Focus lands on the first row of a page
going in, and on the row whose page was left going back. `page` holds the
value of the row whose page shows, and writing it shows that page.

A row with no page sends `onSelect`, which reaches the drilldown's
`onSelect` too, and a row with an `href` opens it through the open-link your
app sets once the event stands. A row is named by its label, and described
by the words passed into `description` and `end`. Under `navigation` the
drilldown is a navigation landmark named by `label`. While `loading` holds,
it shows `loadingText`, and with no rows `emptyText`, and says each to a
screen reader. A row's `rel`, `target`, and `download` are the web's. Under
`navigation` a page is a list and each row a list item that holds a link,
or a button where it opens a page or goes nowhere, as the drilldown writes
its rows `listed`.

## Forms

Checkbox, Checkbox Group, Radio Group, Switch, and Toggle Group show a
message when their answer is missing, as on the web. **The message shows once
the reader has had a go**: a required checkbox or switch that the reader
turns off, or a required group with nothing chosen once your app calls
`validate()`. The message takes the hint's place and is announced as an
alert, and the control's edge takes the danger color. A `feedback` shows at
once. Your app owns its forms, so a phone
submits nothing. Each control's ref is a handle: `validate()` shows the
message and returns whether the answer is acceptable:

```tsx
import type { FieldHandle } from '@fusion.dev/helix-native'
import { HelixSwitch } from '@fusion.dev/helix/switch'

const terms = useRef<FieldHandle>(null)

<HelixSwitch ref={terms} required>
  Accept the terms
</HelixSwitch>

const save = () => {
  if (terms.current?.validate()) {
    submit()
  }
}
```

A checkbox draws its tick and its dash with `react-native-svg`, at the weight
the web draws them, so an app that draws a checkbox installs it.

## Links

A tab, a list row, a crumb, or a navigation item with an `href` is a link. A press sends the
item's event first, and the link opens unless a handler refused the event. An address with a
scheme, such as `https:` or `mailto:`, opens with the phone's own handler, and a
path goes nowhere. To send paths to your router, such as Expo Router's
`router.push`, call `setOpenLink` from
`@fusion.dev/helix-core/capabilities/open-link` with an `open` of your own,
after `HelixRoot` first draws, since the root installs the phone's.

## Breadcrumbs

`HelixBreadcrumbs`, from `@fusion.dev/helix/breadcrumbs`, is a navigation
named by its `label`, around a list of `HelixBreadcrumb`s. **A crumb with an
`href` is a link**: a press sends `onSelect` with the `href` as its value,
and opens it through the open-link your app sets, unless the handler
refused it. The `current` crumb is its words, whatever its `href`, and a
screen reader hears "Current page" after them. A crumb with neither is its
words, or what you pass into it, such as a link of your own. A control in a
crumb's `end` is a control of its own, drawn beside the link as the second
half of one split control.

A separator is drawn before each crumb but the first, and a screen reader
passes over it. It is an em of the crumb's words, so it stops growing at
1.353 times, and the trail wraps onto more lines as the words grow. The
separator is a chevron, and `separator="slash"` on the trail draws a slash
centered in the same box, before each crumb and before the fold.

**Under `maxItems` a long trail folds its middle into a menu**: the first
crumb and the last `maxItems` less one stay, and the first draws a ghost
icon button named by `expandLabel`, `{count}` the crumbs folded, that opens
a menu of them, each row opening its crumb's `href` through the open-link
your app sets. Choosing a row sends the first crumb's `onSelect`, with the
row's `href` as its value, and a handler that refuses it keeps the link
closed.

These are the web's for now: a trail drawn from `items`, which your app
maps to crumbs on a phone. On the web, the last crumb of a trail with none
marked `current` is said to be the current page. On a phone, mark it
`current`.

## App Header

`HelixAppHeader`, from `@fusion.dev/helix/app-header`, is the bar an app
places at the top of a screen, with the router's own header hidden. It draws
what you pass into `start`, usually a wordmark, its children, usually a
`HelixNavigation`, and what you pass into `end`, usually actions, in a row:
the middle centered in the bar, or beside the start under
`contentAlign="start"`. In a bar narrower than 24rem the insets step down,
so two destinations fit a 360 point phone.

**At the top of the window it stands clear of the status bar and the notch**
by the safe area, as [Window and safe area](#window-and-safe-area) says, and
under a header of the router's it takes no more room than on the web.

**Its `material` is what the page shows through**: opaque by default,
`glass` translucent with the page blurred behind it through expo-blur,
`frosted` the same with less showing through, and `transparent` no fill
until the page has scrolled under it, when it takes the glass. Under
`overlay` it takes no room in the column it stands in, so the section after
it starts behind it, as a hero under a glass bar does, and that section pads
its own top by the bar's height.

**It follows the page it stands over**: the scroll view it is drawn in, or
the view registered under `scroller` with `useTarget`, as an app that draws
its page in a `ScrollArea` beside the bar names that area:

```tsx
const content = useTarget('content')

<HelixAppHeader material="transparent" scroller="content" start={<Wordmark />}>
  <HelixNavigation>…</HelixNavigation>
</HelixAppHeader>
<ScrollArea ref={content}>…</ScrollArea>
```

It is `scrolled` once the page has moved 8 points from its top, until it is
back within 2, and sends `onScrolled` each time that turns. Under
`hideOnScroll`, a scroll down past its own height puts it in `hidden`, and
a scroll up of more than 4 points brings it back, as does a return to its
height from the top, while its folded region stays in view while open.

**Under `foldBelow`, a window narrower than that folds the middle region
behind a toggle**, named by `menuLabel`, at the end of the bar, or at its
start under `togglePlacement="start"`. A press on the toggle opens the region
under the row and closes it, asking `onBeforeOpen` or `onBeforeClose` first,
which a handler may refuse, and `onToggle` follows once it stands the other
way. The toggle says whether the region is expanded. What you pass into
`menuIcon` replaces its glyph.

A screen reader on a phone has no landmark to announce, so it reads what the
bar holds in order. These are the web's:

- **`sticky`'s place at the top of the window as the page scrolls.** React
  Native has no sticky position, and a scroll view pins only its own direct
  children, which a bar drawn inside it cannot reach. A bar inside a scroll
  view scrolls with it. Place the bar above the scroll view, where it stays
  in view, and name the view in `scroller` so the bar follows it.
- **The window's scroll.** A phone has no document that scrolls, so the bar
  follows the scroll view it is drawn in, or the one `scroller` names.
- **Folding at the bar's own width.** A phone folds at the window's width,
  which is the bar's while the bar spans the window, as it does at the top
  of an app.
- **The landmark dropped inside `main`, `article`, `aside`, `nav`, or
  `section`**, since a phone announces none.
- **The folded region closing on Escape, as focus leaves the bar, and on a
  press outside it, and the hidden bar shown again as focus moves into it.**
  A press on the toggle closes it on a phone.
- **The web's `viewport-fit`.** On the web the bar reads no safe area, and a
  page drawn under the status bar keeps its own header clear of it.

## Toast

`HelixToast` and `HelixToastItem`, from `@fusion.dev/helix/toast`, are a
stack of messages and one message in it. Render the messages from your own
state, and take a message out once its `onDismiss` stands:

```tsx
<HelixToast placement="bottom-end">
  {messages.map((one) => (
    <HelixToastItem
      dismissible
      duration={8000}
      key={one.id}
      onDismiss={() => setMessages((now) => now.filter((other) => other !== one))}
      tone={one.tone}
    >
      {one.words}
    </HelixToastItem>
  ))}
</HelixToast>
```

**The stack is a notice layer**, as [Layers](#layers) says: drawn above every
dialog and drawer, read and pressable while a modal one holds the reader, and
open while a message is passed into it. It takes no focus as it opens and no
close request, and a touch between its messages reaches the app under it.
It stands along the window's bottom edge, or its top edge under a `top-`
placement, kept `--toast-inset` from the edges and clear of the home
indicator and the status bar, with the newest message nearest the edge, at
the start, the middle, or the end of the line. **In a window narrower than
30rem each message takes the whole width of the stack**, and in a wider one
it is 22rem wide.

**Each message is drawn in the scheme opposite the app's**, so it stands out
from the page, unless the stack names its own mode with `data-color-mode`.

Each message:

- **says its words as it shows**: the word for its tone, its heading, its
  description, and its text, politely, and assertively for a `danger`
  message, and never its actions, through the screen reader;
- **spends its `duration` on core's countdown**, which a touch on any message
  of the stack, keyboard focus on its dismiss button, the app away from the
  front, and a running screen reader each hold, and runs on from what was
  left. Its bar drains as the clock runs and stops while it is held;
- **waits past the stack's `maxVisible`**, in the order the messages were
  drawn, drawn as nothing and its clock not started, until a message before
  it closes;
- **closes on its dismiss button, its spent `duration`, Escape on its dismiss
  button from a hardware keyboard, and a swipe**, each through its toggle,
  which sends `onDismiss` with the words of its text as `label`. The stack's
  own `onDismiss` hears it after the message's, with the same event, so a
  handler on either refuses it and the message stays. It fades out toward
  the edge and draws nothing once it has faded, and the page shows it again
  by writing `open`. Where its dismiss button was pressed or held focus,
  focus moves to the dismiss button of the message beside it, the next one
  first;
- **swipes toward the stack's `swipeDirection`**, the end of the line where
  it names none, with the drawer's swipe driver on its surface: past
  halfway, or quickly, it closes, and a refused close springs it back. The
  message's surface moves under the finger on the UI thread.

These are the web's:

- **The landmark `label` names, and the `hotkey`, F8 unless set, with its
  `hotkeyLabel`**, which takes focus to the stack and back. A phone has no
  landmarks, and the hotkey reaches a phone only from a hardware keyboard.
- **`add()` and `undoable()`**, which make messages from script, and the undo
  keys with `undoHint`, `undoKeys`, and `undoLabel`. A phone's messages come
  from your state, and an Undo button you pass into a message's `actions`
  does what `undoable()` offers, as the gallery's `undo` example does.
- **The two live regions that say each message.** A phone's messages say
  themselves.
- **The `alertdialog` role a reader moving through the stack hears each
  message by**, which React Native does not have.
- **The hold a pointer or focus anywhere in the stack makes on every clock.**
  A phone holds every clock on a touch on any message, and a message's own
  clock on keyboard focus on its dismiss button.
- **Escape on an action passed in**, which is your view on a phone, and
  focus handed on past the messages to where it was before the stack.
- **`pause()` and `resume()`**, and the swipe's travel written as
  `--toast-swipe-x` and `--toast-swipe-y`.
- **The stagger the `arriving` example drew with `::part(item)`**, which a
  phone has no part selector for.

## Tour

`HelixTour` and `HelixTourStop`, from `@fusion.dev/helix/tour`, are a guided
tour and one stop on it. Name each stop's target by the `id` you give the
control it explains, and open and move the tour from your own state:

```tsx
<HelixButton id="publish">Publish</HelixButton>

<HelixTour
  index={index}
  label="Getting started"
  onBeforeActivate={(event) => setIndex(Number(event.detail.value))}
  onBeforeClose={() => setOpen(false)}
  onComplete={() => setOpen(false)}
  open={open}
>
  <HelixTourStop for="publish" placement="bottom-start">
    <HelixText as="h3">Publish when you are ready</HelixText>
  </HelixTourStop>
</HelixTour>
```

**Each stop is a layer placed against its target**, the view registered
under the id its `for` holds, as [Layers](#layers) says, on the side its
`placement` asks for, turned to the other side where that one has no room,
the tour's `spotlightPadding` and its arrow clear of the target, with its
arrow on the edge that faces the target and the `placed-` and `aligned-`
states of the side it landed on. A target inside a menu or a drawer is
registered while that layer draws it, so the stop is placed once the menu
or the drawer is open. A `dialog` stop stands in the middle of the window
and a `floating` one in the corner at the end of its bottom edge, clear of
the home indicator, and neither draws an arrow.

**The tour moves as the web's does**:

- Next goes on and, on the last stop, says `doneLabel` and finishes the
  tour: `onComplete`, then `onTourStatus` with `completed`, and the tour
  closes with nothing asked. Back goes to the stop before, passing over a
  `wait` stop, and is not drawn on the first stop. Skip, a close request
  (Escape, Android's back, or VoiceOver's escape), and a touch outside the
  stop and its target under `outsidePress="close"` ask `onBeforeClose`,
  which a handler may refuse, then the tour closes and sends `onTourStatus`
  with `skipped`. `onToggle` follows `open` either way.
- A press on a stop's control sends the stop's `onTourAsk`, which the tour's
  `onTourAsk` hears after it with the same event. Each move asks
  `onBeforeActivate` with the new index as `value`, which a handler may
  refuse, and sends `onActivate` once it stands. Writing `index` moves with
  nothing sent.
- Right and Left from a hardware keyboard on a stop's panel go on and back,
  turned on a right-to-left page, and never finish the tour.
- A `wait` stop shows nothing: the tour sends `onTourStatus` with `waiting`,
  is in its `waiting` state, and moves on by itself once a view registers
  under the stop's `for`, as a menu the reader opens draws its rows.
- A stop's `effect` runs as the tour reaches it, with the stop's index, its
  target's view, and `next` and `skip`. A promise it returns holds the stop
  back, with the tour in its `preparing` state, and a function it returns
  runs as the tour leaves the stop.
- The tour's `backLabel`, `nextLabel`, `doneLabel`, and `skipLabel` stand over
  each stop's own where they hold words. Each stop's place in the run, its
  `progressLabel` such as "2 of 5", is said as the stop shows, and drawn
  under `progress`.

**The spotlight lights the current target**: the tour measures the target's
view in the window each frame while it lights it, and draws a ring as wide
as the window around the box, `spotlightPadding` past each side, rounded by
`--tour-spotlight-radius`, in `--tour-scrim-color`. A `dialog` or a
`floating` stop, or a stop whose target is not drawn, shows over the
backdrop, the same tint over the whole window. Both are decorative layers
under the stops and under any menu or drawer the tour points into.

**Focus follows the run.** Opening moves focus to the first stop's panel. A
move takes it to the next stop's panel where focus was in the tour, on no
view, as after a touch, or in a stop. Ending gives it back to where it was
as the tour opened, again only where it was in the tour. At a `wait` stop,
focus goes to the view the stop before it points at. **Each stop says
itself as it shows**: the tour's `label` on the first stop shown after the
tour opens, then the stop's name, the words passed into `heading`, the first
Helix Text `as` a heading in its content, its `label`, or its place, then
the words of its content and its place.

These are the web's:

- **The region landmark `label` names**, which a phone has no landmarks for.
  A phone says it as the tour opens.
- **The scroll that brings a target into view** before its stop is shown.
  A target in a scroll view is placed against where it stands.
- **`outsidePress="block"`**, which refuses a press outside the stop and its
  target. A phone has no way to refuse a touch outside a view without a
  scrim, and a scrim with a hole in it would refuse the touch on the target
  too.
- **The first control inside a `wait` stop's previous target**, which the
  web focuses. A phone has no element to look inside, so it focuses the
  registered view itself.
- **`next()`, `back()`, `skip()`, `length`, and `stops`**, which a phone's
  code reaches through `index` and `open`, as the gallery's examples do.
- **Escape and Android's back at a `wait` stop**, which shows no panel to
  hear them on a phone.
- **Right and Left from a control inside a stop**, which a phone hears only
  on the stop's panel.
- **A stop's name from a heading element and its description from the
  leading words of its content**, as `aria-labelledby` and
  `aria-describedby` give them. A phone says them as the stop shows.

## Navigation

`HelixNavigation`, from `@fusion.dev/helix/navigation`, is a navigation
landmark named by its `label`, `Main` until it is given one, around its
`HelixNavigationItem`s. **Each item with an `href` is a link**: a press sends
`onSelect` with the `href` as its value, and opens it through the open-link
your app sets, unless the handler refused it. An item with no `href` is its
words.

**Your app says which destination is current**, with each item's `current`,
as a router does once it has moved: `page` for the page the reader is on, and
`location`, `step`, `date`, or `time` for those. A screen reader hears
"Current page", or the words for the value, after the item's own, and the
current page's words are drawn at full strength. A press chooses nothing, so
an app that routes itself refuses `onSelect` and writes `current` where it
went.

**One mark stands at the current destination** and glides to the next one
your app marks, the one marked `page` where several are: a pill on the
destination, a bar on a rule under the row under `variant="underlined"`, and
a raised pill in a sunken track under `variant="segmented"`. Under
`orientation="vertical"` the destinations stand in a column, each the
column's width with its words at its start, and the mark moves down it, or
stands along the column's end edge under `underlined`. A row longer than the
screen scrolls inside the bar.

**With `arrows`, the arrow keys from a hardware keyboard move focus** along
the way the destinations run, Left and Right in a row and Up and Down in a
column, and Home and End to the first and the last, choosing nothing and
stopping at the ends. The arrows across them are left to your app. Each
destination is a stop of its own.

**The navigation is in its `open` state while an element among its
destinations stands open**: a layer's element, such as a popover, while its
layer stands open, and an element whose toggle opens, such as an accordion
section, while it stands open. Each Helix element says so to the element
around that names a `disclosed` state, inside layers too, since a phone has
no event that travels up the tree.

**On a phone, an item stands for its `href`**, so give each item a different
one for the arrow keys to tell them apart. A `HelixMegamenu` among the
destinations is one of them, as [Megamenu](#megamenu) says.

These are the web's: links of your own, `<a>` with `aria-current`, which the
`data-navigation-item` recipe styles; destinations written as a `<ul>` of
`<li>`; the name a host's `aria-label` or `aria-labelledby` gives the
landmark; the `duplicate-name` warning where two navigations of one document
share a name, since a phone has no document to compare them in; and an
item's `rel` and `target`. On the
web the mark is centered on the bar, and on a phone it stands at the
destination's top, which is the same place while each destination fills the
bar, as it does.

## Steps

`HelixSteps`, from `@fusion.dev/helix/steps`, is a list named by its
`label`, and each `HelixStep` an item of it. **A press on a stage's name
goes to it**: the step sends `onSelect`, the sequence `onBeforeActivate`,
and either handler may refuse, and then it sends `onActivate`. Without
`active`, each step's own `current` says where the reader is. A disabled
step takes no press. With `arrows`, the arrow keys along the way the steps
run move focus among the names, Left and Right in a row and Up and Down
under `orientation="vertical"`, choosing nothing and stopping at the ends,
and Home and End go to the first and the last. The arrows across the way
the steps run are left to the page, as on the web.

The mark is a tick on a finished stage, a dot in a ring where the reader
is, and an empty ring ahead, or the stage's number under
`variant="numeric"`. A screen reader hears "Current step" after the current
stage's name, and its `complete-label` after a finished one's. A line in two
halves joins each mark to its neighbors, along a row or down a column under
`orientation="vertical"`, where the current stage opens what its `content`
holds under its name. On a phone the stage opens to the measured height of
what it holds, as on the web.

**On a phone, a step is named by its `value`**, so give each step a value
for the sequence to move. These are the web's for now: naming a step by its
place where it has no value, `linear` and `completion`, `validate`,
`next()`, `previous()`, and `reset()`, and the `progress` part.

## Badges, trends, and stats

`HelixBadge`, from `@fusion.dev/helix/badge`, pins a count, a dot, or words
to the corner of what it wraps, or puts it in the line under
`placement="inline"`. **The mark is worked out as on the web**: no `value` is
a dot, zero shrinks and fades the mark out, a count past `max` reads `99+`,
and `formatOptions` writes a count in `locale`, or the reader's locale where
`locale` is empty. The mark is a status named by `label`, with `{count}`
filled in, or by what it shows. A dot with no label and a blank mark are
hidden from screen readers. A screen reader says a new count as it changes,
TalkBack through the mark's live region and VoiceOver through an
announcement. The
control the badge wraps and the mark are two stops, since a phone has no
reference from a passed-in child to the words beside it. `attention` swells
or hops the mark until the reader asks for reduced motion or the app pauses
its motion.

`HelixTrend`, from `@fusion.dev/helix/trend`, draws the arrow for its
`movement`, or for the sign of `value`, and colors the arrow and the change
by `good`: success for a move the way it names, and danger against it. Under
`colorBy="movement"` a rise and a fall take `color-rise` and `color-fall`. A
screen reader hears the movement in words, such as "Up, better", from the
six `*-label` props or the words registered for `helix-trend` in the
trend's locale. `value` writes the change with `formatOptions`, its size with
no sign unless `signDisplay` asks for one.

`HelixStat`, from `@fusion.dev/helix/stat`, stacks its `label`, its figure
with its `unit` on one baseline, and the `HelixTrend` passed into `trend`.
`direction="row"` lays them out in one line. A stat with a label is a group
named by the label's words. `value` writes the figure with `formatOptions`
in `locale`. `HelixStatGroup` wraps its stats, shares a row among `columns`,
and draws a rule between them under `divided`. It is a group while it has a
`label`.

The arrow, the mark's height, its dot, and the gaps stop growing at 1.353
times the default text size, and the counts, the figures, and the words grow
fully.

## Tags

`HelixTag`, from `@fusion.dev/helix/tag`, is a short label in one of seven
tones, filled with a tint of its tone, or with the tone under
`emphasis="solid"`, or edged with it alone under `emphasis="outlined"`.
`start` holds its category, drawn before the label in a heavier weight. **A
tag is one element a screen reader reaches**, read by its words, and a tag
with an `href` is a link that opens through the open-link your app sets.

**A `dismissible` tag asks to be removed and stays until you remove it.**
Its remove button sends `onDismiss`, with the tag's words as
`event.detail.label`, and a screen reader is offered the same press as an
action of the tag, named for it, "Remove Apple": `dismissLabel` with
`{label}` for the tag's words, its category first, or the words registered
for `helix-tag` in the tag's language. A `disabled` tag offers no action.

`HelixTagGroup` holds its tags as one group named by its `label`. **Under
`selectionMode`, a press selects a tag**, one at a time under `single` and
any number under `multiple`, and a selected tag fills with its tone. The
group asks with `onBeforeChange`, then sends `onChange`, and its `value`
holds the selected tags' values, separated by commas. A tag with no `value`
stands for its words, its category first. The arrow keys, Home, End, and a
typed letter move focus and stop at the ends; Space and Enter select,
Enter follows a link tag, Control or Command with A selects every tag, and
Escape lets go. **Delete and Backspace send the focused tag's `onDismiss`**,
which reaches the group's `onDismiss` too. Once your app takes the tag out,
focus moves to the next tag, or to the one before after the last, and to the
group's empty words, `emptyLabel` or what you pass into `empty`, once none
is left. A selected tag that is removed leaves `value`, and the group sends
`onChange`.

These are the web's for now: a lone tag hands focus to the tag beside it
when it is removed only on the web, since a phone has no siblings to find it
by, and a Shift range on a phone only adds tags, where the web's lets go of
the ones Shift with an arrow moves back over. The height, the corners, the
gaps, and the remove mark stop growing at 1.353 times the default text size,
and the words grow fully.

## Reordering

A `reorderable` list lets a reader move its rows. A drag on a row's grip lifts
the row, the others make room, and a screen reader adjusts the grip to move the
row one place. The list asks with `onBeforeReorder` and then tells the new
order in `onReorder`. A page drawn in `ScrollArea` scrolls while a held row is
near its top or bottom.

A list draws its rows as plain views while `reorderable` is off. Turning it on
or off draws each row's views again, so a component inside a row starts again
with fresh state.

[Documentation](https://fusion.dev/helix) · [Components](https://fusion.dev/helix/components)

MIT
