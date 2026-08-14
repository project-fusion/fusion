# Component Reference

## BaseAccordion

### Root

Groups collapsible sections.

#### Properties

| Property | Attribute | Type                               | Default | Inherited From | Description                    |
| -------- | --------- | ---------------------------------- | ------- | -------------- | ------------------------------ |
| `mode`   | `mode`    | `"single" \| "single-collapsible"` | -       | -              | How many sections may be open. |

Absent means multiple. `single` keeps exactly one open and refuses to close the
last; `single-collapsible` keeps at most one and allows none.

Only direct children take part, so an accordion inside an item's content is a
separate set.

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ | The items.  |

### Item

A single expandable section.

#### Properties

| Property           | Attribute           | Type                                      | Default | Inherited From        | Description                                       |
| ------------------ | ------------------- | ----------------------------------------- | ------- | --------------------- | ------------------------------------------------- |
| `chevronPlacement` | `chevron-placement` | `"start" \| "end" \| "none"`            | -       | -                     | Where the chevron sits. Absent places it at the end. |
| `disabled`         | `disabled`          | `boolean`                                 | `false` | -                     | Whether the section can be opened.                |
| `defaultOpen`      | `default-open`      | `boolean`                                 | `false` | `MixinControllerOpen` | Initial state for uncontrolled use.               |
| `isOpen`           | -                   | `boolean` _(readonly)_                    | -       | `MixinControllerOpen` | The resolved state, in either mode.               |
| `onOpenChange`     | -                   | `((open: boolean) => void) \| undefined` | -       | `MixinControllerOpen` | Invoked after the state is applied.               |
| `open`             | `open`              | `boolean \| undefined`                   | -       | `MixinControllerOpen` | Controlled state. Defined enters controlled mode. |

#### Events

| Event         | Type              | Description                        |
| ------------- | ----------------- | ---------------------------------- |
| `helix-open`  | `HelixOpenEvent`  | About to open. Cancelable.         |
| `helix-close` | `HelixCloseEvent` | About to close. Cancelable.        |

Neither bubbles nor is composed.

#### Methods

| Method              | Mixin                 | Description                                                     |
| ------------------- | --------------------- | --------------------------------------------------------------- |
| `requestOpen(next)` | `MixinControllerOpen` | Announces, applies if not refused, and returns whether it did.  |
| `toggleOpen()`      | `MixinControllerOpen` | Requests the opposite of the current state.                     |

#### Slots

| Slot        | Description                         |
| ----------- | ----------------------------------- |
| _(default)_ | The revealed content.               |
| `summary`   | The always-visible trigger content. |
| `caption`   | Secondary text below the summary.   |
| `chevron`   | Replaces the disclosure chevron.    |
| `start`     | Content before the summary.         |
| `end`       | Content after the summary.          |

#### CSS Parts

| Part            | Description                       |
| --------------- | --------------------------------- |
| `trigger`       | The clickable summary row.        |
| `chevron`       | The default disclosure chevron.   |
| `content`       | The region whose height animates. |
| `content-inner` | Padding wrapper inside it.        |

## BaseAppHeader

### Root

A page-level banner with three regions. Renders no landmark of its own.

#### Properties

| Property   | Attribute   | Type      | Default | Inherited From | Description                                    |
| ---------- | ----------- | --------- | ------- | -------------- | ---------------------------------------------- |
| `navAlign` | `nav-align` | `"start"` | -       | -              | Absent centers the middle region in the banner. |

#### Slots

| Slot        | Description                          |
| ----------- | ------------------------------------ |
| `start`     | Leading content, usually a wordmark. |
| _(default)_ | The middle region.                   |
| `end`       | Trailing content.                    |

#### CSS Parts

| Part      | Description                         |
| --------- | ----------------------------------- |
| `row`     | The centered row inside the banner. |
| `start`   | The leading region.                 |
| `content` | The middle region.                  |
| `end`     | The trailing region.                |

## BaseAppSwitcher

### Root

