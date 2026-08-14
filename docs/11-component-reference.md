# Component Reference

## BaseAccordion

### Root

Groups collapsible sections. Holds the mode and nothing else: the item that was
clicked is what coordinates, resolving its peers structurally on demand.

#### Properties

| Property | Attribute | Type                                    | Default | Inherited From | Description                        |
| -------- | --------- | --------------------------------------- | ------- | -------------- | ---------------------------------- |
| `mode`   | `mode`    | `"single" \| "single-collapsible"`      | -       | -              | How many sections may be open. Absent is multiple. |

Absent means multiple, which is the forgiving default and costs no attribute on
the host. `single` keeps exactly one open and refuses to close the last;
`single-collapsible` keeps at most one and lets it close. One property rather
than a mode plus a `collapsible` boolean, because `collapsible` alongside
multiple means nothing and a union can simply not offer it.

#### Slots

| Slot        | Description        |
| ----------- | ------------------ |
| _(default)_ | The items.         |

### Item

A single expandable section. It is also the coordinator: on click it walks up to
the nearest accordion, reads the mode, and closes its peers itself. Only direct
children are peers, so an accordion nested inside an item's content is a
separate set.

#### Properties

| Property           | Attribute           | Type                                       | Default | Inherited From         | Description                                             |
| ------------------ | ------------------- | ------------------------------------------ | ------- | ---------------------- | ------------------------------------------------------- |
| `chevronPlacement` | `chevron-placement` | `"start" \| "end" \| "none"`             | -       | -                      | Where the chevron sits. Absent lets the component decide. |
| `disabled`         | `disabled`          | `boolean`                                  | `false` | -                      | Whether the section can be opened.                       |
| `defaultOpen`      | `default-open`      | `boolean`                                  | `false` | `MixinControllerOpen`  | Initial state for uncontrolled use.                      |
| `isOpen`           | -                   | `boolean` _(readonly)_                     | -       | `MixinControllerOpen`  | The resolved state, in either mode.                      |
| `onOpenChange`     | -                   | `((open: boolean) => void) \| undefined`  | -       | `MixinControllerOpen`  | Callback invoked after the state is applied.             |
| `open`             | `open`              | `boolean \| undefined`                    | -       | `MixinControllerOpen`  | Controlled state. Defined enters controlled mode.        |

#### Events

| Event         | Type              | Description                                    |
| ------------- | ----------------- | ---------------------------------------------- |
| `helix-open`  | `HelixOpenEvent`  | About to open. Cancelable; neither bubbles nor is composed. |
| `helix-close` | `HelixCloseEvent` | About to close. Same propagation.              |

#### Methods

| Method               | Mixin                 | Description                                                                 |
| -------------------- | --------------------- | --------------------------------------------------------------------------- |
| `requestOpen(next)`  | `MixinControllerOpen` | Announces, then applies if no listener refused. Returns whether it applied.  |
| `toggleOpen()`       | `MixinControllerOpen` | Requests the opposite of the current state.                                  |

#### Slots

| Slot        | Description                                   |
| ----------- | --------------------------------------------- |
| _(default)_ | The revealed content.                         |
| `summary`   | The always-visible trigger content.           |
| `caption`   | Secondary text below the summary.             |
| `chevron`   | Replaces the disclosure chevron.              |
| `start`     | Content before the summary.                   |
| `end`       | Content after the summary.                    |

`start` and `end` rather than `prefix` and `suffix`, because Button already uses
that pair and one vocabulary is enough.

#### CSS Parts

| Part            | Description                                        |
| --------------- | -------------------------------------------------- |
| `trigger`       | The clickable summary row.                         |
| `chevron`       | The default disclosure chevron.                    |
| `content`       | The region whose height animates.                  |
| `content-inner` | Padding wrapper inside it.                         |

No `root`: the host is the box. `content` and `content-inner` are both needed,
because padding on the animating element makes it impossible to collapse to
zero.

## BaseAppHeader

### Root

A page-level banner. The regions are named for where they are rather than for
what goes in them, and it renders no landmark: a header is not inherently
navigation. The `<nav>` and the marker that travels between its links belong to
`NavBar`, which is what usually goes in the middle.

#### Properties

