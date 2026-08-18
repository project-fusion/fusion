# Component reference

*Generated from `helix/web/custom-elements.json` by `bun run reference`. Do
not edit: `bun run check:reference` fails when this file and the manifest
disagree, and the manifest is regenerated from the source on every build.*

The styled tier, which is what an application writes. Every styled component
extends a headless one and inherits its API, so anything a base contributes is
here too, with the base named in the "From" column. The prose behind each of
these lives on the component itself and is rendered in full at
`/components/<family>`.

## Accordion

### Root — `helix-accordion`

Groups collapsible sections, one open at a time by default.

Extends `HelixBaseAccordion`.

Items share one rule between neighbours rather than each drawing its own, so
the seam between two items is one pixel and not two. Those seams are what
carry the grouping, which is why the surrounding frame is opt-in rather than
the default: an accordion is a list, where a card is a surface.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'outlined' \| 'plain' \| undefined` | - | - | Whether the stack is framed. |
| `items` | - | `HelixBaseAccordionItem[]` | - | `HelixBaseAccordion` | Direct items, in light-DOM order. Client only: the server has no tree. |
| `mode` | `mode` | `'single' \| 'single-collapsible' \| undefined` | - | `HelixBaseAccordion` | How many sections may be open at once. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The accordion's items. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--accordion-border-color` | Color of the seams, and of the frame when outlined. |
| `--accordion-radii` | Corner radius of the stack, when outlined. |

### Item — `helix-accordion-item`

One collapsible section of an accordion.

Extends `HelixBaseAccordionItem`.

The open and close transition animates `grid-template-rows` from `0fr` to
`1fr`, which is the only technique that reaches the content's intrinsic
height without measuring it in JavaScript. It is disabled under
`prefers-reduced-motion`.

Usable on its own as a disclosure, with no accordion around it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `chevronPlacement` | `chevron-placement` | `'auto' \| 'start' \| 'end' \| 'none' \| undefined` | - | `HelixBaseAccordionItem` | Where the open indicator sits, or whether there is one. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `dense` | `dense` | `boolean` | `false` | - | Tightens the trigger for dense layouts. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focusTrigger()` | `HelixBaseAccordionItem` | Moves focus to this item's trigger. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-open` | `HelixOpenEvent` | Fired when the item opens or closes. |
| `helix-close` | `HelixCloseEvent` | Fired before the section closes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| `summary` | The always-visible trigger content. |
| *(default)* | The content revealed when open. |

#### Parts

| Part | Description |
| --- | --- |
| `container` | The outer wrapper. |
| `trigger` | The clickable summary row. |
| `chevron` | The open and close indicator. |
| `content` | The revealed region. |
| `content-inner` | Padding wrapper inside the animated region. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--accordion-item-padding` | Inset of the trigger and content. |

## Announcement

### Root — `helix-announcement`

A page-level message above the masthead, which can be dismissed.

Extends `HelixBaseAnnouncement`.

Full width and flat, with the severity carried by a tinted fill and a
hairline beneath rather than by a border on four sides: an announcement is a
band across the top of the page, not a box that happens to be wide.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `dismissible` | `dismissible` | `boolean` | `false` | `MixinDismissible` | Whether it offers a control to take it away. |
| `dismissLabel` | `dismiss-label` | `string` | `'Dismiss'` | `MixinDismissible` | Accessible name for that control. |
| `tone` | `tone` | `'danger' \| 'info' \| 'neutral' \| 'primary' \| 'success' \| 'surface' \| 'warning' \| undefined` | - | `HelixBaseAnnouncement` | Which colour the band wears. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `dismiss()` | `MixinDismissible` | Announces that it should go, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-dismiss` | `HelixDismissEvent` | Fired when the reader asks to close it. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The message. |
| `actions` | What to do about it, usually a link or a button. |
| `icon` | Replaces the glyph inside the dismiss control. |

#### Parts

| Part | Description |
| --- | --- |
| `content` | The message region. |
| `actions` | The trailing action region. |
| `dismiss` | The control that asks to close. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--announcement-inset` | Inline padding, matched to the page. |

## App Header

### Root — `helix-app-header`

Page-level banner holding brand, navigation, and actions.

Extends `HelixBaseAppHeader`.

Flat, opaque, and in the flow. Both of the interesting things a banner can do
are opt-in: `sticky` because following the reader is a decision about the
page rather than about the bar, and `appearance="material"` because a
backdrop filter makes the header a containing block for `position: fixed`
descendants, so an overlay rendered inside a material header is placed
against the header rather than the viewport.

The separating rule appears only once the page has scrolled, which keeps the
banner flat against a hero and lifts it off the content afterwards. There is
no shadow: the rule is the whole of it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'flat' \| 'material' \| 'transparent' \| undefined` | - | - | How much of what is behind the banner shows through it. |
| `navAlign` | `nav-align` | `'start' \| undefined` | - | `HelixBaseAppHeader` | Where the navigation sits in the bar. |
| `sticky` | `sticky` | `boolean` | `false` | - | Whether the banner sticks to the top of the viewport. |

#### Slots

| Slot | Description |
| --- | --- |
| `brand` | Wordmark or logo, at the inline start. |
| *(default)* | Primary navigation. |
| `actions` | Trailing actions, such as a call to action. |
| `start` | Leading content, usually a wordmark. |
| `end` | Trailing content. |

#### Parts

| Part | Description |
| --- | --- |
| `content` | The centered row inside the banner. |
| `row` | The centered row inside the banner. |
| `start` | The leading region. |
| `end` | The trailing region. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--app-header-background` | Fill behind the banner. |
| `--app-header-height` | Height of the banner. |
| `--app-header-inset` | Inline padding of the banner. |
| `--app-header-max-inline-size` | Width the content is centered in. |

## Avatar

### Root — `helix-avatar`

Represents a person or entity with an image or their initials.

Extends `HelixBaseAvatar`.

Initials scale with the avatar rather than being sized per size, because the
font size is set in `em` against the avatar's own dimension. One rule covers
every size, including one a consumer sets themselves through
`--avatar-size`.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `name` | `name` | `string` | `''` | `HelixBaseAvatar` | Name of the person or entity. Used for the label and the initials. |
| `shape` | `shape` | `'circle' \| 'square' \| undefined` | - | - | Whether the avatar is a circle or a rounded square. |
| `size` | `size` | `'sm' \| 'md' \| 'lg' \| undefined` | - | - | Edge length of the avatar. |
| `src` | `src` | `string` | `''` | `HelixBaseAvatar` | Image to show. Falls back to the slot, or to initials, if it fails. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `load` | `Event` | Relayed from the image once it has loaded. |
| `error` | `Event` | Relayed from the image when it fails. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | Replaces the image and initials entirely, for an icon. |

#### Parts

| Part | Description |
| --- | --- |
| `image` | The image, when one is loading or loaded. |
| `initials` | The initials shown when there is no usable image. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--avatar-background-color` | Fill behind the initials. |
| `--avatar-size` | Edge length of the avatar. |

### Group — `helix-avatar-group`

Overlapping avatars, with a count for the ones not shown.

Extends `HelixBaseAvatarGroup`.

They overlap by a step of space, which is enough to read as a stack without
the faces occluding each other. Each carries a ring in the page's own
background color, because a stack with no separation between its members
reads as one shape rather than several: the ring is what makes the edge of
each avatar visible against the one behind it.

Each avatar is drawn over the one before it, which falls out of document
order and needs no `z-index`. The familiar trick for putting the *first*
avatar on top is `row-reverse`, and it also reverses the row: the person
written first appears last. A facepile whose reading order is the reverse of
its markup is the worse trade of the two.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `avatars` | - | `HTMLElement[]` | - | `HelixBaseAvatarGroup` | The avatars, in light-DOM order. Empty on the server, which has no tree. |
| `label` | `label` | `string` | `''` | `HelixBaseAvatarGroup` | Accessible name for the set, such as "Reviewers". |
| `max` | `max` | `number` | `0` | `HelixBaseAvatarGroup` | How many avatars are shown before the rest become a count. |
| `overflow` | - | `number` | - | `HelixBaseAvatarGroup` | How many avatars are past the limit, and so not shown. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The avatars, in the order they should be read. |

#### Parts

| Part | Description |
| --- | --- |
| `overflow` | The count of avatars past `max`. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--avatar-group-overlap` | How far each avatar sits over the one before it. |
| `--avatar-group-ring-color` | The separation drawn between one avatar and the next. |

## Badge

### Root — `helix-badge`

Attaches a count or a presence mark to another element.

Extends `HelixBaseBadge`.

The indicator carries a ring in the page's own background color, so it stays
legible where it overlaps the thing it is pinned to. Without it a dark badge
on a dark icon reads as a bite taken out of the icon.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'danger' \| 'neutral' \| undefined` | - | - | How much attention the mark asks for. |
| `label` | `label` | `string` | `''` | `HelixBaseBadge` | Accessible name. Required for a dot, which has no text to read. |
| `max` | `max` | `number \| undefined` | - | `HelixBaseBadge` | Cap for a numeric value. Past it the indicator reads `{max}+`. |
| `value` | `value` | `string` | `''` | `HelixBaseBadge` | The count or short text to show. Absent shows a dot, zero shows nothing. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The element being decorated. |

#### Parts

| Part | Description |
| --- | --- |
| `indicator` | The count, or the dot when there is no value. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--badge-background-color` | Fill of the indicator. |
| `--badge-offset` | Pulls the mark in from the corner, along both axes. |
| `--badge-ring-color` | The ring separating it from what is behind. |

## Blockquote

### Root — `helix-blockquote`

A passage set off from the prose around it.

Extends `HelixBaseBlockquote`.

Set larger than body text on the display face, because a pulled quotation is
a change of voice and the type is what says so. No quotation marks are drawn:
the size and the space around it already set the passage apart, and marks on
top of that are the same thing said twice.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `cite` | `cite` | `string` | `''` | `HelixBaseBlockquote` | URL identifying where the passage came from. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The quoted passage. |
| `attribution` | Who said it, and where. |

#### Parts

| Part | Description |
| --- | --- |
| `blockquote` | The quotation. |
| `attribution` | The footer carrying the source. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--blockquote-size` | Size of the quoted passage. |

## Breadcrumbs

### Root — `helix-breadcrumbs`

Shows the path to the current page.

Extends `HelixBaseBreadcrumbs`.

A single wrapping line by default. The trail wraps rather than scrolling,
because a truncated path tells the reader less than a two-line one.

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The trail's items, in order from root to current page. |

#### Parts

| Part | Description |
| --- | --- |
| `list` | The ordered list. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--breadcrumbs-gap` | Space between items and separators. |

### Breadcrumb — `helix-breadcrumb`

One step in a breadcrumb trail.

Extends `HelixBaseBreadcrumb`.

The separator is hidden on the first item with `:host(:first-child)`, so no
item needs to know its own index and the parent needs no coordination.

The link carries `data-link="quiet"`, the recipe navigation uses everywhere
else, which is what owns its color. Under the pointer it reads as a subtle
button. That part is styled from in here: the base layer sets color and
text-decoration on an anchor and nothing else, so the outer tree wins those
and leaves box and background to `::slotted`.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `current` | `current` | `boolean` | `false` | `HelixBaseBreadcrumb` | Whether this item is the page the reader is on. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The step: a link, or the text of the current page. |
| `separator` | Replaces the chevron shown before this item. |

#### Parts

| Part | Description |
| --- | --- |
| `separator` | The separator preceding the item. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--breadcrumbs-separator-color` | Color of the chevron. |
| `--breadcrumb-hover-color` | Fill behind a step under the pointer. |

## Button

### Root — `helix-button`

Triggers an action, submits a form, or navigates.

Extends `HelixBaseButton`.

Four appearances, all drawn on one control so a link styled as a button and a
real button are indistinguishable to a reader. There are no sizes: a control
takes its height from the region it is in, through `data-density`, which is
the one size axis in the library and the reason a row of controls cannot come
out ragged. The focus
ring is declared here rather than inherited, because the base layer's
`:focus-visible` rule is a light-DOM rule and stops at the shadow boundary.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'primary' \| 'secondary' \| 'tertiary' \| 'danger' \| undefined` | - | - | How much visual weight the button carries. |
| `command` | `command` | `string` | `''` | `HelixBaseButton` | What to send when the button is activated, and what to send it to. |
| `commandFor` | `commandfor` | `string` | `''` | `HelixBaseButton` | The id of the element the command is sent to. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `fill` | `fill` | `'auto' \| 'full' \| 'standard' \| undefined` | - | - | How much of the space available to it the button takes. |
| `focusable` | - | `boolean` | `true` | `HelixBaseButton` | Whether the button holds its group's tab stop. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `HelixBaseButton` | Accessible name, for a button whose content is not text. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseButton` | Moves focus to the inner control, so the host is never the focus target. |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | `HelixBaseButton` | What activating the button does to its form. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The button's label. |
| `start` | Content before the label, usually an icon. |
| `end` | Content after the label. |

#### Parts