Headless app-switcher with floating dropdown, search filtering, and view toggle.

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## BaseAvatar

### Root

Represents a person or entity with an image, a slotted fallback, or their
initials.

#### Properties

| Property | Attribute | Type     | Default | Inherited From | Description                                            |
| -------- | --------- | -------- | ------- | -------------- | ------------------------------------------------------ |
| `label`  | `label`   | `string` | `''`    | -              | Accessible name. Falls back to `name`.                 |
| `name`   | `name`    | `string` | `''`    | -              | The person or entity. Drives the initials.             |
| `src`    | `src`     | `string` | `''`    | -              | Image to show.                                          |

With `src`, the image is shown until it fails to load. Without one, or after a
failure, the default slot is shown, and its own fallback is the initials.

The accessible name is `label`, or `name` when there is no label. The `<img>`
carries an empty `alt`, since the host already announces the name.

#### Events

| Event   | Type    | Description                                |
| ------- | ------- | ------------------------------------------ |
| `load`  | `Event` | Relayed from the image once it has loaded. |
| `error` | `Event` | Relayed from the image when it fails.      |

#### Slots

| Slot        | Description                                                |
| ----------- | ---------------------------------------------------------- |
| _(default)_ | Shown when there is no usable image, in place of initials. |

#### CSS Parts

| Part       | Description                                  |
| ---------- | -------------------------------------------- |
| `image`    | The image, when one is loading or loaded.    |
| `initials` | The initials, when there is no usable image. |

## BaseBadge

### Root

Attaches a count or a presence mark to another element, pinned to its corner.

#### Properties

| Property | Attribute | Type                  | Default | Inherited From | Description                                 |
| -------- | --------- | --------------------- | ------- | -------------- | ------------------------------------------- |
| `label`  | `label`   | `string`              | `''`    | -              | Accessible name. Required for a dot.        |
| `max`    | `max`     | `number \| undefined` | -       | -              | Cap for a numeric value. Past it, `{max}+`. |
| `value`  | `value`   | `string`              | `''`    | -              | The count or short text to show.            |

`value` decides the mark, and there is no property for its shape:

| `value`            | Mark                |
| ------------------ | ------------------- |
| absent             | A dot.              |
| reads as zero      | None.               |
| anything else      | The value, capped by `max`. |

The dot is the indicator with nothing in it, drawn by
`[part="indicator"]:empty`. An indicator with no `label` is hidden from
assistive technology, as is one whose value counts nothing.

The indicator stays mounted when there is nothing to show, carrying `data-blank`
on the shadow content, so the styled tier transitions it out instead of having
it disappear between frames.

#### Slots

| Slot        | Description                  |
| ----------- | ---------------------------- |
| _(default)_ | The element being decorated. |

#### CSS Parts

| Part        | Description       |
| ----------- | ----------------- |
| `indicator` | The count or dot. |

## BaseBanner

### Root

A page-level message, dismissible, announced as a polite live region.

#### Properties

| Property       | Attribute       | Type                                             | Default     | Inherited From | Description                      |
| -------------- | --------------- | ------------------------------------------------ | ----------- | -------------- | -------------------------------- |
| `dismissible`  | `dismissible`   | `boolean`                                        | `false`     | -              | Whether the reader can close it. |
| `dismissLabel` | `dismiss-label` | `string`                                         | `'Dismiss'` | -              | Accessible name for the control. |
| `severity`     | `severity`      | `"info" \| "success" \| "warning" \| "danger"` | -           | -              | What kind of attention it needs. |

The live region is always polite and is not configurable.

#### Events

| Event           | Type                | Description                               |
| --------------- | ------------------- | ----------------------------------------- |
| `helix-dismiss` | `HelixDismissEvent` | The reader asked to close it. Cancelable. |

The banner does not remove itself. `preventDefault()` refuses the request.

#### Slots