| Property  | Attribute    | Type      | Default | Inherited From | Description                              |
| --------- | ------------ | --------- | ------- | -------------- | ---------------------------------------- |
| `navAlign` | `nav-align` | `"start"` | -       | -              | Absent centers the middle region against the banner. |

#### Slots

| Slot        | Description                          |
| ----------- | ------------------------------------ |
| `start`     | Leading content, usually a wordmark. |
| _(default)_ | The middle region.                   |
| `end`       | Trailing content.                    |

#### CSS Parts

| Part      | Description                        |
| --------- | ---------------------------------- |
| `row`     | The centered row inside the banner. |
| `start`   | The leading region.                |
| `content` | The middle region.                 |
| `end`     | The trailing region.               |

No `root`: the host is the banner, carries the material and spans the window,
and `row` carries the measure. The three regions do have wrappers, and they earn
them: the row is a grid, and a grid needs three items to put the middle one in
the middle. A bare slot is `display: contents`, so two trailing actions would
take two tracks and push the middle off center.

## BaseAppSwitcher

### Root

Headless app-switcher with floating dropdown, search filtering, and view toggle.

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## BaseAvatar

### Root

Represents a person or entity with an image or their initials. One element, not
three: a separate image and fallback would each have to be written for every
avatar and would coordinate through an event, and the only thing that buys is
trying several sources in turn. The fallback carries no behavior, which makes it
a slot; the image owns load state, but the root already owns it.

#### Properties

| Property | Attribute | Type     | Default | Inherited From | Description                                          |
| -------- | --------- | -------- | ------- | -------------- | ---------------------------------------------------- |
| `label`  | `label`   | `string` | `''`    | -              | Accessible name, when it should differ from `name`.  |
| `name`   | `name`    | `string` | `''`    | -              | The person or entity. Drives the initials and the default label. |
| `src`    | `src`     | `string` | `''`    | -              | Image to show. Falls back if it fails.               |

#### Events

| Event   | Type    | Description                              |
| ------- | ------- | ---------------------------------------- |
| `load`  | `Event` | Relayed from the image once it has loaded. |
| `error` | `Event` | Relayed from the image when it fails.    |

Relayed under their native names rather than as a custom status event, because
that is the vocabulary a consumer already knows. They are not composed, so they
stop at the shadow boundary without the relay.

#### Slots

| Slot        | Description                                              |
| ----------- | -------------------------------------------------------- |
| _(default)_ | Shown when there is no usable image, in place of initials. |

The slot is the fallback rather than a replacement for everything, so a consumer
can say "this image, and my icon if it fails". Its own fallback is the initials.

#### CSS Parts

| Part       | Description                                  |
| ---------- | -------------------------------------------- |
| `image`    | The image, when one is loading or loaded.    |
| `initials` | The initials, when there is no usable image. |

No `root`: the host is the box. `role="img"` and the accessible name go through
`ElementInternals`, so the avatar itself announces rather than a span inside it,
and the host carries no attribute a consumer's markup lacks.

The `<img>` keeps an empty `alt` deliberately: the host already carries the
name, so a populated one announces the same person twice.

## BaseBadge

### Root

Attaches a count or a presence mark to another element. Wraps what it decorates
and pins the indicator to its corner, so the thing being counted stays the thing
in the layout.

#### Properties

| Property | Attribute | Type                  | Default | Inherited From | Description                                    |
| -------- | --------- | --------------------- | ------- | -------------- | ---------------------------------------------- |
| `dot`    | `dot`     | `boolean`             | `false` | -              | Shows a presence mark with no text.            |
| `label`  | `label`   | `string`              | `''`    | -              | Accessible name. Required for a dot.           |
| `max`    | `max`     | `number \| undefined` | -       | -              | Cap for a numeric value. Past it, `{max}+`.    |
| `value`  | `value`   | `string`              | `''`    | -              | The count or short text to show.               |

**A dot needs a label.** Without one it is a colored circle that announces
nothing, which tells a sighted reader there is something new and tells everyone
else there is not. With no label the indicator is hidden from assistive
technology rather than announcing an empty mark.

With no value and no `dot`, nothing renders: an empty indicator reads as "zero
of something", and that is not what zero looks like.