| Part | Description |
| --- | --- |
| `button` | The inner control. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--button-background-color` | Fill behind the button. |
| `--button-foreground-color` | Label and icon color. |
| `--button-inline-size` | Width taken by `fill="standard"`. |
| `--button-radii` | Corner radius of the control. |

## Button Group

### Root — `helix-button-group`

Groups related buttons into one control.

Extends `HelixBaseButtonGroup`.

The buttons are joined into a single shape: the outer corners keep their
radius, the inner ones lose it, and adjacent borders collapse into one line.

That joining is in the base layer, paired with `data-button` the way the
button's own box is, because the corner belongs to the control inside each
button's shadow root and a rule in here cannot reach it. The same rule
therefore serves a consumer's own anchor styled as a button.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'joined' \| 'spaced' \| undefined` | - | - | Whether the buttons are one bar or a spaced row. |
| `label` | `label` | `string` | `''` | `HelixBaseButtonGroup` | Accessible name for the group. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The buttons in the group. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--button-group-gap` | Space between the buttons, when `spaced`. |

## Calendar

### Root — `helix-calendar`

Shows a month, and takes a date from it.

Extends `HelixBaseCalendar`.

Six week rows always, so the grid keeps one height and a month change does
not move whatever sits beneath it.

The column track is wider than the day, and the day is centered in it. The
difference is the space between days, which belongs to the track rather than
to a `gap`, so a range can paint across the whole track and stay continuous.

Days from the neighbouring months stay in place and stay selectable, marked
quieter rather than hidden, so the first and last weeks are whole and the
grid reads as a continuous run of dates.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultMonth` | `default-month` | `string` | `''` | `HelixBaseCalendar` | Month to open on, where nothing declared one. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `disableDates` | `disable-dates` | `string` | `''` | `HelixBaseCalendar` | Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. |
| `disableDays` | `disable-days` | `string` | `''` | `HelixBaseCalendar` | Days of the week that cannot be chosen, comma separated, `0` to `6`. |
| `firstDayOfWeek` | `first-day-of-week` | `number` | `0` | `HelixBaseCalendar` | First column of the week, `0` for Sunday through `6` for Saturday. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `invalid` | `invalid` | `boolean` | `false` | `HelixBaseCalendar` | Whether the current selection fails validation. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `'Calendar'` | `HelixBaseCalendar` | Accessible name for the grid. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `locale` | `locale` | `string` | `''` | `HelixBaseCalendar` | Locale for month and day names. Absent uses the runtime's own. |
| `max` | `max` | `string` | `''` | `HelixBaseCalendar` | Latest selectable date, as `YYYY-MM-DD`. |
| `min` | `min` | `string` | `''` | `HelixBaseCalendar` | Earliest selectable date, as `YYYY-MM-DD`. |
| `mode` | `mode` | `'range' \| 'multiple' \| undefined` | - | `HelixBaseCalendar` | How many dates can be held at once. |
| `month` | `month` | `string` | - | `HelixBaseCalendar` | The month on show, as `YYYY-MM`. Follows `value`, then the current month. |
| `months` | `months` | `number` | `1` | `HelixBaseCalendar` | How many months to show, side by side. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `nextLabel` | `next-label` | `string` | `'Next month'` | `HelixBaseCalendar` | Accessible name for the control that pages forward. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `previousLabel` | `previous-label` | `string` | `'Previous month'` | `HelixBaseCalendar` | Accessible name for the control that pages back. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired before the dates change, and cancelable. |
| `helix-navigate` | `HelixNavigateEvent` | Fired before the month on show changes, and cancelable. |

#### Parts

| Part | Description |
| --- | --- |
| `months` | The run of months. |
| `month` | One month, its header and its grid. |
| `header` | The month name and its controls. |
| `previous` | The control that moves to the previous month. |
| `next` | The control that moves to the next month. |
| `heading` | The month and year being shown. |
| `grid` | The grid of days. |
| `weekday` | A column header naming a day of the week. |
| `week` | One row of days. |
| `cell` | One column of a row, which is what a range paints. |
| `day` | The shape inside a cell, which is what a single date paints. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--calendar-day-size` | Width and height of a day. |
| `--calendar-track-size` | Width of a column, which is what sets the space between days. |
| `--calendar-row-size` | Height of a week row. |
| `--calendar-selected-color` | Fill behind a selected day. |
| `--calendar-range-color` | Band behind the days in a range. |

## Callout

### Root — `helix-callout`

Sets a passage apart as information, a warning, or an error.

Extends `HelixBaseCallout`.

Tinted from the severity's status color with `color-mix`, and marked with a
bar on the inline start so the severity survives being read in greyscale or
by anyone who does not distinguish the hues.

There is no `appearance` here. `severity` carries the meaning and lives on
the headless tier; this tier only decides what that meaning looks like.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `severity` | `severity` | `'info' \| 'success' \| 'warning' \| 'danger' \| undefined` | - | `HelixBaseCallout` | What kind of attention the passage needs. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The callout's content. |
| `icon` | Replaces the icon chosen by `severity`. |
| `title` | A heading above the content. |

#### Parts

| Part | Description |
| --- | --- |
| `icon` | The icon region. |
| `content` | The content region. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--callout-background-color` | Fill behind the callout. |
| `--callout-radii` | Corner radius of the callout. |

## Card

### Root — `helix-card`

Groups related content and actions into a single surface.

Extends `HelixBaseCard`.

Regions are slots: `media`, `header`, the default slot for content, and
`footer`. An omitted region takes no space, so a card with only content needs
no wrapper markup at all.

`media` runs edge to edge and clips to the card's corners, so an image needs
no inset correction. Set `orientation="horizontal"` to move it alongside the
header, content, and footer stack rather than above it.

Regions are bare slots with no wrapper element, so an omitted one occupies no
space without the card having to detect that it is missing. Style slotted
content directly rather than reaching for a part: a header is whatever
element you slotted, not a wrapper around it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'outlined' \| 'elevated' \| 'plain' \| undefined` | - | - | How the card separates itself from the page. |
| `dense` | `dense` | `boolean` | `false` | - | Tightens the inset for dense layouts. |
| `orientation` | `orientation` | `'vertical' \| 'horizontal' \| undefined` | - | - | Whether media sits above the content stack or beside it. |

#### Slots

| Slot | Description |
| --- | --- |
| `media` | Image or video that runs edge to edge, outside the inset. |
| `header` | Title and any actions for the whole card. |
| *(default)* | The card's main content. |
| `footer` | Actions that conclude the card. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--card-background-color` | Surface behind the card. |
| `--card-border-color` | Border color of the surface. |
| `--card-media-size` | Width of the media column when horizontal. |
| `--card-padding` | Inset applied to each region. |
| `--card-radii` | Corner radius of the surface. |
| `--card-shadow` | Shadow under the surface. What `elevated` sets, and what a `data-card` link raises on hover. |

## Carousel

### Root — `helix-carousel`

Shows one slide of several, with controls to move between them.

Extends `HelixBaseCarousel`.

The track scroll-snaps, so a drag and a trackpad swipe move it with the
browser's own momentum and the controls only have to scroll.

Slides take the full track by default. `per-view` fits more than one across,
which is what a run of cards wants rather than a run of full-width panels.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `autoplay` | `autoplay` | `boolean` | `false` | `HelixBaseCarousel` | Whether the carousel advances on its own. |
| `controlsAlign` | `controls-align` | `'center' \| 'end' \| 'start' \| undefined` | - | - | Where along that side the arrows sit. See `indicatorAlign`. |
| `controlsPlacement` | `controls-placement` | `'block-end' \| 'block-start' \| 'inline-end' \| 'inline-start' \| 'overlay' \| undefined` | - | - | Which side of the slides the arrows sit on. |
| `defaultIndex` | `default-index` | `number` | `0` | `HelixBaseCarousel` | Slide to start on, where nothing declared one. |
| `index` | `index` | `number` | - | `HelixBaseCarousel` | The slide in view, counted from zero. |
| `indicatorAlign` | `indicator-align` | `'center' \| 'end' \| 'start' \| undefined` | - | - | Where along that side the dots sit. |
| `indicatorPlacement` | `indicator-placement` | `'block-end' \| 'block-start' \| 'inline-end' \| 'inline-start' \| undefined` | - | - | Which side of the slides the dots sit on. |
| `interval` | `interval` | `number` | `5000` | `HelixBaseCarousel` | How long each slide is held, in milliseconds. |
| `label` | `label` | `string` | `'Carousel'` | `HelixBaseCarousel` | Accessible name for the carousel. |
| `loop` | `loop` | `boolean` | `false` | `HelixBaseCarousel` | Whether moving past either end wraps to the other. |
| `orientation` | `orientation` | `'horizontal' \| 'vertical' \| undefined` | - | `HelixBaseCarousel` | Which way the track runs. |
| `perView` | `per-view` | `number \| undefined` | - | - | How many slides are shown across the track at once. Absent shows one. |
| `slides` | - | `HTMLElement[]` | - | `HelixBaseCarousel` | The slides, in light-DOM order. Empty on the server, which has no tree. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `goTo()` | `HelixBaseCarousel` | Moves to a slide, wrapping only where `loop` says to. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the slide in view changes, with its index. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The slides. |

#### Parts

| Part | Description |
| --- | --- |
| `controls` | The row of controls. |
| `rotation` | The control that stops and starts rotation. |
| `previous` | The control that moves to the previous slide. |
| `next` | The control that moves to the next slide. |
| `track` | The scroller the slides sit in. |
| `indicators` | The row of controls saying where the reader is. |
| `indicator` | One of them, and a way to reach that slide. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--carousel-block-size` | Height of a vertical track. |
| `--carousel-gap` | Space between slides. |

## Checkbox

### Root — `helix-checkbox`

A box that is ticked, or not, or neither.

Extends `HelixBaseCheckbox`.

The box is the native input, restyled rather than replaced, so the tick and
the indeterminate dash are the browser's own and the control stays a control
for anything reading the page.

The label sits beside it and the whole thing is the click target, which is
what a native `<label>` wrapping a checkbox gives and what a reader expects.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'plain' \| 'card' \| undefined` | - | - | How the choice presents itself. |
| `checked` | `checked` | `boolean` | - | `MixinControllerChecked` | Whether the control is checked. |
| `defaultChecked` | `default-checked` | `boolean` | `false` | `MixinControllerChecked` | Initial checked state for uncontrolled use, where nothing declared one. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `indeterminate` | `indeterminate` | `boolean` | `false` | `HelixBaseCheckbox` | Whether the box shows as neither checked nor unchecked. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onCheckedChange` | - | `((checked: boolean) => void) \| undefined` | `undefined` | `MixinControllerChecked` | The consumer's callback, invoked after the state is applied. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseCheckbox` | Focus is delegated to the input, so the host is never the focus target. |
| `value` | `value` | `string` | `'on'` | `HelixBaseCheckbox` | Value submitted when the box is checked. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `HelixBaseCheckbox` | Returns the box to the state its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerChecked` | Restores the control when the browser brings a form back. |
| `requestChecked()` | `MixinControllerChecked` | Requests a checked change, and reports whether it was applied. |
| `resetChecked()` | `MixinControllerChecked` | Drops the uncontrolled state, so the control reads `defaultChecked` again. |
| `toggleChecked()` | `MixinControllerChecked` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired before the state changes, and cancelable. |
| `change` | `Event` | Relayed from the input once the state has changed. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The label. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The row the box and its label share, and the surface the card appearance draws. |
| `box` | The frame the input is painted as, and the mark sits over. |
| `control` | The input. |
| `label` | The label beside it. |
| `mark` | The tick, or the dash when the box is indeterminate. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--checkbox-size` | Width and height of the box. |
| `--checkbox-checked-color` | Fill of a ticked box. |
| `--checkbox-background-color` | Fill of an unticked box. |
| `--checkbox-mark-color` | Ink the tick is drawn in. |
| `--checkbox-card-padding` | Inset of the card appearance. |
| `--checkbox-card-background-color` | Fill behind a card-shaped choice. |
| `--checkbox-card-border-color` | Edge around one. |

## Checkbox Group

### Root — `helix-checkbox-group`

Groups related checkboxes, and reports them as one set.

Extends `HelixBaseCheckboxGroup`.

A column by default, which is what a list of choices wants: the eye scans one
line per answer rather than hunting along a row.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `boxes` | - | `HelixBaseCheckbox[]` | - | `HelixBaseCheckboxGroup` | The boxes, in light-DOM order. Client only: the server has no tree. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseCheckboxGroup` | Whether the whole set is out of play. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `name` | `name` | `string` | `''` | `HelixBaseCheckboxGroup` | Name submitted with the form, given to every box that has none. |
| `orientation` | `orientation` | `'horizontal' \| undefined` | - | - | Which way the boxes run. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `value` | `value` | `string` | `''` | `HelixBaseCheckboxGroup` | The checked values, comma separated. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when any box changes, with the whole set. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The checkboxes. |
| `label` | Richer than a string, where the label is more than one. |
| `hint` | Richer than a string. |

#### Parts

| Part | Description |
| --- | --- |
| `label` | The group's name, over the set. |
| `items` | The list itself, which is what `orientation` lays out. |
| `hint` | Help under the set. |
| `feedback` | What is wrong with it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--checkbox-group-gap` | Space between the boxes. |

## Color

### Root — `helix-color`

Picks a colour, from a square and two ramps.

Extends `HelixBaseColor`.

**The square is painted in three layers, not composited from elements**: the
hue underneath, white sliding in from the left to take the saturation out,
black rising from the bottom to take the brightness out. One element, one
declaration, and it repaints as the hue moves because the hue is a custom
property the tier below writes.

**The two range inputs over it are invisible and still there.** Not
`display: none` and not `visibility: hidden`, either of which would take them
out of the tab order and out of the accessibility tree, which is the entire
reason a square built this way is reachable at all. They carry
`pointer-events: none` so the square answers the pointer itself, and the focus
ring is drawn on the square rather than on them, so it lands where the reader
is looking.

**Every chip sits on a checkerboard.** A colour with alpha painted on a solid
background is just a different colour, and the one thing a preview owes a
reader is the difference between "pale blue" and "blue, half transparent".

No padding and no surface of its own. Flat on a page it takes the space it is
given, and in Input Color's panel the panel supplies both: a picker that
brought its own card would be a card inside a card there.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `alpha` | `alpha` | `boolean` | `false` | `HelixBaseColor` | Whether the colour carries an alpha channel. |
| `color` | - | `Color` | - | `HelixBaseColor` | Where the picker stands: what was moved, or what the value says, or the start. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `format` | `format` | `ColorFormat` | `'hex'` | `HelixBaseColor` | The syntax the value is written in: `hex`, `rgb` or `hsl`. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `noEyedropper` | `no-eyedropper` | `boolean` | `false` | `HelixBaseColor` | Whether the eyedropper is offered where the browser has one. |
| `noFormat` | `no-format` | `boolean` | `false` | `HelixBaseColor` | Whether the reader may change the format. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `swatches` | `swatches` | `string` | `''` | `HelixBaseColor` | Colours offered under the picker, as a comma-separated list. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseColor` | Puts the keyboard on the square, which is the control a reader wants. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the colour changes. |

#### Parts

| Part | Description |
| --- | --- |
| `grid` | The saturation and brightness square. |
| `grid-handle` | The mark showing where in the square the colour sits. |
| `grid-saturation` | The range input for the square's horizontal axis. |
| `grid-brightness` | The range input for its vertical axis. |
| `controls` | The row under the square. |
| `sample` | The chip of the current colour, in that row. |
| `channels` | The ramps beside it. |
| `channel` | One ramp. |
| `actions` | The group holding the eyedropper and the syntax toggle. |
| `eyedropper` | The control that samples a colour from the screen. |
| `footer` | The row holding the syntax toggle and the presets. |
| `format` | The control that changes the syntax the value is written in. |
| `swatches` | The row of presets. |
| `swatch` | One preset. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--color-inset` | Inset of the rows under the square, and the bottom. |
| `--color-grid-ratio` | Aspect ratio of the square. |
| `--color-grid-radii` | Corner radius of the square. |