| Slot        | Description                                     |
| ----------- | ----------------------------------------------- |
| _(default)_ | The message.                                     |
| `actions`   | What to do about it, usually a link or a button. |
| `icon`      | Replaces the glyph inside the dismiss control.   |

#### CSS Parts

| Part      | Description                     |
| --------- | ------------------------------- |
| `content` | The message region.             |
| `actions` | The trailing action region.     |
| `dismiss` | The control that asks to close. |

## BaseBreadcrumbs

### Root

Shows the path to the current page.

The host is the landmark, so `aria-label` on it names the trail and no property
mirrors one. A page may hold more than one navigation, and landmarks are how a
screen-reader user chooses between them.

#### Properties

None. Semantics are set through `ElementInternals`, so the host carries no
attribute it was not given.

#### Slots

| Slot        | Description                                        |
| ----------- | -------------------------------------------------- |
| _(default)_ | The trail's items, from root to the current page.   |

#### CSS Parts

| Part   | Description       |
| ------ | ----------------- |
| `list` | The ordered list. |

`role="list"` is set on the `<ol>` even though it is already a list. Removing
the markers with `list-style: none` strips list semantics in Safari, and a
breadcrumb trail always removes its markers.

### Item

One step in a breadcrumb trail. Contributes the separator and the list-item
role.

**The link is the consumer's own, slotted in.** An anchor rendered into the
item's shadow root is unreachable to the framework that owns the route, so a
router's `<a>` has to sit in the light DOM:

```html
<helix-breadcrumbs aria-label="Breadcrumb">
  <helix-breadcrumb><a data-link="quiet" href="/">Home</a></helix-breadcrumb>
  <helix-breadcrumb current>Helix</helix-breadcrumb>
</helix-breadcrumbs>
```

```jsx
<Breadcrumbs aria-label="Breadcrumb">
  <Breadcrumbs.Item><Link data-link="quiet" href="/">Home</Link></Breadcrumbs.Item>
  <Breadcrumbs.Item current>Helix</Breadcrumbs.Item>
</Breadcrumbs>
```

The link is styled with `data-link="quiet"`, the recipe navigation uses
everywhere else. The item cannot style it: a slotted anchor belongs to the outer
tree, where `:where(a)` in the base layer outranks any `::slotted` rule the item
could write.

#### Properties

| Property  | Attribute | Type      | Default | Inherited From | Description                                 |
| --------- | --------- | --------- | ------- | -------------- | ------------------------------------------- |
| `current` | `current` | `boolean` | `false` | -              | Whether this is the page the reader is on.  |

The current page is text, not a link. Linking a page to itself is a known
screen-reader annoyance, and `aria-current="page"` on the host is what conveys
position.

#### Slots

| Slot        | Description                                          |
| ----------- | ---------------------------------------------------- |
| _(default)_ | The step: a link, or the text of the current page.   |
| `separator` | Replaces the separator shown before this item.       |

#### CSS Parts

| Part        | Description                        |
| ----------- | ---------------------------------- |
| `separator` | The separator preceding the item.  |

Every item draws its own separator and the first hides it with
`:host(:first-child)`, so the trail needs no index and no coordination from the
parent.

## BaseButton

### Root

Triggers an action or submits a form.

Renders a real `<button>`, so activation, focus, and the browser's own
affordances come from the platform rather than from key handlers.
`delegatesFocus` puts focus on that inner control and serializes into the
server's markup, so the button is keyboard reachable before any script loads.

**It never renders an anchor.** A router renders its own `<a>` to intercept a
click and cannot render one inside this shadow root, so a button that could also
be a link made every such navigation a full page load. A link that looks like a
button is styling, so it is a recipe in the base layer:

```html
<a data-button="primary" href="/pricing">See pricing</a>
```

Form submission is explicit. A `<button type="submit">` inside a shadow root
submits nothing, because the form is on the other side of the boundary, so the
inner control is always `type="button"` and this element calls `requestSubmit()`
on its form. That routes through validation, where `submit()` would not.

#### Properties