#### Slots

| Slot        | Description                |
| ----------- | -------------------------- |
| _(default)_ | The element being decorated. |

#### CSS Parts

| Part        | Description       |
| ----------- | ----------------- |
| `indicator` | The count or dot. |

No `root`: the host is the box.

## BaseBanner

### Root

A page-level message above the masthead, which can be dismissed. Chrome rather
than content: a banner speaks for the whole page, where a `Callout` interrupts a
document to set a passage apart and is read where it sits. Neither is a variant
of the other.

#### Properties

| Property       | Attribute        | Type                                                | Default     | Inherited From | Description                          |
| -------------- | ---------------- | --------------------------------------------------- | ----------- | -------------- | ------------------------------------ |
| `dismissible`  | `dismissible`    | `boolean`                                            | `false`     | -              | Whether the reader can close it.     |
| `dismissLabel` | `dismiss-label`  | `string`                                             | `'Dismiss'` | -              | Accessible name for the control.     |
| `severity`     | `severity`       | `"info" \| "success" \| "warning" \| "danger"`    | -           | -              | What kind of attention it needs.     |

**Always a polite live region**, and deliberately not configurable.
`role="alert"` is assertive and interrupts whatever is being read, which is
right for something appearing mid-session and wrong for something in the served
HTML: an assertive banner cuts across a screen-reader user on every page load,
before they have read anything. The severity does not change that, because an
error that was always there is still not an interruption.

#### Events

| Event           | Type                | Description                              |
| --------------- | ------------------- | ---------------------------------------- |
| `helix-dismiss` | `HelixDismissEvent` | The reader asked to close it. Cancelable. |

A request, not a notification. The banner does not remove itself, because the
consumer owns the markup and taking the node out from under them would put their
state and the document out of step. `preventDefault()` is a refusal.

#### Slots

| Slot        | Description                                      |
| ----------- | ------------------------------------------------ |
| _(default)_ | The message.                                      |
| `actions`   | What to do about it, usually a link or a button.  |
| `icon`      | Replaces the glyph inside the dismiss control.    |

#### CSS Parts

| Part      | Description                     |
| --------- | ------------------------------- |
| `content` | The message region.             |
| `actions` | The trailing action region.     |
| `dismiss` | The control that asks to close. |

No `root`: the host is the band.

## BaseBreadcrumbs

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseButton

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseButtonGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseCalendar

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseCard

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseCarousel

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseCheckbox

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseCheckboxGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseChip(Tag)

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseClock

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseCodeBlock

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseCombobox

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseCopyButton

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseDatePicker

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseDialog

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseDrilldown

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseDropdown

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseEmpty

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseFileUpload

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseFormField

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseIcon

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseIconButton

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseIndicator

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseInput

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseInputPhone

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseInputPin

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseInputSearch

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseList

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseListbox

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseLoader

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseNavBar

### Root

A set of destinations, with a marker on the current one. Renders a real `<nav>`,
which is the landmark a screen-reader user jumps to. Its own component rather
than a region of `AppHeader`, because a header is not inherently navigation and
navigation is not only ever in a header.

**It renders no links.** The consumer brings them, marked with
`aria-current="page"` and styled by the `data-nav-item` recipe, for the same
reason nothing else here renders an anchor: a router renders its own and cannot
render it inside this shadow root.

What this owns is the marker that travels between them, and that is the whole
reason it is a component. A marker that moves needs something that knows where
every item is, and `aria-current` is how it knows which: the thing that makes
the page announce correctly is the same thing that places the marker.

#### Properties

| Property | Attribute | Type     | Default  | Inherited From | Description                     |
| -------- | --------- | -------- | -------- | -------------- | ------------------------------- |
| `label`  | `label`   | `string` | `'Main'` | -              | Accessible name for the landmark. |

#### Slots

| Slot        | Description                                 |
| ----------- | ------------------------------------------- |
| _(default)_ | The destinations, as the consumer's own links. |

#### CSS Parts

| Part        | Description                                     |
| ----------- | ----------------------------------------------- |
| `nav`       | The navigation landmark.                        |
| `indicator` | The marker that travels to the current destination. |

## BaseOption

> maybe this goes to select?

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseOptionGroup

> Maybe this goes to select?

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BasePagination

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BasePopup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseProgressBar

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseRadio

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseRadioGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseSandbox

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseSelect

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseSelector

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseSkeleton

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseSlider

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseStat

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseStatGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseStepper

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseSwitch

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseTable

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseTabs

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseText

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseTextarea

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseTimePicker

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseToast

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseToggle

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseToggleGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseToolbar

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseTooltip

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## BaseTrend

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |


---

## Accordion

### Root

A set of stacked, expandable sections.

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         |                |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ | content     |

### Item

A single expandable section.

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         |                |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Methods

| Method | Mixin | Description |
| ------ | ----- | ----------- |
|        |       |             |

#### Slots

| Slot | Description |
| ---- | ----------- |
|      |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## AppHeader

### Root

Headless app header with start, content, and end slot regions.

#### Slots

| Slot | Description |
| ---- | ----------- |
|      |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

## AppSwitcher

### Root

Headless app-switcher with floating dropdown, search filtering, and view toggle.

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Avatar

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Badge

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Banner

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Breadcrumbs

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Button

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## ButtonGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Calendar

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Card

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Carousel

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Checkbox

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## CheckboxGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Chip(Tag)

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Clock

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## CodeBlock

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Combobox

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## CopyButton

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## DatePicker

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Dialog

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Drilldown

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Dropdown

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Empty

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## FileUpload

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## FormField

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Icon

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## IconButton

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Indicator

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Input

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## InputPhone

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## InputPin

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## InputSearch

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## List

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Listbox

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Loader

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Option

> maybe this goes to select?

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## OptionGroup

> Maybe this goes to select?

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Pagination

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Popup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## ProgressBar

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Radio

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## RadioGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Sandbox

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Select

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Selector

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Skeleton

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Slider

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Stat

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## StatGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Stepper

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Switch

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Table

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Tabs

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Text

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Textarea

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## TimePicker

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Toast

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Toggle

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## ToggleGroup

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Toolbar

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Tooltip

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## Trend

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

---


## Family

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Methods

| Method | Mixin | Description |
| ------ | ----- | ----------- |
|        |       |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

#### CSS Properties

| Property | Default | Description |
| -------- | ------- | ----------- |
|          |         |             |

## ComponentFamily

### Component

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Methods

| Method | Mixin | Description |
| ------ | ----- | ----------- |
|        |       |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot | Description |
| ---- | ----------- |
|      |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

#### CSS Properties

| Property | Default | Description |
| -------- | ------- | ----------- |
|          |         |             |

## ComponentFamily

### Component

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Methods

| Method | Mixin | Description |
| ------ | ----- | ----------- |
|        |       |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot | Description |
| ---- | ----------- |
|      |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

#### CSS Properties

| Property | Default | Description |
| -------- | ------- | ----------- |
|          |         |             |

## ComponentFamily

### Component

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Methods

| Method | Mixin | Description |
| ------ | ----- | ----------- |
|        |       |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot | Description |
| ---- | ----------- |
|      |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

#### CSS Properties

| Property | Default | Description |
| -------- | ------- | ----------- |
|          |         |             |

## ComponentFamily

### Component

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Methods

| Method | Mixin | Description |
| ------ | ----- | ----------- |
|        |       |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot | Description |
| ---- | ----------- |
|      |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

#### CSS Properties

| Property | Default | Description |
| -------- | ------- | ----------- |
|          |         |             |

----

## ComponentFamily

### Component

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Methods

| Method | Mixin | Description |
| ------ | ----- | ----------- |
|        |       |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot | Description |
| ---- | ----------- |
|      |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

#### CSS Properties

| Property | Default | Description |
| -------- | ------- | ----------- |
|          |         |             |

---

## BaseFamily

### Root

Description

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

#### Methods

| Method | Mixin | Description |
| ------ | ----- | ----------- |
|        |       |             |

#### Events

| Event | Type | Description |
| ----- | ---- | ----------- |
|       |      |             |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ |             |

#### CSS Parts

| Part | Description |
| ---- | ----------- |
|      |             |

#### CSS Properties

| Property | Default | Description |
| -------- | ------- | ----------- |
|          |         |             |