## Dialog

### Root — `helix-dialog`

A modal window, on the platform's own dialog.

Extends `HelixBaseDialog`.

The panel is `surface-overlay` with a shadow, because that is what it is: a
thing over the page rather than on it. The scrim is drawn on `::backdrop`,
which is the platform's own element for it and sits in the top layer with the
dialog rather than being a div somebody positioned.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `align` | `align` | `'center' \| 'start' \| undefined` | - | - | Whether the panel's contents run from the start or centre on it. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `label` | `label` | `string` | `''` | `HelixBaseDialog` | Accessible name for the dialog. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `persistent` | `persistent` | `boolean` | `false` | `HelixBaseDialog` | Whether Escape can close it. |
| `size` | `size` | `'sm' \| 'md' \| 'lg' \| 'full' \| undefined` | - | - | How wide the panel is allowed to be. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `close()` | `HelixBaseDialog` | Asks to close, which a consumer may refuse. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `show()` | `HelixBaseDialog` | Moves focus into the dialog and makes the rest of the page inert. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-open` | `HelixOpenEvent` | Fired before it opens, and cancelable. |
| `helix-close` | `HelixCloseEvent` | Fired before it closes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The dialog's content. |
| `icon` | A single mark above the title, for a dialog that warns. |
| `header` | The title, and anything beside it. |
| `footer` | The actions. |

#### Parts

| Part | Description |
| --- | --- |
| `dialog` | The native dialog element. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--dialog-icon-size` | How big the mark above the title is. |
| `--dialog-inline-size` | Width of the panel. |
| `--dialog-inset` | Padding inside the panel. |

## Divider

### Root — `helix-divider`

Separates content into groups with a rule.

Extends `HelixBaseDivider`.

A one-pixel rule in the border color, running the full inline size by
default. A vertical divider stretches to its flex parent instead of setting
its own height, so it matches whatever it sits beside without being told how
tall that is.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `announced` | `announced` | `boolean` | `false` | `HelixBaseDivider` | Whether the rule is announced as a separator. |
| `orientation` | `orientation` | `'horizontal' \| 'vertical' \| undefined` | - | `HelixBaseDivider` | Which way the rule runs. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | Content set into the rule, such as the word between two sections. |

#### Parts

| Part | Description |
| --- | --- |
| `line` | The rule itself. |
| `content` | What is set into it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--divider-color` | Color of the rule. |
| `--divider-thickness` | Thickness of the rule. |
| `--divider-color` | Colour of the rule. |
| `--divider-inset` | Space taken off both ends of it. |
| `--divider-inset-end` | Off the far end only. |
| `--divider-inset-start` | Off the near end only. |
| `--divider-thickness` | How heavy the rule is. |

## Drawer

### Root — `helix-drawer`

A panel that slides in from an edge.

Extends `HelixBaseDrawer`.

The panel translates and the scrim fades, both on transform and opacity only,
which is the one place motion is allowed to carry the work: the surface at
rest is flat and the movement is what says something happened.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `label` | `label` | `string` | `''` | `HelixBaseDrawer` | Accessible name for the panel. |
| `modal` | `modal` | `boolean` | `true` | `HelixBaseDrawer` | Whether the drawer blocks the page behind it. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placement` | `placement` | `'start' \| 'end' \| 'top' \| 'bottom' \| undefined` | - | `HelixBaseDrawer` | Which edge the drawer comes from. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-open` | `HelixOpenEvent` | Fired when the drawer opens or closes. |
| `helix-close` | `HelixCloseEvent` | Fired before the panel closes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The drawer's content. |
| `header` | Content pinned above the scrolling area. |

#### Parts

| Part | Description |
| --- | --- |
| `panel` | The sliding panel. |
| `header` | The header region. |
| `content` | The scrolling content region. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--drawer-radii` | Corner radius on the edges that face the page. |
| `--drawer-size` | Width or height of the panel. |
| `--drawer-inset` | Padding inside the panel. |
| `--drawer-inset-block-start` | Padding above the content, which clears the close control. |

## Drilldown

### Root — `helix-drilldown`

A stack of pages, one showing at a time, with a way back.

Extends `HelixBaseDrilldown`.

**The pages slide, and the direction is the point.** Both moves replace one
page with another, so with no motion a reader cannot tell whether they went
deeper or came back: the panel simply holds different words. Sliding in the
direction of travel says which happened, and it is most of the reason this is
a component rather than a menu with its trigger removed.

An animation rather than a transition, because there is nothing to transition
from: the page arriving was not in the DOM a frame ago. Under
`prefers-reduced-motion` it becomes the instant swap `Menu` does.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `backLabel` | `back-label` | `string` | `'Back'` | `HelixBaseDrilldown` | What the control returning from a page reads. |
| `label` | `label` | `string` | `'Navigation'` | `HelixBaseDrilldown` | Accessible name for the region. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `back()` | `HelixBaseDrilldown` | Returns one page, and reports whether there was one to return to. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when a row with no page is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The rows of the top page. |

#### Parts

| Part | Description |
| --- | --- |
| `header` | The bar above a page, holding the way back and its name. |
| `back` | The control that returns one page. |
| `title` | The name of the page showing. |
| `page` | The region the rows are in. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--drilldown-background` | Fill behind the pages. |
| `--drilldown-inline-size` | Width of the region. |

### Item — `helix-drilldown-item`

One row of a drill-down, which may hold a page of its own.

Extends `HelixBaseDrilldownItem`.

A row is a full-width band rather than an inset pill, for the reason the
select's options are: it reaches both edges of the panel, so a highlight
lines up with the edge the eye is already following down the list.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseDrilldownItem` | Whether the row can be reached at all. |
| `focusable` | - | `boolean` | `false` | `HelixBaseDrilldownItem` | Whether this row holds the region's tab stop. Written by the stack. |
| `isDrilldownItem` | - | `boolean` | `true` | `HelixBaseDrilldownItem` | Marks this as a row a stack should count. Cheaper than an instanceof. |
| `onPage` | - | `boolean` | `true` | `HelixBaseDrilldownItem` | Whether the page showing is the one this row is on. Written by the stack. |
| `showingPage` | - | `boolean` | `false` | `HelixBaseDrilldownItem` | Whether this row's own page is the one showing. Written by the stack. |
| `value` | `value` | `string` | `''` | `HelixBaseDrilldownItem` | Identifies the row to whatever is listening. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focusItem()` | `HelixBaseDrilldownItem` | Moves focus onto the row itself. |
| `select()` | `HelixBaseDrilldownItem` | Announces that this row was chosen. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the row is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The words naming this row. |
| `page` | The rows of the page this one opens. |
| `start` | Before the words, usually an icon. |
| `end` | After the words, usually a mark or a count. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The row itself. |
| `label` | The words. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--drilldown-item-hover-color` | Fill when a row is under the pointer. |

## Empty

### Root — `helix-empty`

Says that a region has nothing in it, and what to do about it.

Extends `HelixBaseEmpty`.

Centered and given room, because an empty view is the only thing on screen
and crowding it against the top edge makes the region look broken rather than
empty.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'outlined' \| undefined` | - | - | Whether the state sits on a surface of its own. |
| `noAnnounce` | `no-announce` | `boolean` | `false` | `HelixBaseEmpty` | Whether the state is announced when it appears. |

#### Slots

| Slot | Description |
| --- | --- |
| `icon` | A mark above the heading. |
| `heading` | What is missing. |
| *(default)* | Why, and what to do about it. |
| `actions` | The way out. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--empty-inset` | Space around the whole block. |

## Flex

### Root — `helix-flex`

Lays children out in a row or a column.

Extends `HelixElement`.

The host is the flex container itself and the only child is a slot, so the
element adds no box of its own: `<helix-flex>` costs exactly the `<div>` it
replaces.

There is no separate Stack. A stack is this with `direction="column"`, and a
second element whose whole definition is one default of the first is a name
to learn rather than a capability to gain.

Gap takes a space token name rather than a length, so spacing stays on the
scale. A layout that can say `gap="13px"` is one that will.

Presentation only, so there is no headless tier: the split exists to keep
behavior separate from styling, and this is entirely styling.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `align` | `align` | `'start' \| 'center' \| 'end' \| 'stretch' \| 'baseline' \| undefined` | - | - | Alignment across the direction. |
| `direction` | `direction` | `'row' \| 'column' \| undefined` | - | - | Whether items run across or down. |
| `gap` | `gap` | `'none' \| '2xs' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| undefined` | - | - | Space between items, named on the space scale. |
| `inline` | `inline` | `boolean` | `false` | - | Flows with surrounding text instead of taking the full width. |
| `justify` | `justify` | `'start' \| 'center' \| 'end' \| 'between' \| 'around' \| undefined` | - | - | Distribution along the direction. |
| `wrap` | `wrap` | `boolean` | `false` | - | Whether items wrap onto more lines. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The items to lay out. |

## Grid

### Root — `helix-grid`

Lays children out on a grid.

Extends `HelixElement`.

Two ways to declare columns, and only two. `columns` is a fixed count;
`min` fills as many equal columns as fit above that width, which is a
responsive layout with no breakpoint to maintain. Setting `min` wins, because
a fixed count that also reflows is two intentions in one element.

Presentation only, so there is no headless tier.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `align` | `align` | `'start' \| 'center' \| 'end' \| 'stretch' \| undefined` | - | - | Alignment of each cell within its row. |
| `columns` | `columns` | `number \| undefined` | - | - | Fixed number of equal columns. |
| `gap` | `gap` | `'none' \| '2xs' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| undefined` | - | - | Space between cells, named on the space scale. |
| `min` | `min` | `string` | `''` | - | Minimum column width, filling as many as fit. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The items to lay out. |

## Icon

### Root — `helix-icon`

Renders a named icon from the Helix set.

Extends `HelixBaseIcon`.

Draws in `currentColor` and sizes from `--icon-size`, so an icon inherits the
color of the text it sits in and a container can resize it without reaching
for a prop. Inside a button that hook is set in `em`, which keeps the icon in
proportion as the button's own size changes.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `''` | `HelixBaseIcon` | Accessible name, for an icon that is not decorative. |
| `name` | `name` | `string` | `''` | `HelixBaseIcon` | Name of the icon in the Helix set. |

#### Parts

| Part | Description |
| --- | --- |
| `svg` | The rendered SVG. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--icon-size` | Edge length of the icon's box. |

## Icon Button

### Root — `helix-icon-button`

A square button whose content is an icon.

Extends `HelixBaseIconButton`.

Top-level rather than `Button.Icon`, because a namespace means composition:
`Card.Header` is part of a card, and an icon-only button is not part of a
button. It is a button with different content and a different shape, which
makes it its own component.

`label` is not optional in practice. An icon-only control with no accessible
name is announced as "button" and nothing else, which is the single most
common way a toolbar becomes unusable without sight.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'primary' \| 'secondary' \| 'tertiary' \| 'danger' \| undefined` | - | - | How much visual weight the button carries. |
| `command` | `command` | `string` | `''` | `HelixBaseButton` | What to send when the button is activated, and what to send it to. |
| `commandFor` | `commandfor` | `string` | `''` | `HelixBaseButton` | The id of the element the command is sent to. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `focusable` | - | `boolean` | `true` | `HelixBaseButton` | Whether the button holds its group's tab stop. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `HelixBaseButton` | Accessible name, for a button whose content is not text. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseButton` | Moves focus to the inner control, so the host is never the focus target. |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | `HelixBaseButton` | What activating the button does to its form. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The icon. |
| `start` | Content before the label, usually an icon. |
| `end` | Content after the label. |

#### Parts

| Part | Description |
| --- | --- |
| `button` | The inner button or anchor. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--icon-button-size` | Edge length of the control. |

## Input

### Root — `helix-input`

A single line of text a reader types into.

Extends `HelixBaseInput`.

The frame is the field rather than the input, so anything slotted at either
end sits inside the same box as the text and the focus ring is drawn once,
around the whole control, instead of around a smaller box within it.

The input itself is the native one, stripped rather than replaced, so the
caret, the selection, the autofill, and the keyboard a phone chooses are all
the platform's.

Height comes from the region, like every other control: `data-density` on
whatever holds it, not a `size` here. Invalid styling waits for
`:user-invalid`, because a field is not wrong before anyone has filled it in.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `maxLength` | `maxlength` | `number \| undefined` | - | `HelixBaseInput` | Most characters the value may have. |
| `minLength` | `minlength` | `number \| undefined` | - | `HelixBaseInput` | Fewest characters the value may have. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `pattern` | `pattern` | `string` | `''` | `HelixBaseInput` | A regular expression the value has to match, as the platform reads it. |
| `placeholder` | `placeholder` | `string` | `''` | `HelixBaseInput` | Shown while the field is empty. Not a label: it goes when typing starts. |
| `readOnly` | `read-only` | `boolean` | `false` | `HelixBaseInput` | Whether the field refuses input while still submitting its value. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseInput` | Focus is delegated to the input, so the host is never the focus target. |
| `type` | `type` | `InputType` | `'text'` | `HelixBaseInput` | What the field accepts, which decides the keyboard and the validation. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseInput` | Puts the caret in the field, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `select()` | `HelixBaseInput` | Selects everything in the field. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired as the text changes, and cancelable. |
| `change` | `Event` | Relayed from the input once the reader has finished. |

#### Slots

| Slot | Description |
| --- | --- |
| `start` | Before the text, for an icon or a prefix. |
| `end` | After the text, for an icon, a unit, or a clear button. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box holding everything. |
| `control` | The input itself. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--input-size` | Height of the field. |
| `--input-background-color` | Fill behind the text. |

## Input Color

### Root — `helix-input-color`

A colour, typed in any syntax or picked from a panel.

Extends `HelixBaseInputColor`.

The frame is the field rather than the input, so the trigger sits inside the
same box as the text and the focus ring is drawn once around the whole
control.

**The trigger fills the trailing end rather than sitting in it as an icon.** A
colour field has one thing to show and it is a colour, so the swatch takes the
height of the control and reads as a block of it. It is the one field here
whose trailing affordance is the value itself: Input Date's calendar mark
stands for an action, and an action stretched to field height is a large icon
and nothing more.