| Property    | Attribute  | Type                                | Default    | Inherited From     | Description                                          |
| ----------- | ---------- | ----------------------------------- | ---------- | ------------------ | ---------------------------------------------------- |
| `disabled`  | `disabled` | `boolean`                           | `false`    | `HelixFormElement` | Whether the control is inert.                        |
| `focusable` | -          | `boolean`                           | `true`     | -                  | Whether the button holds its group's tab stop.       |
| `label`     | `label`    | `string`                            | `''`       | -                  | Accessible name, for a button whose content is not text. |
| `type`      | `type`     | `'button' \| 'submit' \| 'reset'`  | `'button'` | -                  | What activating the button does to its form.         |

`focusable` has no attribute. A toolbar keeps one tab stop across its children,
and writing `tabindex` on each of them changes markup the consumer rendered,
which a React consumer's hydration reports and does not patch up. The parent
sets this property, and the stop lands on the inner control inside the shadow
root.

`label` is a property rather than `aria-label` on the host, because it names the
inner `<button>`. An `aria-label` on the host would name the host, which carries
no role.

#### Getters

| Getter   | Type                      | Inherited From     | Description                          |
| -------- | ------------------------- | ------------------ | ------------------------------------ |
| `form`   | `HTMLFormElement \| null` | `HelixFormElement` | The form this control belongs to.    |
| `labels` | `NodeList`                | `HelixFormElement` | Labels associated with the control.  |

#### Events

None of its own. `click` is the native event from the inner control and
retargets to the host, so a consumer listens for it the way they would on any
button.

#### Slots

| Slot        | Description                              |
| ----------- | ---------------------------------------- |
| _(default)_ | The button's label.                      |
| `start`     | Content before the label, usually an icon. |
| `end`       | Content after the label.                 |

#### CSS Parts

| Part     | Description        |
| -------- | ------------------ |
| `button` | The inner control. |

### Styled

Adds `appearance` (`primary`, `neutral`, `subtle`, `danger`) and `size` (`sm`,
`md`, `lg`), both reflected and both absent by default. The focus ring is
declared in the component rather than inherited, because the base layer's
`:focus-visible` rule is a light-DOM rule and stops at the shadow boundary.

## BaseButtonGroup

### Root

Groups related buttons into one control.

The host is the group: `role="group"` sits on it through internals and `label`
names it. A run of buttons with no name is announced as separate controls,
which is what the grouping exists to say it is not.

**It manages no focus.** A group is not a toolbar. The APG toolbar pattern asks
for one tab stop with arrow keys inside it, and that is what Toolbar is for.
Here every button keeps its own tab stop, which is what a reader expects from
buttons sitting side by side, and is what Shoelace and WebAwesome do for the
same component.

Buttons are slotted rather than wrapped, so they stay the consumer's own
elements and keep whatever appearance and size they were given.

#### Properties

| Property | Attribute | Type     | Default | Inherited From | Description                    |
| -------- | --------- | -------- | ------- | -------------- | ------------------------------ |
| `label`  | `label`   | `string` | `''`    | -              | Accessible name for the group. |

An author's `aria-label` on the host still overrides `label`, since the
property sets the implicit name through `ElementInternals`.

#### Slots

| Slot        | Description              |
| ----------- | ------------------------ |
| _(default)_ | The buttons in the group. |

#### CSS Parts

None. The host is the box.

### Styled

The buttons are joined into a single shape: outer corners keep their radius,
inner ones lose it, and adjacent borders collapse onto one line.

That joining lives in the base layer, paired with `data-button` the way the
button's own box is. The corner belongs to the control inside each button's
shadow root, and a rule inside the group cannot reach through a second
boundary, where `::part` from the document can. The same rule therefore joins a
consumer's own anchor styled as a button:

```html
<helix-button-group label="History">
  <helix-button>Back</helix-button>
  <a data-button href="/next">Forward</a>
</helix-button-group>
```

## BaseCalendar

### Root

Shows a month, and takes a date from it.

