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