**The panel has no padding, and clips instead.** The square runs to its edge
and takes the panel's rounded corners from being clipped by it, rather than
sitting inset with a band of overlay showing on all four sides. The picker
pads its own lower rows.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `alpha` | `alpha` | `boolean` | `false` | `HelixBaseInputColor` | Whether the colour carries an alpha channel. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `format` | `format` | `ColorFormat` | `'hex'` | `HelixBaseInputColor` | The syntax the value is written in: `hex`, `rgb` or `hsl`. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `noFormat` | `no-format` | `boolean` | `false` | `HelixBaseInputColor` | Whether the reader may change the format from the panel. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placeholder` | `placeholder` | `string` | `'#000000'` | `HelixBaseInputColor` | What the field says before a colour is in it. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `swatches` | `swatches` | `string` | `''` | `HelixBaseInputColor` | Colours offered under the picker, as a comma-separated list. |
| `triggerLabel` | `trigger-label` | `string` | `'Choose a colour'` | `HelixBaseInputColor` | Accessible name for the control that opens the panel. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseInputColor` | Puts the caret in the field, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the colour changes. |
| `helix-open` | `HelixOpenEvent` | Fired when the panel opens. |
| `helix-close` | `HelixCloseEvent` | Fired when it closes. |

#### Slots

| Slot | Description |
| --- | --- |
| `trigger` | The mark on the field saying a panel opens. |
| `hint` | Help under the field. |
| `feedback` | What is wrong with it. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box holding the text and the trigger. |
| `control` | The text input carrying the value. |
| `trigger` | The control that opens the panel. |
| `preview` | The chip showing the colour, inside the trigger. |
| `surface` | The floating panel. |
| `picker` | The colour picker inside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--input-color-background-color` | Fill behind the field. |
| `--input-color-panel-size` | Width of the panel, and so of the square. |

## Input Date

### Root — `helix-input-date`

A date, typed or picked from a calendar.

Extends `HelixBaseInputDate`.

The frame is the field rather than the input, so the trigger sits inside the
same box as the text and the focus ring is drawn once around the whole
control. The trigger is a mark within that box rather than a button beside it:
a second frame inside the first is two controls where a reader sees one.

The calendar is the real `helix-calendar`, in a panel with no border of its
own. A surface over the page is told apart by its shadow and by what it
covers, and a line around it as well reads as a box drawn around something
already separate.

Height comes from the region, like every other control: `data-density` on
whatever holds it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `disableDates` | `disable-dates` | `string` | `''` | `HelixBaseInputDate` | Dates that cannot be chosen, as a comma-separated `YYYY-MM-DD` list. |
| `disableDays` | `disable-days` | `string` | `''` | `HelixBaseInputDate` | Days of the week that cannot be chosen, `0` for Sunday through `6`. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `firstDayOfWeek` | `first-day-of-week` | `number` | `0` | `HelixBaseInputDate` | First column of the week in the calendar, `0` for Sunday through `6`. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `locale` | `locale` | `string` | `''` | `HelixBaseInputDate` | Language tag the calendar names its months and days in. |
| `max` | `max` | `string` | `''` | `HelixBaseInputDate` | Latest date that can be chosen, as `YYYY-MM-DD`. |
| `min` | `min` | `string` | `''` | `HelixBaseInputDate` | Earliest date that can be chosen, as `YYYY-MM-DD`. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placeholder` | `placeholder` | `string` | `'YYYY-MM-DD'` | `HelixBaseInputDate` | What the field says before a date is in it. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `triggerLabel` | `trigger-label` | `string` | `'Choose a date'` | `HelixBaseInputDate` | Accessible name for the control that opens the calendar. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseInputDate` | Puts the caret in the field, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the date changes. |
| `helix-open` | `HelixOpenEvent` | Fired when the calendar opens. |
| `helix-close` | `HelixCloseEvent` | Fired when it closes. |

#### Slots

| Slot | Description |
| --- | --- |
| `trigger` | The mark on the field saying a calendar opens. |
| `hint` | Help under the field. |
| `feedback` | What is wrong with it. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box holding the text and the trigger. |
| `control` | The text input. |
| `trigger` | The control that opens the calendar. |
| `surface` | The floating panel. |
| `calendar` | The calendar inside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--input-date-background-color` | Fill behind the field. |

## Input File

### Root — `helix-input-file`

A control for choosing files, by pointer or by dropping them on it.

Extends `HelixBaseInputFile`.

The field is a box rather than a line, because nothing is typed into it: its
height is not a line of text, and what a reader aims at is the whole area. The
border is dashed for the same reason a drop target usually is, which is the
only affordance one has before anything is being dragged.

The native input is kept and laid over the field at zero opacity rather than
hidden, so a click anywhere on the box lands on the input itself and opens the
picker. Hiding it with `display: none` would take it out of the tab order and
out of the form, and a script clicking a hidden input is the same thing with
more moving parts.

The focus ring is drawn on the field, because the control it belongs to is
invisible.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `accept` | `accept` | `string` | `''` | `HelixBaseInputFile` | Which files the picker offers, as a native `accept` list. |
| `capture` | `capture` | `'environment' \| 'user' \| undefined` | - | `HelixBaseInputFile` | Which camera or microphone a mobile picker should offer, if any. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `files` | - | `File[]` | - | `HelixBaseInputFile` | The files chosen, which is the element's own and never assigned. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `multiple` | `multiple` | `boolean` | `false` | `HelixBaseInputFile` | Whether more than one file can be chosen. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `removeLabel` | `remove-label` | `string` | `'Remove'` | `HelixBaseInputFile` | What the control removing one file is called, per file. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `triggerLabel` | `trigger-label` | `string` | `'Choose files'` | `HelixBaseInputFile` | What the trigger reads, where nothing is slotted into it. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `clear()` | `HelixBaseInputFile` | Takes every file back out. |
| `focus()` | `HelixBaseInputFile` | Puts focus on the input, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `HelixBaseInputFile` | Empties it, which is what a form reset means for a file input. |
| `removeAt()` | `HelixBaseInputFile` | Drops one file, by index. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the chosen files change, with their names. |

#### Slots

| Slot | Description |
| --- | --- |
| `trigger` | What the reader presses to open the picker. |
| `hint` | Help under the field. |
| `feedback` | What is wrong with it. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box that is pressed and dropped on. |
| `control` | The file input itself, which carries the label and validity. |
| `trigger` | The label that opens the picker. |
| `list` | The chosen files. |
| `file` | One chosen file. |
| `name` | Its name. |
| `remove` | The control that takes it back out. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--input-file-background-color` | Fill behind the field. |
| `--input-file-inset` | Padding inside the field. |

## Input Number

### Root — `helix-input-number`

A number a reader types or steps to.

Extends `HelixBaseInputNumber`.

The frame an `Input` wears, because in a form this stands in a row with them.
The difference is inside it: a button at each end of the box rather than
beside it, so the whole reads as one field rather than a field with two
controls after it.

The number is centred and set in tabular figures, which is the one place this
differs from every other field in the library. Digits are what changes under a
repeated press, and proportional ones make the number shuffle while it counts.

The steppers are out of the tab order. A keyboard reader already has four keys
on the field itself, and two more tab stops per number is a form that takes
three times as long to cross.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `decrementLabel` | `decrement-label` | `string` | `'Decrease'` | `HelixBaseInputNumber` | Accessible name for the control that steps down. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `incrementLabel` | `increment-label` | `string` | `'Increase'` | `HelixBaseInputNumber` | Accessible name for the control that steps up. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `largeStep` | `large-step` | `number \| undefined` | - | `HelixBaseInputNumber` | How far `PageUp` and `PageDown` move. |
| `max` | `max` | `number \| undefined` | - | `HelixBaseInputNumber` | Largest value the reader may reach. Absent has no ceiling. |
| `min` | `min` | `number \| undefined` | - | `HelixBaseInputNumber` | Smallest value the reader may reach. Absent has no floor. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `placeholder` | `placeholder` | `string` | `''` | `HelixBaseInputNumber` | Shown while the field is empty. Not a label: it goes when typing starts. |
| `readOnly` | `read-only` | `boolean` | `false` | `HelixBaseInputNumber` | Whether the field refuses input while still submitting its value. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseInputNumber` | Focus is delegated to the field, so the host is never the focus target. |
| `step` | `step` | `number` | `1` | `HelixBaseInputNumber` | How far one step moves. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseInputNumber` | Puts the caret in the field, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `select()` | `HelixBaseInputNumber` | Selects the number, so typing replaces it. |
| `stepDown()` | `HelixBaseInputNumber` | One step down. |
| `stepUp()` | `HelixBaseInputNumber` | One step up, or `PageUp`'s larger one. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired as the value changes, and cancelable. |
| `change` | `Event` | Relayed from the field once the reader has finished. |

#### Slots

| Slot | Description |
| --- | --- |
| `start` | Before the number, for a unit or an icon. |
| `end` | After it. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box holding everything. |
| `control` | The field itself. |
| `decrement` | The control that steps down. |
| `increment` | The control that steps up. |

## Input Pin

### Root — `helix-input-pin`

A short code, one character to a box.

Extends `HelixBaseInputPin`.

Square boxes at the control height with real space between them, which is the
whole picture: a code is read as separate characters, and boxes shoulder to
shoulder read as one field with lines drawn in it.

The focus ring is on the box the reader is in rather than around the row. A
code is entered one character at a time and the boxes exist to say which one
is next, so a ring around all six would answer the question the component is
for.

Figures are tabular, so a 1 takes the room an 8 does and the row does not
breathe as a code is typed into it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `cellLabel` | `cell-label` | `string` | `'Character {index} of {length}'` | `HelixBaseInputPin` | Accessible name for one box, with `{index}` and `{length}` filled in. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `length` | `length` | `number` | `6` | `HelixBaseInputPin` | How many characters the code has. |
| `mask` | `mask` | `boolean` | `false` | `HelixBaseInputPin` | Whether the characters are hidden, the way a password is. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `readOnly` | `read-only` | `boolean` | `false` | `HelixBaseInputPin` | Whether the boxes refuse input while still submitting their value. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseInputPin` | Focus is delegated, so the host is never the focus target. |
| `type` | `type` | `PinType` | `'numeric'` | `HelixBaseInputPin` | What a box accepts, which decides the keyboard a phone offers. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `clear()` | `HelixBaseInputPin` | Empties every box and returns to the first. |
| `focus()` | `HelixBaseInputPin` | Puts the caret in the first empty box, which is where a reader resumes. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired as the code changes, and cancelable. |
| `helix-complete` | `HelixCompleteEvent` | Fired when the last box is filled. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The row of boxes. |
| `cell` | One box. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--pin-gap` | Space between one box and the next. |

## Kbd

### Root — `helix-kbd`

A keyboard key or chord, set inline with text.

Extends `HelixBaseKbd`.

Drawn as a physical key: a hairline, a sunken fill, and one inset shadow
along the bottom edge that reads as depth without becoming a picture of a
key.

Sized in `em`, so it stays proportional to whatever it is set inside rather
than holding one size and looking wrong in a heading.

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The key's label. |

#### Parts

| Part | Description |
| --- | --- |
| `kbd` | The key. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--kbd-background-color` | Fill of the key. |
| `--kbd-border-color` | Color of the hairline and the edge. |

## List

### Root — `helix-list`

A set of rows, read as a set.

Extends `HelixBaseList`.

Rules between rows rather than around each one, so a list reads as one object
with divisions instead of as a stack of cards. `divided` is off by default,
because space alone separates rows perfectly well and a rule at every seam is
decoration doing what emptiness already does.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `divided` | `divided` | `boolean` | `false` | - | Whether a rule sits between rows. |
| `kind` | `kind` | `'default' \| 'description' \| 'ordered' \| 'unordered' \| undefined` | - | `HelixBaseList` | What kind of list this is, which is a fact about the content. |
| `label` | `label` | `string` | `''` | `HelixBaseList` | Accessible name for the set. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The rows. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--list-gap` | Space between rows. |
| `--list-marker-gutter` | Room the ordered and unordered markers hang into. |

### Item — `helix-list-item`

One row of a list.

Extends `HelixBaseListItem`.

A grid rather than a flex row, so the supporting text lines up under the
label rather than under the leading icon. The leading and trailing regions
hold their own width and the middle takes the rest.

#### Slots

| Slot | Description |
| --- | --- |
| `start` | Leading content, usually an icon or an avatar. |
| *(default)* | The label. |
| `supporting` | Secondary text under the label. |
| `end` | Trailing content. |

#### Parts

| Part | Description |
| --- | --- |
| `row` | The layout, held off the host so the host can carry a marker. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--list-item-inset` | Padding inside the row. |
| `--list-item-term-weight` | Weight of a description list's term. |

## Listbox

### Root — `helix-listbox`

A list of options, one or several of which are the answer.

Extends `HelixBaseListbox`.

A framed, scrolling list with the field's three parts around it. The frame is
the list rather than the host, so a filter that empties it leaves a box with
a message in it rather than a border collapsing to nothing.

`--listbox-max-block-size` is what makes it scroll rather than run down the
page. The keyboard brings the active option into that box itself, so a long
list moves under the reader rather than the reader moving to find it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultFilter` | `default-filter` | `string` | `''` | `HelixBaseListbox` | What to start narrowed to, where nothing declared it. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `emptyText` | `empty-text` | `string` | `'No matches'` | `HelixBaseListbox` | What is shown when a filter has hidden every option. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `filter` | `filter` | `string` | - | `HelixBaseListbox` | What the list is narrowed to, if anything. |
| `filterable` | `filterable` | `boolean` | `false` | `HelixBaseListbox` | Whether the list renders a field for narrowing itself. |
| `filterLabel` | `filter-label` | `string` | `'Filter'` | `HelixBaseListbox` | Placeholder for the field that narrows the list. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `multiple` | `multiple` | `boolean` | `false` | `HelixBaseListbox` | Whether more than one option can be the answer. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `options` | - | `HelixBaseOption[]` | - | `HelixBaseListbox` | Every option, in the order a reader meets them. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseListbox` | Focusing the host focuses the list inside it. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |
| `values` | - | `string[]` | - | `HelixBaseListbox` | The chosen values, which is a list whether or not `multiple` is set. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestFilter()` | `HelixBaseListbox` | Requests a narrowing, and reports whether the request stood. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the answer changes, and cancelable. |
| `helix-filter` | `HelixFilterEvent` | Fired before the list narrows, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The options, and any groups of them. |
| `label` | Richer than a string. |
| `hint` | Richer than a string. |

#### Parts

| Part | Description |
| --- | --- |
| `label` | The question, over the list. |
| `items` | The list itself. |
| `empty` | Shown when a filter has hidden everything. |
| `search` | The region holding the field that narrows the list. |
| `filter-icon` | The mark beside that field. |
| `search-field` | The field itself. |
| `hint` | Help under the list. |
| `feedback` | What is wrong with it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--listbox-max-block-size` | How tall it gets before it scrolls. |