A grid of days per the APG date pattern: the whole grid is one tab stop, arrows
move by day and week, `PageUp` and `PageDown` by month, `Shift` with either by
a year, and `Home` and `End` to the ends of the week. Only the focused cell is
in the tab sequence.

Roving `tabindex` is written on the cells, which is free here because they are
rendered into this shadow root rather than being markup a consumer wrote. That
is why this needs no `focusable` property, where Toolbar and Tree do.

**Dates are `YYYY-MM-DD` and every calculation is in UTC.** A local-time `Date`
shifts across a timezone or a daylight-saving boundary, so the same calendar
would render a different grid depending on where it is read. A month step
clamps, so the 31st plus a month is the 28th and not the 3rd.

#### Properties

| Property         | Attribute           | Type                       | Default      | Inherited From | Description                                              |
| ---------------- | ------------------- | -------------------------- | ------------ | -------------- | -------------------------------------------------------- |
| `disableDates`   | `disable-dates`     | `string`                   | `''`         | -              | Dates that cannot be chosen, comma separated.            |
| `disableDays`    | `disable-days`      | `string`                   | `''`         | -              | Days of the week that cannot be chosen, `0` to `6`.      |
| `firstDayOfWeek` | `first-day-of-week` | `number`                   | `0`          | -              | First column of the week, `0` for Sunday.                |
| `invalid`        | `invalid`           | `boolean`                  | `false`      | -              | Whether the current selection fails validation.          |
| `label`          | `label`             | `string`                   | `'Calendar'` | -              | Accessible name for the grid.                            |
| `locale`         | `locale`            | `string`                   | `''`         | -              | Locale for month and day names.                          |
| `max`            | `max`               | `string`                   | `''`         | -              | Latest selectable date.                                  |
| `min`            | `min`               | `string`                   | `''`         | -              | Earliest selectable date.                                |
| `mode`           | `mode`              | `'range' \| 'multiple'`    | -            | -              | How many dates can be held at once.                      |
| `month`          | `month`             | `string`                   | `''`         | -              | The month on show, as `YYYY-MM`.                         |
| `months`         | `months`            | `number`                   | `1`          | -              | How many months to show, side by side.                   |
| `value`          | `value`             | `string`                   | `''`         | -              | The selected dates, comma separated.                     |

**`mode` decides how many dates `value` holds, and all three read the same
attribute.** Absent takes one. `range` takes two and marks everything between
them, starting over on the third click rather than replacing an end at random.
`multiple` toggles, so clicking a chosen date takes it out.

`month` is separate from `value`, so paging through months selects nothing and
a consumer can drive the view. Left unset it follows the first selected date,
and then the current month.

**Set `locale` where output is compared across environments.** Left unset,
month and day names come from the runtime's own locale, and a server and a
browser need not agree on what that is.

A date is barred by any of four axes, which compose: `min`, `max`,
`disableDays` by weekday, and `disableDates` by name. A barred date stays in the
grid, marked `aria-disabled`, rather than being dropped, so the weeks keep
their shape.

#### Events

| Event          | Type                | Description                                            |
| -------------- | ------------------- | ------------------------------------------------------ |
| `helix-select` | `HelixSelectEvent`  | Fired when a date is chosen, carrying the whole `value`. |

#### CSS Parts

| Part       | Description                              |
| ---------- | ---------------------------------------- |
| `months`   | The run of months.                       |
| `month`    | One month, its header and its grid.      |
| `header`   | The month name and its controls.         |
| `previous` | The control that moves back a month.     |
| `next`     | The control that moves on a month.       |
| `heading`  | The month and year being shown.          |
| `grid`     | The grid of days.                        |
| `weekday`  | A column header naming a day of the week. |
| `week`     | One row of days.                         |
| `day`      | One day.                                 |

With more than one month, the controls appear once across the run: back on the
first, forward on the last. A pair per month would offer several ways to make
the same move.

A day carries `data-outside` when it belongs to a neighbouring month, and
`data-range-start` or `data-range-end` at the ends of a range.

### Styled

Days are 30 by 30, sized by `--calendar-day-size`, and six week rows always
render so the grid keeps one height between months. Days from neighbouring
months stay in place and stay selectable, marked quieter rather than hidden.

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

Shows one slide of several, with controls to move between them.

The track is a scroller with scroll snapping, so a drag, a trackpad swipe, and
the browser's own momentum all work without being reimplemented. The controls
scroll it; they do not drive a transform.

The host is announced as a carousel through `aria-roledescription`, so a reader
meeting the controls knows what they are for rather than hearing "group".

**Slides are the consumer's own elements.** Each is given `role="group"`,
`aria-roledescription="slide"`, and a name reading its position in the set. A
slide that carries its own `aria-label` keeps it.

#### Properties

| Property   | Attribute  | Type      | Default      | Inherited From | Description                                     |
| ---------- | ---------- | --------- | ------------ | -------------- | ----------------------------------------------- |
| `autoplay` | `autoplay` | `boolean` | `false`      | -              | Whether the carousel advances on its own.       |
| `index`    | `index`    | `number`  | `0`          | -              | The slide in view, counted from zero.           |
| `interval` | `interval` | `number`  | `5000`       | -              | How long each slide is held, in milliseconds.   |
| `label`    | `label`    | `string`  | `'Carousel'` | -              | Accessible name for the carousel.               |
| `loop`     | `loop`     | `boolean` | `false`      | -              | Whether moving past either end wraps.           |

#### Methods

| Method            | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `goTo(index)`     | Moves to a slide, wrapping only where `loop` says to.     |

#### Getters

| Getter   | Type            | Description                        |
| -------- | --------------- | ---------------------------------- |
| `slides` | `HTMLElement[]` | The slides, in light-DOM order.    |

#### Events

| Event          | Type               | Description                                          |
| -------------- | ------------------ | ---------------------------------------------------- |
| `helix-select` | `HelixSelectEvent` | Fired when the slide in view changes, with its index. |

Dispatched for a scroll as well as for a control, so a drag that settles on
another slide reports it.

#### Rotation

`autoplay` adds a control that stops and starts rotation, and it is first in
the tab order: it is the way out of a moving carousel, so it cannot sit behind
the slides a reader is trying to escape. Its name states the action it
performs.

**Rotation stops on hover and on focus, and once stopped it stays stopped.**
The APG is explicit that it must not resume unless the reader asks, so moving
the pointer away does not start it again. Only the control does.

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ | The slides. |

#### CSS Parts

| Part       | Description                                     |
| ---------- | ----------------------------------------------- |
| `controls` | The row of controls.                            |
| `rotation` | The control that stops and starts rotation.     |
| `previous` | The control that moves to the previous slide.   |
| `next`     | The control that moves to the next slide.       |
| `track`    | The scroller the slides sit in.                 |

### Styled

Adds `per-view`, how many slides fit across the track, which a run of cards
wants where a run of full-width panels does not. It has no default value: a
reflected property with one writes its attribute on upgrade, and the host would
then carry something the consumer's markup never had. One across is the absent
attribute.

Each slide takes a share of the track less its share of the gaps, sized from
the track rather than on the slide, which is the consumer's element.

## BaseCheckbox

### Root

A box that is ticked, or not, or neither.

Extends `HelixFormElement` with `MixinControllerChecked`.

Renders a real `<input type="checkbox">`, so the space key, the focus ring, and
the indeterminate glyph come from the platform. `delegatesFocus` puts focus on
it, and it serializes into the server's markup, so the control is reachable
before any script loads.

**The input inside a shadow root submits nothing**, because the form is on the
other side of the boundary. The host is form-associated instead and reports its
own value through `ElementInternals`, which also carries validity and answers a
form reset.

A checked box submits its `value`; an unchecked one submits nothing at all.
That is what a native checkbox does, and a form built around one reads the
absence rather than a `false`.

#### Properties