## Menu

### Root — `helix-menu`

A menu of commands, opened from a trigger.

Extends `HelixBaseMenu`.

The surface is in the top layer, so it needs no `z-index` and cannot be
clipped by whatever it sits inside.

A submenu replaces the page rather than opening beside it, so the panel stays
one panel and reads the same on a phone as on a desk.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `backLabel` | `back-label` | `string` | `'Back'` | `HelixBaseMenu` | What the row returning from a submenu reads. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `label` | `label` | `string` | `'Menu'` | `HelixBaseMenu` | Accessible name for the surface. |
| `offset` | `offset` | `number` | `4` | `HelixBaseMenu` | Space between the trigger and the surface, in pixels. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placement` | `placement` | `Placement` | `'bottom-start'` | `HelixBaseMenu` | Preferred side. It moves if that side does not fit. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `hide()` | `HelixBaseMenu` | Closes the menu, and forgets which page was showing. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `show()` | `HelixBaseMenu` | Opens the menu. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-open` | `HelixOpenEvent` | Fired before it opens, and cancelable. |
| `helix-close` | `HelixCloseEvent` | Fired before it closes, and cancelable. |
| `helix-select` | `HelixSelectEvent` | Fired when an item is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The items. |
| `trigger` | What opens it. |

#### Parts

| Part | Description |
| --- | --- |
| `surface` | The floating panel the menu is drawn on. |
| `menu` | The surface. |
| `header` | The bar above a submenu, holding the way back and its name. |
| `back` | The control that returns from a submenu. |
| `title` | The name of the submenu that is showing. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--menu-max-block-size` | Tallest the surface grows before it scrolls. |
| `--menu-min-inline-size` | Narrowest the surface gets. |
| `--menu-background-color` | Fill of the surface. |

### Item — `helix-menu-item`

One row in a menu: a command, a choice, or a way into a submenu.

Extends `HelixBaseMenuItem`.

The tick and the arrow hold their space whether or not they are showing, so
the labels in a menu start at one place and the rows read as a column rather
than as a ragged list.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `checkable` | `checkable` | `boolean` | `false` | `HelixBaseMenuItem` | Whether the row is one of a set of choices. |
| `checked` | `checked` | `boolean` | `false` | `HelixBaseMenuItem` | Whether the row is ticked. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseMenuItem` | Whether the row can be chosen. |
| `hasSubmenu` | - | `boolean` | - | `HelixBaseMenuItem` | Whether anything was slotted into `submenu`. |
| `isMenuItem` | - | `boolean` | `true` | `HelixBaseMenuItem` | Marks this as a row a menu should count. Cheaper than an instanceof. |
| `onPage` | - | `boolean` | `true` | `HelixBaseMenuItem` | Whether this row is on the page currently showing. |
| `showingSubmenu` | - | `boolean` | `false` | `HelixBaseMenuItem` | Whether this row's submenu is the page showing. |
| `value` | `value` | `string` | `''` | `HelixBaseMenuItem` | What this row stands for, carried in the event when it is chosen. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseMenuItem` | Moves focus onto the row itself. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the row is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The label. |
| `submenu` | Rows this one opens, which makes it a way in. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The row. |
| `mark` | The trailing mark: a tick when checked, a caret when it opens a page. One column, because a row is never both. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--menu-item-hover-color` | Fill under the pointer. |

## Meter

### Root — `helix-meter`

A measurement in a known range, and whether it is where you want it.

Extends `HelixBaseMeter`.

The bar `Progress` draws, at twice the height and on the house corner rather
than its pill.

It shipped at the progress height, on the argument that the two stand beside
each other in a panel. Rendered side by side that turned out backwards: they
*are* two unrelated controls, and a reader telling a level from a task at a
glance is the point rather than the cost. A meter also carries more, a fill
and a mark at each threshold, and at eight pixels those marks are hairlines.
At sixteen they are unmistakable.

The corner is the ticks' doing: they cut the fill into segments, and a
pill-ended bar comes out as a run whose outer ends are round and whose inner
ends are square. `radii-full` on an eight pixel bar was a four pixel pill
anyway, so this is only a change at all because the bar grew.

What else differs is what the colour means. A progress bar is one colour because
there is one thing to say; a meter's fill takes the success, warning or danger
tone from the band its reading falls in, and only once thresholds have been
declared. An unbanded meter is neutral, because a gauge with nothing said
about it is a reading rather than good news.

A tick marks each threshold, so the reading can be placed against the bands
without seeing colour at all.

A reading past either end squares the corner it ran out at, which is the
convention for a quantity continuing past the frame it is drawn in. The bar
itself stops, because that is what an end is; the words and the accessible
reading are what say how far past.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `band` | `band` | `MeterBand \| undefined` | - | `HelixBaseMeter` | The band, said outright, where the three thresholds cannot say it. |
| `high` | `high` | `number \| undefined` | - | `HelixBaseMeter` | Bottom of the high band. Absent leaves the range unbanded. |
| `label` | `label` | `string` | `'Meter'` | `HelixBaseMeter` | Accessible name for the reading. |
| `low` | `low` | `number \| undefined` | - | `HelixBaseMeter` | Top of the low band. Absent leaves the range unbanded. |
| `max` | `max` | `number` | `100` | `HelixBaseMeter` | Top of the range. |
| `min` | `min` | `number` | `0` | `HelixBaseMeter` | Bottom of the range. |
| `optimum` | `optimum` | `number \| undefined` | - | `HelixBaseMeter` | Where in the range it is best to be. |
| `showValue` | `show-value` | `boolean` | `false` | `HelixBaseMeter` | Whether the reading is shown beside the bar. |
| `value` | `value` | `number` | `0` | `HelixBaseMeter` | The reading. |
| `valueText` | `value-text` | `string` | `''` | `HelixBaseMeter` | What the reading says, where a number is not the whole story. |

#### Parts

| Part | Description |
| --- | --- |
| `track` | The whole range. |
| `indicator` | The part of it the value fills. |
| `tick` | A mark at `low` or at `high`. |
| `value` | The reading, under `show-value`. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--meter-color` | The fill, overriding the band's own tone. |
| `--meter-size` | How thick the bar is. |
| `--meter-tick-color` | The mark at a threshold. |
| `--meter-track-color` | The groove behind the fill. |

## Navigation

### Root — `helix-navigation`

A set of destinations, with a marker on the current one.

Extends `HelixBaseNavigation`.

One marker that travels, rather than a background that appears on whichever
destination is current. A fill that swaps is two things changing at once and
reads as a flicker; one that moves is a single object the eye follows, and it
says where the current page was as well as where it is.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `'Main'` | `HelixBaseNavigation` | Accessible name for the landmark. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The destinations, as the consumer's own links. |

#### Parts

| Part | Description |
| --- | --- |
| `nav` | The navigation landmark. |
| `indicator` | The marker that travels to the current destination. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--navigation-indicator-color` | Fill of the traveling marker. |
| `--navigation-gap` | Space between destinations. |

## Option

### Root — `helix-option`

One choice in a listbox.

Extends `HelixBaseOption`.

Two states that look different on purpose: chosen, which is a fact about the
value, and active, which is where the keyboard is. A list that draws them the
same way leaves a reader arrowing through it unable to tell what they have
picked from what they are looking at.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `active` | `data-active` | `boolean` | `false` | `HelixBaseOption` | Whether this is the option the keyboard is on. Written by the listbox. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseOption` | Whether this choice can be made. |
| `selected` | `selected` | `boolean` | `false` | `HelixBaseOption` | Whether this choice is currently chosen. Written by the listbox. |
| `text` | - | `string` | - | `HelixBaseOption` | The words, for a listbox that has to match text against them. |
| `value` | `value` | `string` | `''` | `HelixBaseOption` | Identifies this choice, and is what a form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `select()` | `HelixBaseOption` | Makes this choice and announces it. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when this choice is made. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The words naming this choice. |
| `start` | Before the words, for an icon or an avatar. |
| `end` | After them, for a shortcut or a count. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The row. |
| `label` | The words. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--option-active-color` | Wash behind the option the keyboard is on. |
| `--option-radii` | Corner radius of the row. A listbox and a select flatten it. |

### Group — `helix-option-group`

A named run of options inside a listbox.

Extends `HelixBaseOptionGroup`.

The heading is set small and quiet, because it is a divider that happens to
have words on it: a run of options is read as a list and the heading is what
tells you which list, not something to read on its own.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `''` | `HelixBaseOptionGroup` | The heading over the run. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The options in this run. |
| `label` | Richer than a string. |

#### Parts

| Part | Description |
| --- | --- |
| `label` | The heading. |
| `items` | The run itself. |

## Outline

### Root — `helix-outline`

Links to the headings on this page, marking the one being read.

Extends `HelixBaseOutline`.

A rule down the leading edge with the current section lit along it, which is
the shape a table of contents has taken since printed marginalia: the line
says the list is one thing, and the lit segment says where in it you are.

Nesting is the consumer's, expressed as `data-level` on a link. A outline
that read heading levels itself would have to look at the document, and the
document is not always where the headings are.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `behavior` | `behavior` | `ScrollBehavior` | `'auto'` | `HelixBaseOutline` | How a click on one of these links travels to its section. |
| `current` | - | `string` | - | `HelixBaseOutline` | The id of the section being read, or empty before anything is measured. |
| `label` | `label` | `string` | `'On this page'` | `HelixBaseOutline` | Accessible name for the navigation. |
| `offset` | `offset` | `number` | `0` | `HelixBaseOutline` | How far below the top of the window a heading counts as reached, in pixels. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The links, as anchors with fragment hrefs. |

#### Parts

| Part | Description |
| --- | --- |
| `nav` | The navigation landmark. |
| `indicator` | The mark that travels to the section being read. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--outline-rail` | Width of the gutter the rule and the travelling mark share. |
| `--outline-indent` | How far each level is inset from the one above. |

## Pagination

### Root — `helix-pagination`

Moves between pages of a longer result.

Extends `HelixBasePagination`.

One box for every control in the row, arrows and numbers alike, so the run has
a single rhythm and the steps sit at the numbers' height rather than between
them. Square, because a page number is one or two characters and a box sized
to the widest would leave the short ones swimming; `min-inline-size` rather
than a fixed one, so page 100 grows instead of overflowing.

Figures are tabular throughout. A page number is the one thing here that
changes under the pointer, and proportional digits make the whole row shuffle
as it does.

The current page is a raised chip rather than a brand fill, which is the
treatment `Tabs` gives its selected tab. Brand on a page number claims more
than the state deserves: it is not a choice the reader made about anything,
it is where they happen to be standing, and a row of grey numbers with one
blue one reads as the blue one being an action.

Selected on `aria-current` rather than on a second attribute saying the same
thing: the state is already in the accessibility tree, and a `data-current`
beside it would be two places to keep in step.

The gap takes the same box as everything else in the row and only sits back a
shade in colour. It is a control, so it answers hover and focus like one; it
is a way through rather than a destination, so it does not compete.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `boundaries` | `boundaries` | `number` | `1` | `HelixBasePagination` | How many pages to show at each end, whatever the current one is. |
| `compact` | `compact` | `boolean` | `false` | `HelixBasePagination` | Where the numbers are replaced by a reading of the two. |
| `defaultPage` | `default-page` | `number` | `1` | `HelixBasePagination` | Page to open on, where nothing declared one. |
| `ends` | `ends` | `boolean` | `false` | `HelixBasePagination` | Whether to offer a jump to the first and last pages. |
| `firstLabel` | `first-label` | `string` | `'First page'` | `HelixBasePagination` | Accessible name for the control that jumps to the first page. |
| `gapLabel` | `gap-label` | `string` | `'Skip to page {page}'` | `HelixBasePagination` | Accessible name for a gap, with `{page}` filled in as where it goes. |
| `href` | `href` | `string` | `''` | `HelixBasePagination` | Address for a page, with `{page}` standing in for its number. |
| `label` | `label` | `string` | `'Pagination'` | `HelixBasePagination` | Accessible name for the navigation landmark. |
| `lastLabel` | `last-label` | `string` | `'Last page'` | `HelixBasePagination` | Accessible name for the control that jumps to the last page. |
| `locale` | `locale` | `string` | `''` | `HelixBasePagination` | Locale for the page numbers. Absent uses the runtime's own. |
| `nextLabel` | `next-label` | `string` | `'Next page'` | `HelixBasePagination` | Accessible name for the control that moves forward. |
| `page` | `page` | `number` | - | `HelixBasePagination` | The page on show, one-based. |
| `pageLabel` | `page-label` | `string` | `'Page {page}'` | `HelixBasePagination` | Accessible name for one page, with `{page}` and `{pages}` filled in. |
| `pages` | `pages` | `number` | `0` | `HelixBasePagination` | How many pages there are in total. |
| `pageSize` | `page-size` | `number` | `0` | `HelixBasePagination` | How many items are on a page. |
| `previousLabel` | `previous-label` | `string` | `'Previous page'` | `HelixBasePagination` | Accessible name for the control that moves back. |
| `siblings` | `siblings` | `number` | `1` | `HelixBasePagination` | How many pages to show either side of the current one. |
| `statusLabel` | `status-label` | `string` | `'{page} of {pages}'` | `HelixBasePagination` | The reading shown in `compact`, with `{page}` and `{pages}` filled in. |
| `total` | `total` | `number` | `0` | `HelixBasePagination` | How many items there are across every page. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-navigate` | `HelixNavigateEvent` | Fired before the page changes, and cancelable. The only way to refuse one. |

#### Parts