| Property         | Attribute         | Type                 | Default | Inherited From             | Description                                          |
| ---------------- | ----------------- | -------------------- | ------- | -------------------------- | ---------------------------------------------------- |
| `checked`        | `checked`         | `boolean \| undefined` | -     | `MixinControllerChecked`   | Whether it is checked. Setting this controls it.     |
| `defaultChecked` | `default-checked` | `boolean`            | `false` | `MixinControllerChecked`   | Initial state for uncontrolled use.                  |
| `disabled`       | `disabled`        | `boolean`            | `false` | `HelixFormElement`         | Whether the control is inert.                        |
| `indeterminate`  | `indeterminate`   | `boolean`            | `false` | -                          | Shows as neither checked nor unchecked.              |
| `name`           | `name`            | `string`             | `''`    | -                          | Name submitted with the form.                        |
| `onCheckedChange`| -                 | `(checked) => void`  | -       | `MixinControllerChecked`   | Called after the state is applied.                   |
| `required`       | `required`        | `boolean`            | `false` | -                          | Whether the form refuses to submit while unticked.   |
| `value`          | `value`           | `string`             | `'on'`  | -                          | Value submitted when the box is checked.             |

#### Methods

| Method                  | Inherited From           | Description                                            |
| ----------------------- | ------------------------ | ------------------------------------------------------ |
| `requestChecked(next)`  | `MixinControllerChecked` | Requests a change, and reports whether it was applied.  |
| `toggleChecked()`       | `MixinControllerChecked` | Requests the opposite of the current state.             |
| `resetChecked()`        | `MixinControllerChecked` | Drops the uncontrolled state, back to `defaultChecked`. |

`resetChecked` is what a form reset needs. Clearing `checked` alone only leaves
controlled mode: the uncontrolled value the element has been keeping is private
to the mixin and would still be what `isChecked` reports.

#### Getters

| Getter      | Type      | Inherited From           | Description                        |
| ----------- | --------- | ------------------------ | ---------------------------------- |
| `isChecked` | `boolean` | `MixinControllerChecked` | The resolved state, either mode.   |

#### Events

| Event                | Type                    | Description                                       |
| -------------------- | ----------------------- | ------------------------------------------------- |
| `helix-value-change` | `HelixValueChangeEvent` | Fired before the state changes, and cancelable.    |
| `change`             | `Event`                 | Relayed from the input once the state has changed. |

Two channels, and both are needed. `helix-value-change` announces before the
change so `preventDefault()` refuses it. `change` is the native event under its
native name, which is what makes `onChange` work for a React consumer, since
React has already wired that prop to it.

The input flips itself before either fires, so it is put back to whatever the
element resolves to. Otherwise a refused change leaves the box showing a state
the element does not hold.

`indeterminate` is presentation and nothing else. It never submits, and the
first change resolves it: a third state that survives interaction is a control
nobody can finish.

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ | The label.  |

#### CSS Parts

| Part      | Description          |
| --------- | -------------------- |
| `control` | The input.           |
| `label`   | The label beside it. |

### Styled

Adds `size` (`sm`, `md`). The box is the native input restyled with
`accent-color` rather than replaced, so the tick and the indeterminate dash are
the browser's own and the control stays a control for anything reading the page.

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

A navigation landmark holding a set of destinations, with a marker on the
current one.

Renders no links. The consumer supplies them, marked with `aria-current="page"`,
which is what the marker tracks.

#### Properties

| Property | Attribute | Type     | Default  | Inherited From | Description                       |
| -------- | --------- | -------- | -------- | -------------- | --------------------------------- |
| `label`  | `label`   | `string` | `'Main'` | -              | Accessible name for the landmark. |

#### Slots

| Slot        | Description                                    |
| ----------- | ---------------------------------------------- |
| _(default)_ | The destinations, as the consumer's own links. |

#### CSS Parts

| Part        | Description                                         |
| ----------- | --------------------------------------------------- |
| `nav`       | The navigation landmark.                            |
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