| Part | Description |
| --- | --- |
| `list` | The run of pages. |
| `item` | One slot in the run, holding a page or a gap. |
| `page` | The control for one page. |
| `gap` | The control standing over pages not shown, which jumps into them. |
| `previous` | The control that moves back one page. |
| `next` | The control that moves forward one page. |
| `first` | The control that jumps to the first page, under `ends`. |
| `last` | The control that jumps to the last page, under `ends`. |
| `status` | The reading of where you are, in `compact`. |
| `live` | The region that says the page changed. Clipped, not hidden. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--pagination-current-color` | Fill behind the page you are on. |
| `--pagination-gap` | Space between one control and the next. |
| `--pagination-hover-color` | Fill behind a control under the pointer. |
| `--pagination-size` | The box every control in the row takes. |

### Size — `helix-pagination-size`

Chooses how many items a page holds.

Extends `HelixBasePaginationSize`.

A `Select`, laid out on one row. Every other field stacks its label because it
stands in a column of fields; this one stands in a footer beside a run of page
numbers, where a two-line control makes the whole row two lines tall.

`Select`'s own parts are exported, so `::part(trigger)` and `::part(label)`
reach through both boundaries and a consumer styles it as the select it is.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultValue` | `default-value` | `number` | `0` | `HelixBasePaginationSize` | Size to start on, where nothing declared one. |
| `label` | `label` | `string` | `'Per page'` | `HelixBasePaginationSize` | The words beside the control. |
| `locale` | `locale` | `string` | `''` | `HelixBasePaginationSize` | Locale for the numbers. Absent uses the runtime's own. |
| `sizes` | `sizes` | `string` | `'10,25,50,100'` | `HelixBasePaginationSize` | The sizes offered, comma separated. |
| `value` | `value` | `number` | - | `HelixBasePaginationSize` | The size in force. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired before the size changes, and cancelable. The only way to refuse one. |

#### Parts

| Part | Description |
| --- | --- |
| `control` | The select. |
| `label` | The words beside the number, forwarded from the select. |
| `trigger` | The closed control, forwarded from the select. |
| `value` | The chosen size inside the trigger, forwarded from the select. |

### Summary — `helix-pagination-summary`

Reads out which items of how many are on show.

Extends `HelixBasePaginationSummary`.

Prose beside the controls rather than one of them: no box and no hover, in the
subtler of the two muted steps, because it is a fact about the result and not
a way to move through it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `format` | `format` | `string` | `'{from}-{to} of {total}'` | `HelixBasePaginationSummary` | The reading, with `{from}`, `{to}` and `{total}` filled in. |
| `locale` | `locale` | `string` | `''` | `HelixBasePaginationSummary` | Locale for the numbers. Absent uses the runtime's own. |
| `page` | `page` | `number` | `1` | `HelixBasePaginationSummary` | The page on show, one-based. |
| `pageSize` | `page-size` | `number` | `0` | `HelixBasePaginationSummary` | How many items are on a page. |
| `total` | `total` | `number` | `0` | `HelixBasePaginationSummary` | How many items there are across every page. |

## Popover

### Root — `helix-popover`

A panel that opens against a trigger and holds anything.

Extends `HelixBasePopover`.

A surface with an inset and a shadow, and nothing about what goes in it. The
inset is the panel's rather than the consumer's, which is the same call
`Dialog` and `Drawer` make and for the same reason: everyone was writing it,
and everyone was writing the same one.

It arrives from the side it opened on. `data-placement` is written by the
positioning, so the panel knows which way it flipped and can animate from the
trigger rather than from a fixed direction that would be backwards half the
time.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'plain' \| undefined` | - | - | How the panel is framed. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `label` | `label` | `string` | `'Popover'` | `HelixBasePopover` | Accessible name for the panel. |
| `offset` | `offset` | `number` | `4` | `HelixBasePopover` | Space between the trigger and the panel, in pixels. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placement` | `placement` | `Placement` | `'bottom-start'` | `HelixBasePopover` | Preferred side. It moves if that side does not fit. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `hide()` | `HelixBasePopover` | Closes the panel and puts focus back on the trigger. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `show()` | `HelixBasePopover` | Opens the panel. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-open` | `HelixOpenEvent` | Fired before it opens, and cancelable. |
| `helix-close` | `HelixCloseEvent` | Fired before it closes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| `trigger` | What opens it. |
| *(default)* | The contents of the panel. |

#### Parts

| Part | Description |
| --- | --- |
| `content` | The scrolling region inside the panel. |
| `popover` | The panel. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--popover-max-block-size` | Tallest the panel grows before it scrolls. |
| `--popover-inset` | Space between the panel's edge and its contents. |
| `--popover-inline-size` | Width of the panel. |

## Progress

### Root — `helix-progress`

Shows how far along a task is, when that is known.

Extends `HelixBaseProgress`.

A track and the part of it that is done. The height comes from a token rather
than from a size property, for the reason the rest of the library gives about
controls: how heavy a bar is says something about the region it is in, and a
`--progress-size` on that region says it once.

The fill transitions, which is worth more here than it looks. Progress
arrives in steps, often large ones, and a bar that jumps between them reads
as a series of unrelated states where one that travels reads as a single
thing advancing.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `fraction` | - | `number` | - | `HelixBaseProgress` | What is done, as a fraction of the whole, between 0 and 1. |
| `indeterminate` | `indeterminate` | `boolean` | `false` | `HelixBaseProgress` | Whether the work has a knowable end. |
| `label` | `label` | `string` | `'Progress'` | `HelixBaseProgress` | Accessible name for what is in progress. |
| `max` | `max` | `number` | `100` | `HelixBaseProgress` | The total the work is measured against. |
| `shape` | `shape` | `'ring' \| undefined` | - | `HelixBaseProgress` | Whether the value is drawn as a bar or as a ring. |
| `showValue` | `show-value` | `boolean` | `false` | `HelixBaseProgress` | Whether the reading is shown beside the bar. |
| `value` | `value` | `number` | `0` | `HelixBaseProgress` | What has been done so far, in the same units as `max`. |
| `valueText` | `value-text` | `string` | `''` | `HelixBaseProgress` | A reading for the value, where the number alone does not say enough. |

#### Parts

| Part | Description |
| --- | --- |
| `track` | The full length the work is measured against. |
| `indicator` | The part of it that is done. |
| `groove` | The unfilled circle, under the ring's own sweep. |
| `value` | The reading beside the bar, under `show-value`. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--progress-size` | Thickness of the bar. |
| `--progress-color` | Fill of the part that is done. |
| `--progress-track-color` | Fill of the part that is not. |
| `--progress-ring-size` | Diameter of the ring appearance. |
| `--progress-ring-width` | Thickness of its stroke. |

## Quote

### Root — `helix-quote`

A short quotation, set inline with the text around it.

Extends `HelixBaseQuote`.

Takes the surrounding type rather than a size of its own, because a quotation
inside a paragraph is that paragraph's text with marks around it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `cite` | `cite` | `string` | `''` | `HelixBaseQuote` | URL identifying where the quotation came from. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The quoted text. |

#### Parts

| Part | Description |
| --- | --- |
| `quote` | The quotation. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--quote-color` | Color of the quoted text. |

## Radio

### Root — `helix-radio`

One choice in a radio group.

Extends `HelixBaseRadio`.

A circle with a dot in it, drawn here rather than by the browser for the
reason the checkbox's box is: this is a `<button role="radio">`, so there was
never a native control to restyle, and the weight and the motion of the mark
are ours either way.

The dot scales from nothing, like the checkbox's tick, so choosing shows
something happening. It has no color, because color is reserved for state
and being chosen is an answer rather than a state.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'plain' \| 'card' \| undefined` | - | - | How the choice presents itself. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseRadio` | Whether this choice can be made. |
| `hideControl` | `hide-control` | `boolean` | `false` | - | Takes the circle away, leaving the card as the whole control. |
| `selected` | `selected` | `boolean` | `false` | `HelixBaseRadio` | Whether this is the current choice. Written by the group. |
| `value` | `value` | `string` | `''` | `HelixBaseRadio` | Identifies this choice to the group, and is what the form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focusItem()` | `HelixBaseRadio` | Moves focus to this choice, for the group's arrow keys. |
| `select()` | `HelixBaseRadio` | Makes this choice and announces it. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when this choice is made. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The words naming this choice. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The button, which is the whole row. |
| `box` | The circle. |
| `mark` | The dot inside it. |
| `label` | The words beside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--radio-size` | Diameter of the circle. |
| `--radio-mark-color` | Color of the dot. |
| `--radio-background-color` | Fill of an unselected circle. |
| `--radio-card-padding` | Inset of the card appearance. |
| `--radio-card-background-color` | Fill behind a card-shaped choice. |
| `--radio-card-border-color` | Edge around one. |

### Group — `helix-radio-group`

A set of choices where exactly one is the answer.

Extends `HelixBaseRadioGroup`.

The field's three parts, laid out the way every other field lays them out: a
question over the set, and one line under it that is help until something is
wrong. `orientation` lays out the choices and not the field, so a horizontal
group keeps its question above the row rather than beside the first choice.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `items` | - | `HelixBaseRadio[]` | - | `HelixBaseRadioGroup` | The radios, in light-DOM order. Client only: the server has no tree. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `orientation` | `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | `HelixBaseRadioGroup` | Which way the choices run. A column reads one line per answer. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the answer changes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The radios. |
| `label` | Richer than a string, where the question is more than one. |
| `hint` | Richer than a string. |

#### Parts

| Part | Description |
| --- | --- |
| `label` | The question, over the set. |
| `items` | The choices, which is what `orientation` lays out. |
| `hint` | Help under the set. |
| `feedback` | What is wrong with it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--radio-group-gap` | Space between the choices. |

## Select

### Root — `helix-select`

A closed list that opens to be chosen from.

Extends `HelixBaseSelect`.

The trigger wears the same frame as an `Input`, because in a form it stands
in a row with them and a control that looks like a button among fields reads
as an action rather than an answer.

The panel is an overlay surface rather than a sunken one: it sits over the
page instead of on it, which is what its shadow says and what tells it apart
from the field it came out of.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `filterable` | `filterable` | `boolean` | `false` | `HelixBaseSelect` | Whether the list can be narrowed by typing. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `multiple` | `multiple` | `boolean` | `false` | `HelixBaseSelect` | Whether more than one option can be the answer. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placeholder` | `placeholder` | `string` | `'Choose'` | `HelixBaseSelect` | Shown on the trigger while nothing is chosen. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Relayed from the listbox when the answer changes. |
| `helix-open` | `HelixOpenEvent` | Fired when the list opens. |
| `helix-close` | `HelixCloseEvent` | Fired when it closes. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The options, and any groups of them. |
| `indicator` | The mark on the trigger saying this opens, usually a caret. |
| `label` | Richer than a string. |
| `hint` | Richer than a string. |

#### Parts

| Part | Description |
| --- | --- |
| `label` | The question, over the trigger. |
| `value` | The chosen option's text inside the trigger. |
| `indicator` | The caret saying the control opens. Replaced by slotting one. |
| `trigger` | The closed control, which says what is chosen. |
| `surface` | The floating panel. |
| `listbox` | The list inside it. |
| `items` | The scrolling box of options, forwarded from the listbox. |
| `empty` | What shows with no options in it, forwarded from the listbox. |
| `hint` | Help under the trigger. |
| `feedback` | What is wrong with it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--select-surface-max-block-size` | How tall the panel gets. |

## Skeleton

### Root — `helix-skeleton`

Stands in for content that has not arrived.

Extends `HelixBaseSkeleton`.

A sweep rather than a pulse. A block fading in and out reads as something
broken; a highlight travelling across it reads as work in progress, and it is
the same one property animating either way.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `shape` | `shape` | `'text' \| 'circle' \| undefined` | - | - | What the missing content is shaped like. |

#### Parts

| Part | Description |
| --- | --- |
| `skeleton` | The placeholder surface. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--skeleton-size` | Diameter of the circle shape. |

## Slider

### Root — `helix-slider`

A value chosen from a range by dragging.

Extends `HelixBaseSlider`.

The track and the thumb are the browser's own, restyled through the range
pseudo-elements rather than replaced. What that buys is everything a
hand-built slider has to reimplement and usually gets slightly wrong: the
drag, the keys, and a hit area sized by the platform for a finger.

The filled part of the track is painted with a gradient driven by the
fraction the headless tier writes, rather than by a second element laid over
it. One element cannot be half one color by any other means that survives
the thumb being dragged.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `markerLabels` | `marker-labels` | `boolean` | `false` | `HelixBaseSlider` | Mirrors "there are marks" for the stylesheet. |
| `markers` | `markers` | `number` | `0` | `HelixBaseSlider` | How many marks to draw along the track, evenly spaced, ends included. |
| `max` | `max` | `number` | `100` | `HelixBaseSlider` | The largest value the reader can choose. |
| `min` | `min` | `number` | `0` | `HelixBaseSlider` | The smallest value the reader can choose. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseSlider` | Focus is delegated to the control, so the host is never the target. |
| `showValue` | `show-value` | `boolean` | `false` | `HelixBaseSlider` | Whether the chosen value is shown beside the track. |
| `step` | `step` | `number` | `1` | `HelixBaseSlider` | How far one press of an arrow key moves it. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |
| `valueAsNumber` | - | `number` | - | `HelixBaseSlider` | The chosen value as a number, for anything doing arithmetic on it. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired as the value changes, and cancelable. |
| `change` | `Event` | Relayed once the reader has let go. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The row: the control and its readout. |
| `control` | The range input. |
| `markers` | The row of marks along the track. |
| `marker` | One mark. |
| `marker-label` | The value a mark stands at, when `marker-labels` is set. |
| `output` | The current value, shown beside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--slider-thumb-color` | The handle. |
| `--slider-track-color` | The part not yet chosen. |
| `--slider-fill-color` | The part behind the thumb. |
| `--slider-marker-color` | The ticks along the track. |
| `--slider-track-image` | The whole track, for a slider whose colour is the value. |

## Spinner

### Root — `helix-spinner`

Says that something indeterminate is in progress.

Extends `HelixBaseSpinner`.

Sized in `em`, so it matches whatever text it sits beside without being told.
The color is `currentColor` for the same reason: a spinner inside a primary
button is on the accent, and one in body copy is not, and neither should have
to say so.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `'Loading'` | `HelixBaseSpinner` | Accessible name, announced while the work is outstanding. |
| `size` | `size` | `'sm' \| 'md' \| 'lg' \| undefined` | - | - | Diameter relative to the surrounding text. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | A mark to sit still at the center, usually a logo. Empty by default. |

#### Parts

| Part | Description |
| --- | --- |
| `svg` | The rotating circle pair. |
| `mark` | The region holding what was slotted at the center. |
| `track` | The full circle behind the indicator. |
| `indicator` | The arc that turns. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--spinner-size` | Diameter. Defaults to 1.5em. |
| `--spinner-color` | Color of the moving arc. |
| `--spinner-track-color` | Color of the circle behind it. |

## Splitter

### Root — `helix-splitter`

Two panes and a divider the reader can move.

Extends `HelixBaseSplitter`.

The divider is a line to look at and a box to hit, and they are different
sizes. Drawn at the border's own width it is a one pixel pointer target, which
is the fault every hand-rolled splitter has; the line is a border and the
target is the box around it.

It lights on hover before it is touched, because a hairline says nothing about
being movable, and the whole target lights rather than the line, so the thing
that answers the pointer is the thing that changed.

Both panes scroll and both have their minimum size taken off them. A flex
item's floor is its content, so a pane holding anything scrollable would
otherwise refuse to go below it: the divider would stop at a width nobody
asked for and nothing would say why.

The corner where a nested splitter crosses is twice the divider's target,
because it is aimed at as a point rather than a line. It draws nothing of its
own: the `move` cursor already says what it is, at the moment a reader is on
it. A ring on focus is the exception, since with nothing drawn there would
otherwise be no way to see where the keyboard is.

A divider stays lit for as long as it is moving, which `:hover` cannot say on
its own: a drag captures the pointer, and a corner moves the nested divider
while the reader is nowhere near it. It goes primary while it moves rather
than merely darker, because hover is a question and a drag is an answer, and
because a corner moving two dividers at once needs the pair to read as one
gesture.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `collapsed` | `collapsed` | `'end' \| 'start' \| undefined` | - | `HelixBaseSplitter` | Which pane is shut, if either. |
| `collapsedSize` | `collapsed-size` | `number` | `0` | `HelixBaseSplitter` | How much of a shut pane is still shown, as a percentage. |
| `cornerLabel` | `corner-label` | `string` | `'Resize both'` | `HelixBaseSplitter` | Accessible name for the handle where two dividers cross. |
| `defaultCollapsed` | `default-collapsed` | `'end' \| 'start' \| undefined` | - | `HelixBaseSplitter` | Which pane starts shut, where nothing declared it. |
| `defaultPosition` | `default-position` | `number` | `50` | `HelixBaseSplitter` | Where the divider starts, where nothing declared it. |
| `label` | `label` | `string` | `'Resize panes'` | `HelixBaseSplitter` | Accessible name for the divider. |
| `max` | `max` | `number` | `100` | `HelixBaseSplitter` | Nearest it may come to the end. |
| `min` | `min` | `number` | `0` | `HelixBaseSplitter` | Nearest the divider may come to the start, as a percentage. |
| `orientation` | `orientation` | `'horizontal' \| 'vertical' \| undefined` | - | `HelixBaseSplitter` | Which way the panes are laid out. |
| `position` | `position` | `number` | - | `HelixBaseSplitter` | Where the divider sits, as a percentage of the whole. |
| `step` | `step` | `number` | `2` | `HelixBaseSplitter` | How far one arrow press moves it, as a percentage. |
| `vertical` | - | `boolean` | - | `HelixBaseSplitter` | Public because a nested splitter compares axes with the one it is in. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `cross()` | `HelixBaseSplitter` | Records that a nested splitter crosses this one at `at` percent along it. |
| `moveTo()` | `HelixBaseSplitter` | Moves the divider, and optionally says so. |
| `uncross()` | `HelixBaseSplitter` | Forgets a nested splitter that has left the tree. See `cross`. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the divider settles, named `position` or `collapsed`. |

#### Slots

| Slot | Description |
| --- | --- |
| `start` | The pane before the divider. |
| `end` | The pane after it. |

#### Parts

| Part | Description |
| --- | --- |
| `start` | The box holding the first pane. |
| `end` | The box holding the second. |
| `separator` | The divider itself. |
| `corner` | The handle where a nested splitter's divider crosses this one. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--splitter-color` | The line between the panes. |
| `--splitter-corner` | How wide the handle at a crossing is. |
| `--splitter-drag-color` | The line while it is being moved. |
| `--splitter-hover-color` | The target under the pointer. |
| `--splitter-target` | How wide the draggable box is. |

## Stat

### Root — `helix-stat`

One measurement, with the word for what it measures.

Extends `HelixBaseStat`.

The value is set on the display face at a size the type scale does not reach,
because a figure is the one place on a page where the number is the design.
The label sits above it in the label ramp, quiet and wide-tracked, so the
pair reads as one object rather than as two lines of text.

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The value. |
| `label` | What the value measures. |
| `unit` | The unit, set beside the value. |
| `detail` | A change, comparison, or note under the label. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--stat-value-size` | Size of the figure. |

### Group — `helix-stat-group`

A row of related measurements.

Extends `HelixBaseStatGroup`.

Wraps rather than scrolls, and each figure keeps its own width instead of
every one taking an equal share: a set of figures is read by comparing them,
and equal columns make a four-digit number and a two-digit one look like the
same quantity.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `divided` | `divided` | `boolean` | `false` | - | Whether the figures are separated by a rule as well as by space. |
| `label` | `label` | `string` | `''` | `HelixBaseStatGroup` | Accessible name for the set. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The stats. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--stat-group-gap` | Space between figures. |

## Switch

### Root — `helix-switch`

A control that turns something on or off.

Extends `HelixBaseSwitch`.

A thumb travelling in a groove, which is the one place in the library color
is used to say "on". A checkbox does not, because a tick is legible on its
own; a switch has no mark, so the fill is the whole of what distinguishes the
two states and there is nothing else for it to be.

The input itself is the hit target and is drawn as the track, stretched over
it and invisible, so the press, the focus and the label forwarding are all
the platform's while the picture is ours.

**Its height is `--helix-size-switch`, which is one step above the
checkbox's** at every density rather than the same as it. A checkbox is a box
with a mark in it; a switch is a track with a thumb inside it, and at the
checkbox's height the thumb has two pixels of groove around it and the whole
control reads as a small dash. The width follows the height, so setting
`--switch-height` widens it too and the proportion is not something a
consumer has to keep.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `checked` | `checked` | `boolean` | - | `MixinControllerChecked` | Whether the control is checked. |
| `defaultChecked` | `default-checked` | `boolean` | `false` | `MixinControllerChecked` | Initial checked state for uncontrolled use, where nothing declared one. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onCheckedChange` | - | `((checked: boolean) => void) \| undefined` | `undefined` | `MixinControllerChecked` | The consumer's callback, invoked after the state is applied. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `value` | `value` | `string` | `'on'` | `HelixBaseSwitch` | Value submitted when the switch is on. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `HelixBaseSwitch` | Returns the switch to the state its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerChecked` | Restores the control when the browser brings a form back. |
| `requestChecked()` | `MixinControllerChecked` | Requests a checked change, and reports whether it was applied. |
| `resetChecked()` | `MixinControllerChecked` | Drops the uncontrolled state, so the control reads `defaultChecked` again. |
| `toggleChecked()` | `MixinControllerChecked` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired before the state changes, and cancelable. |
| `change` | `Event` | Relayed from the input once the state has changed. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The words naming what this turns on. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The row: the track and its label. |
| `track` | The groove the thumb travels in. |
| `control` | The input. |
| `thumb` | The part that moves. |
| `label` | The words beside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--switch-height` | Height of the track. The width follows it. |
| `--switch-width` | Length of the track, if not the derived one. |
| `--switch-on-color` | Fill when it is on. |
| `--switch-thumb-color` | The handle, in both states. |

## Table

### Root — `helix-table`

Tabular data laid out on a grid.

Extends `HelixBaseTable`.

Hairline rules between rows and no fill, per the rule that depth comes from a
single border rather than from elevation. A dense table earns its density by
decorating none of it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `columns` | `columns` | `string` | `''` | `HelixBaseTable` | Column track list, as CSS. Deprecated: declare columns instead. |
| `label` | `label` | `string` | `''` | `HelixBaseTable` | Accessible name for the table. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixElement.shadowRootOptions, slotAssignment: 'manual', }` | `HelixBaseTable` | Nothing is assigned by name, so the columns can be put in a row. |
| `tableColumns` | - | `HelixBaseTableColumn[]` | - | `HelixBaseTable` | The columns declared as children, in the order they are written. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The table's rows. |

#### Parts

| Part | Description |
| --- | --- |
| `table` | The grid. |
| `head` | The row the column headings sit in. `display: contents`, so it takes no space. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--table-columns` | Track list for the columns. |

### Cell — `helix-table-cell`

One cell of a table.

Extends `HelixBaseTableCell`.

Hairline rules between rows and no fill, per the rule that depth comes from a
single border rather than from elevation. A dense table earns its density by
decorating none of it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `header` | `header` | `boolean` | `false` | `HelixBaseTableCell` | Whether the cell heads its column. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The cell's content. |

### Column — `helix-table-column`

One column of a table: its heading, and how wide it is.

Extends `HelixBaseTableColumn`.

Styled as the header cell it is, and it carries the same rule and inset as
the cells beneath it so the heading and its column read as one line down the
table.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `isTableColumn` | - | `boolean` | `true` | `HelixBaseTableColumn` | Marks this as a column a table should count. Cheaper than an instanceof. |
| `track` | - | `string` | - | `HelixBaseTableColumn` | The track this column contributes, resolved. |
| `width` | `width` | `string` | `''` | `HelixBaseTableColumn` | The track this column takes, as CSS. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The heading. |

#### Parts

| Part | Description |
| --- | --- |
| `column` | The heading cell. |

### Row — `helix-table-row`

One row of a table.

Extends `HelixBaseTableRow`.

Hairline rules between rows and no fill, per the rule that depth comes from a
single border rather than from elevation. A dense table earns its density by
decorating none of it.

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The row's cells. |

## Tabs

### Root — `helix-tabs`

A row of tabs and the panel each one shows.

Extends `HelixBaseTabs`.

Selection is marked with a rule under the active tab rather than a filled
pill, which keeps the row flat and lets the underline animate between tabs as
a movement instead of two separate fills.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `active` | `active` | `string` | - | `MixinControllerActive` | Which item is current, by its `value`. |
| `appearance` | `appearance` | `'toggle' \| 'underline' \| undefined` | - | `HelixBaseTabs` | How the row reads. |
| `defaultActive` | `default-active` | `string` | `''` | `MixinControllerActive` | Initial item for uncontrolled use. Ignored once `active` is written. |
| `label` | `label` | `string` | `'Tabs'` | `HelixBaseTabs` | Accessible name for the tab list. |
| `manual` | `manual` | `boolean` | `false` | `HelixBaseTabs` | Whether arrowing to a tab also selects it. |
| `onActiveChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerActive` | The consumer's callback, invoked after the change is applied. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `requestActive()` | `MixinControllerActive` | Requests a new current item, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired before the current tab moves, and cancelable. The only way to refuse one. |
| `helix-select` | `HelixSelectEvent` | Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The tabs. |
| `panels` | The panels. |

#### Parts

| Part | Description |
| --- | --- |
| `tabs` | The tab list. |
| `panels` | The panel container. |
| `indicator` | The mark that travels to the selected tab. |

### Panel — `helix-tabs-panel`

The content shown for one tab.

Extends `HelixBaseTabsPanel`.

Selection is marked with a rule under the active tab rather than a filled
pill, which keeps the row flat and lets the underline animate between tabs as
a movement instead of two separate fills.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | - | `string` | `''` | `HelixBaseTabsPanel` | The name of the panel, which is the text of the tab that opens it. |
| `selected` | `selected` | `boolean` | `false` | `HelixBaseTabsPanel` | Whether this panel is the visible one. |
| `value` | `value` | `string` | `''` | `HelixBaseTabsPanel` | Pairs the panel with the tab of the same value. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The panel's content. |

#### Parts

| Part | Description |
| --- | --- |
| `panel` | The panel container. |

### Tab — `helix-tabs-tab`

One tab in a tab list.

Extends `HelixBaseTabsTab`.

Selection is marked with a rule under the active tab rather than a filled
pill, which keeps the row flat and lets the underline animate between tabs as
a movement instead of two separate fills.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseTabsTab` | Whether the tab can be chosen. |
| `selected` | `selected` | `boolean` | `false` | `HelixBaseTabsTab` | Whether this tab is the current one. |
| `value` | `value` | `string` | `''` | `HelixBaseTabsTab` | Identifies the tab, and pairs it with the panel of the same value. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focusItem()` | `HelixBaseTabsTab` | Moves focus to this tab, for the list's arrow keys. |
| `select()` | `HelixBaseTabsTab` | Selects this tab and announces it. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the tab is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The tab's label. |

#### Parts

| Part | Description |
| --- | --- |
| `tab` | The tab itself. |

## Tag

### Root — `helix-tag`

Labels content with a short piece of metadata.

Extends `HelixBaseTag`.

Five appearances. The fill is a tint of the status color, mixed with
`color-mix` rather than held as a token per status, so a theme that changes
the status colors gets the tints with them.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'outlined' \| 'solid' \| 'subtle' \| undefined` | - | - | How much of the tone the tag wears. |
| `dismissible` | `dismissible` | `boolean` | `false` | `MixinDismissible` | Whether it offers a control to take it away. |
| `dismissLabel` | `dismiss-label` | `string` | `'Dismiss'` | `MixinDismissible` | Accessible name for that control. |
| `tone` | `tone` | `'danger' \| 'info' \| 'neutral' \| 'primary' \| 'success' \| 'warning' \| undefined` | - | - | Which status the tag reports. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `dismiss()` | `MixinDismissible` | Announces that it should go, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-dismiss` | `HelixDismissEvent` | Fired when the reader asks to remove the tag. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The tag's label. |

#### Parts

| Part | Description |
| --- | --- |
| `dismiss` | The remove button, when `dismissible`. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--tag-background-color` | Fill behind the tag. |
| `--tag-foreground-color` | Label color. |
| `--tag-radii` | Corner radius of the tag. |

## Text

### Root — `helix-text`

A run of text, with the element and the look chosen separately.

Extends `HelixElement`.

Two properties, and they answer different questions. `as` is the element,
which decides the document outline and what a screen reader announces.
`appearance` is the treatment, which decides size, weight, leading, and
tracking together.

They are separate because they genuinely come apart: a section's second
heading sometimes has to look smaller without lying about the outline, and a
`<p>` sometimes has to read as a caption. They default to matching, so the
common case is `as="h2"` and nothing else.

The pairing is resolved in CSS rather than by computing an attribute, so the
element writes nothing to its own host: `as="h2"` picks up the heading ramp
through a selector, and setting `appearance` takes the pairing rule out of
play. Deriving it in `willUpdate` worked, but it put an attribute on the host
that the server's markup did not have, which is a hydration mismatch in every
React consumer.

**Size, weight, and leading are not properties.** Exposing them separately
offers a few hundred combinations of which a handful are right, and every
caller then picks one. An appearance is a decision the system already made:
the ramp is named, and a page built from it is consistent because there was
nothing else to choose.

`tone` stays separate, because color carries state rather than typography.
Folding it in would mean `caption-danger` and `label-primary` and the rest of
the cross product, which is the explosion `appearance` exists to prevent.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `\| 'display'
    \| 'heading'
    \| 'subheading'
    \| 'title'
    \| 'body'
    \| 'body-strong'
    \| 'caption'
    \| 'label'
    \| 'code' \| undefined` | - | - | Type treatment. Defaults to the one that matches `as`. |
| `as` | `as` | `'span' \| 'p' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'strong' \| 'em' \| 'code' \| 'label' \| undefined` | - | - | Which element to render. Decides the outline and the semantics. |
| `tone` | `tone` | `'default' \| 'muted' \| 'subtle' \| 'primary' \| 'danger' \| undefined` | - | - | Color role. Separate from `appearance`, because color carries state. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The text. |

#### Parts

| Part | Description |
| --- | --- |
| `text` | The rendered element. |

## Textarea

### Root — `helix-textarea`

Several lines of text a reader types into.

Extends `HelixBaseTextarea`.

The same frame an `Input` wears, so a form of mixed fields reads as one set
rather than as two kinds of box. What differs is the resize handle, which is
the platform's and is left alone on the block axis only: a field that can be
dragged wider than the form holding it is a field that breaks the layout.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `autoGrow` | `auto-grow` | `boolean` | `false` | `HelixBaseTextarea` | Whether the box follows its own content rather than scrolling. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `maxLength` | `maxlength` | `number \| undefined` | - | `HelixBaseTextarea` | Most characters the value may have. |
| `minLength` | `minlength` | `number \| undefined` | - | `HelixBaseTextarea` | Fewest characters the value may have. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `placeholder` | `placeholder` | `string` | `''` | `HelixBaseTextarea` | Shown while the field is empty. Not a label: it goes when typing starts. |
| `readOnly` | `read-only` | `boolean` | `false` | `HelixBaseTextarea` | Whether the field refuses input while still submitting its value. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `rows` | `rows` | `number` | `3` | `HelixBaseTextarea` | How many lines the box is before anything is typed. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseTextarea` | Focus is delegated to the control, so the host is never the target. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseTextarea` | Puts the caret in the field, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired as the text changes, and cancelable. |
| `change` | `Event` | Relayed from the textarea once the reader has finished. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box holding the control. |
| `control` | The textarea itself. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--textarea-background-color` | Fill behind the text. |

## Toast

### Root — `helix-toast`

The region messages arrive in, and the only thing that announces them.

Extends `HelixBaseToast`.

Fixed to the window, and it catches nothing: the region spans a whole edge,
so a stack of one message in a corner would otherwise put an invisible bar
across everything beside it. The region is transparent to a pointer and the
messages take it back.

**It belongs at the root of the application.** `position: fixed` is
positioned against the viewport only while no ancestor carries `transform`,
`filter`, `perspective` or `contain`, any of which makes that ancestor the
containing block instead, and it is still clipped by an ancestor with
`overflow: hidden`. That is a real constraint rather than a style note, and
it is the same fact that put every other floating surface in this library
into the top layer.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `'Notifications'` | `HelixBaseToast` | Accessible name for the region, such as "Notifications". |
| `placement` | `placement` | `\| 'bottom-center'
    \| 'bottom-end'
    \| 'bottom-start'
    \| 'top-center'
    \| 'top-end'
    \| 'top-start'` | `'bottom-end'` | `HelixBaseToast` | Which corner or edge the stack sits at. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The messages, as `helix-toast-item` elements. |

#### Parts

| Part | Description |
| --- | --- |
| `region` | The stack the messages are in. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--toast-inset` | Distance from the edges of the window. |
| `--toast-gap` | Space between one message and the next. |
| `--toast-inline-size` | Width of a message. |

### Item — `helix-toast-item`

One message in the toast region.

Extends `HelixBaseToastItem`.

A surface with a shadow, because a toast sits over whatever the reader was
looking at rather than in it. The severity is a bar down the leading edge and
not a fill: a message is text to be read, and a colored panel behind it
costs contrast for something the mark already says.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `dismissible` | `dismissible` | `boolean` | `false` | `MixinDismissible` | Whether it offers a control to take it away. |
| `dismissLabel` | `dismiss-label` | `string` | `'Dismiss'` | `MixinDismissible` | Accessible name for that control. |
| `duration` | `duration` | `number \| undefined` | - | `HelixBaseToastItem` | How long it stays, in milliseconds. Absent means until it is dismissed. |
| `open` | `open` | `boolean` | - | `HelixBaseToastItem` | Whether the message is still showing. |
| `severity` | `severity` | `'danger' \| 'info' \| 'success' \| 'warning' \| undefined` | - | `HelixBaseToastItem` | What kind of message it is, which picks the mark and its name. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `dismiss()` | `MixinDismissible` | Announces that it should go, and reports whether the request stood. |
| `pause()` | `HelixBaseToastItem` | Stops the clock, leaving whatever is left of it. |
| `resume()` | `HelixBaseToastItem` | Starts it again from where it stopped. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-dismiss` | `HelixDismissEvent` | Fired when it asks to go, whether by the control or by its timer. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The message. |
| `actions` | What to do about it, usually a button or a link. |
| `icon` | Replaces the severity mark. Matches `Callout`, which is why the dismiss control's own glyph is `dismiss-icon` rather than this: two slots cannot share a name, assignment goes to whichever comes first in the tree, and the severity mark is the one a consumer reaches for. |
| `dismiss-icon` | Replaces the glyph inside the dismiss control. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The message's own surface. |
| `icon` | The severity mark, where the message has one. |
| `content` | The message. |
| `actions` | The region holding what to do about it. |
| `dismiss` | The control that asks to close. |
| `timer` | The bar showing how long is left, where a duration was given. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--toast-item-inset` | Space between the message's edge and its contents. |

## Toggle

### Root — `helix-toggle`

One option in a toggle group.

Extends `HelixBaseToggle`.

Carries no background of its own. The selected look comes from the group's
indicator sitting behind it, which is what lets that marker travel instead of
one fill appearing as another disappears.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseToggle` | Whether the item can be chosen. |
| `focusable` | - | `boolean` | `false` | `HelixBaseToggle` | Whether this item holds the group's tab stop while nothing is chosen. |
| `selected` | `selected` | `boolean` | `false` | `HelixBaseToggle` | Whether this item is the current one. |
| `value` | `value` | `string` | `''` | `HelixBaseToggle` | Identifies the item to the group. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focusItem()` | `HelixBaseToggle` | Moves focus to this item. |
| `select()` | `HelixBaseToggle` | Chooses this item and announces it. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the item is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The item's label. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The button or anchor. |

### Group — `helix-toggle-group`

A row of options with the selection marked by a moving indicator.

Extends `HelixBaseToggleGroup`.

The indicator travels between items rather than the fill swapping. A fill
that appears on one item as it disappears from another is two changes at once
and reads as a flicker; one object moving is something the eye follows, and
it says where the selection came from as well as where it went.

It animates `translate` and `inline-size`. Width is a layout property and the
rule is transform and opacity only, but the indicator is out of flow, so
animating its width reflows nothing else. Scaling instead would distort the
corner radius, which is worse than the exception.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'filled' \| 'plain' \| undefined` | - | - | How much chrome the group carries around its items. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `onValueChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerValue` | The consumer's callback, invoked after the value is applied. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired before the answer moves, and cancelable. The only way to refuse one. |
| `helix-select` | `HelixSelectEvent` | Fired when an item is chosen. Dispatched by the item and listened for here. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The group's items. |

#### Parts

| Part | Description |
| --- | --- |
| `indicator` | The moving marker behind the selected item. |
| `track` | The bar the items sit in. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--toggle-group-indicator-color` | Fill of the moving marker. |

## Toolbar

### Root — `helix-toolbar`

A group of controls that share one tab stop.

Extends `HelixBaseToolbar`.

No chrome of its own: a toolbar is a place controls sit, and a border around
them would be a second frame inside whatever already frames the bar.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `'Toolbar'` | `HelixBaseToolbar` | Accessible name for the toolbar. |
| `orientation` | `orientation` | `'horizontal' \| 'vertical' \| undefined` | - | `HelixBaseToolbar` | Which way the arrow keys move. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The toolbar's controls. |

#### Parts

| Part | Description |
| --- | --- |
| `toolbar` | The toolbar container. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--toolbar-gap` | Space between controls. |

## Tooltip

### Root — `helix-tooltip`

A short description that appears beside what it describes.

Extends `HelixBaseTooltip`.

The bubble is in the top layer, so it needs no `z-index` and cannot be
clipped by whatever it sits inside.

The arrow is positioned by the same pass that positions the bubble, so it
still points at the trigger after the bubble has slid along to stay in view.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `content` | `content` | `string` | `''` | `HelixBaseTooltip` | The text shown in the bubble. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `delay` | `delay` | `number` | `400` | `HelixBaseTooltip` | How long the pointer must rest before the bubble appears, in milliseconds. |
| `delayOut` | `delay-out` | `number` | `100` | `HelixBaseTooltip` | How long the bubble stays after the pointer leaves, in milliseconds. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseTooltip` | Whether the tooltip never shows. |
| `for` | `for` | `string` | `''` | `HelixBaseTooltip` | The id of the element this describes, in this tooltip's own tree. |
| `offset` | `offset` | `number` | `8` | `HelixBaseTooltip` | Space between the trigger and the bubble, in pixels. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placement` | `placement` | `Placement` | `'top'` | `HelixBaseTooltip` | Preferred side. It moves if that side does not fit. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `hide()` | `HelixBaseTooltip` | Hides the bubble. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `show()` | `HelixBaseTooltip` | Shows the bubble, unless there is nothing to show. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-open` | `HelixOpenEvent` | Fired before the bubble shows, and cancelable. |
| `helix-close` | `HelixCloseEvent` | Fired before it hides, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The trigger. |
| `content` | The bubble's content, when `content` is not enough. Anything slotted here replaces the property, which is this slot's fallback. |

#### Parts

| Part | Description |
| --- | --- |
| `tooltip` | The bubble. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--tooltip-background-color` | Fill of the bubble. |
| `--tooltip-max-inline-size` | Widest the bubble grows before wrapping. |

## Tree

### Root — `helix-tree`

A tree of items, navigable entirely from the keyboard.

Extends `HelixBaseTree`.

Quiet by default: no rules between rows and no fill except on the selected
item. A navigation tree is read by scanning, and every line of chrome added
to it is one more thing between the reader and the label.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `active` | `active` | `string` | - | `MixinControllerActive` | Which item is current, by its `value`. |
| `chevron` | `chevron` | `'end' \| undefined` | - | `HelixBaseTree` | Which end of a row the chevron sits at. |
| `defaultActive` | `default-active` | `string` | `''` | `MixinControllerActive` | Initial item for uncontrolled use. Ignored once `active` is written. |
| `label` | `label` | `string` | `'Tree'` | `HelixBaseTree` | Accessible name for the tree. |
| `onActiveChange` | - | `((value: string) => void) \| undefined` | `undefined` | `MixinControllerActive` | The consumer's callback, invoked after the change is applied. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `requestActive()` | `MixinControllerActive` | Requests a new current item, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. |
| `helix-change` | `HelixChangeEvent` | Fired before the current node moves, and cancelable. The only way to refuse one. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The tree's items. |

#### Parts

| Part | Description |
| --- | --- |
| `tree` | The tree container. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--tree-indent` | Indent added per level. |
| `--tree-chevron-size` | Size of the chevron, and the gutter a leaf reserves. |
| `--tree-gap` | Space between rows. |
| `--tree-row-size` | Least height of a row, so rows with and without an icon match. |

### Item — `helix-tree-item`

One node in a tree.

Extends `HelixBaseTreeItem`.

Indent comes from the `level` the tree sets, as a multiple of one hook, so a
node moved to another depth re-indents without any nested selector. Nesting
selectors by depth is the usual approach and stops working at whatever depth
nobody wrote a rule for.

The twisty rotates rather than swapping glyphs, so opening a branch is a
short movement instead of a substitution. Motion carries the state change;
the row itself stays flat.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `focusable` | - | `boolean` | `false` | `HelixBaseTreeItem` | Whether this item holds the tree's single tab stop. |
| `isBranch` | - | `boolean` | - | `HelixBaseTreeItem` | Whether this node has children. |
| `level` | `level` | `number \| undefined` | - | `HelixBaseTreeItem` | Depth from the root, set by the tree so indentation needs no CSS nesting. |
| `onOpenChange` | - | `((open: boolean) => void) \| undefined` | `undefined` | `MixinControllerOpen` | The consumer's callback, invoked after the state is applied. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `selected` | `selected` | `boolean` | `false` | `HelixBaseTreeItem` | Whether this item is the current one. |
| `value` | `value` | `string` | `''` | `HelixBaseTreeItem` | Identifies the item to the consumer, carried in `helix-select`. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focusItem()` | `HelixBaseTreeItem` | Moves focus to this node. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `select()` | `HelixBaseTreeItem` | Selects this node and announces it. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the item is chosen. |
| `helix-open` | `HelixOpenEvent` | Fired before a branch opens, and cancelable. |
| `helix-close` | `HelixCloseEvent` | Fired before a branch closes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The item's label. |
| `children` | Nested items, which make this a branch. |
| `start` | Before the label, after the chevron. A mark about the item. |
| `end` | After the label, at the row's far side. A count, or a state. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The node, and the focus target. |
| `row` | The clickable label row. |
| `toggle` | The expand and collapse control. |
| `label` | The label text. |
| `group` | The container for nested items. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--tree-indent` | Indent added per level. |
| `--tree-chevron-size` | Size of the chevron, and the gutter a leaf reserves. |
| `--tree-gap` | Space between rows. |
| `--tree-row-size` | Least height of a row, so rows with and without an icon match. |
