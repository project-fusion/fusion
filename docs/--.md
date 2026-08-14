# Component Reference

## BaseAccordion

### Root

A set of stacked, expandable sections.

#### Properties

| Property | Attribute | Type                                            | Default      | Inherited From | Description                         |
| -------- | --------- | ----------------------------------------------- | ------------ | -------------- | ----------------------------------- |
| `mode`   | `mode`    | `"multiple" \| "single"\| "single-collapsible"` | `"multiple"` | -              | How many items may be open at once. |

#### Slots

| Slot        | Description |
| ----------- | ----------- |
| _(default)_ | content     |

### Item

A single expandable section.

| Property               | Attribute           | Type                                   | Default  | Inherited From        | Description                                                             |
| ---------------------- | ------------------- | -------------------------------------- | -------- | --------------------- | ----------------------------------------------------------------------- |
| `chevronPlacement`     | `chevron-placement` | `"auto" \| "start" \| "end" \" "none"` | `"auto"` | -                     | Chevron placement.                                                      |
| `disabled`             | `disabled`          | `boolean`                              | `false`  | -                     | Whether the item is disabled.                                           |
| `currentOpen`          | -                   | `boolean`                              | -        | `MixinControllerOpen` | Setter for the current open state. Handles logic based on control mode. |
| `defaultOpen`          | `default-open`      | `boolean`                              | `false`  | `MixinControllerOpen` | Default open state in uncontrolled mode.                                |
| `onOpenChange`         | -                   | `(open: boolean) => void \| undefined` | -        | `MixinControllerOpen` | Called when the open state changes.                                     |
| `onOpenChangeComplete` | -                   | `(open: boolean) => void \| undefined` | -        | `MixinControllerOpen` | Called when the open change completes.                                  |
| `open`                 | `open`              | `boolean \| undefined`                 | -        | `MixinControllerOpen` | Controlled open. Defined enables controlled mode.                       |

#### Events

| Event          | Type                             | Description                                                     |
| -------------- | -------------------------------- | --------------------------------------------------------------- |
| `helix-toggle` | `CustomEvent<{ open: boolean }>` | Emitted when the item is toggled open or closed (non-bubbling). |

#### Methods

| Method          | Mixin                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requestOpen()` | _(MixinControllerOpen)_ | Dispatches a cancelable `helix-open` / `helix-close` event. If not prevented, sets currentOpen. Use for user-initiated state changes (click, keyboard, external triggers). Returns true if the state change was applied or already in target state, false if prevented. Non-bubbling and non-composed: overlays nest, so an inner overlay's open/close must never leak past its wrapper to an outer one. Listen for these directly on the element (or its generated `onOpen` / `onClose` prop). |
| `toggleOpen()`  | _(MixinControllerOpen)_ | Convenience method to toggle the open state via cancelable event.                                                                                                                                                                                                                                                                                                                                                                                                                               |

#### Slots

| Slot        | Description                                   |
| ----------- | --------------------------------------------- |
| _(default)_ | Item content.                                 |
| `caption`   | Secondary descriptive text below the summary. |
| `chevron`   | Override the disclosure chevron.              |
| `prefix`    | Content before the summary.                   |
| `suffix`    | Content after the summary.                    |
| `summary`   | Summary content.                              |

#### CSS Parts

| Part              | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| `content`         | Collapsible content container.                                      |
| `content-slot`    | Collapsible wrapper around the content slot.                        |
| `chevron`         | Default disclosure chevron.                                         |
| `root`            | Outer container.                                                    |
| `summary`         | Summary trigger element.                                            |
| `summary-content` | Container wrapping the summary and caption slots.                   |
| `summary-text`    | Inline container wrapping the summary slot and auto-placed chevron. |

## BaseAppHeader

### Root

Headless app header with start, content, and end slot regions.

#### Slots

| Slot        | Description       |
| ----------- | ----------------- |
| _(default)_ | Content.          |
| `start`     | Leading content.  |
| `end`       | Trailing content. |

#### CSS Parts

| Part      | Description                     |
| --------- | ------------------------------- |
| `root`    | The app bar header container.   |
| `start`   | The start region wrapper.       |
| `content` | The center/main region wrapper. |
| `end`     | The end region wrapper.         |

## BaseAppSwitcher

### Root

Headless app-switcher with floating dropdown, search filtering, and view toggle.

#### Properties

| Property | Attribute | Type | Default | Inherited From | Description |
| -------- | --------- | ---- | ------- | -------------- | ----------- |
|          |           |      |         | -              |             |

## BaseAvatar

### Root

The avatar's root is the container, owns the accessible name, and coordinates the image and fallback. 

#### Properties

| Property | Attribute | Type                  | Default | Inherited From | Description                                                                                                |
| -------- | --------- | --------------------- | ------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `label`  | `label`   | `string \| undefined` | -       | -              | Accessible name for the avatar. Overrides the image's `alt`, and provides the name when there is no image. |

#### Slots

| Slot        | Description      |
| ----------- | ---------------- |
| _(default)_ | Default content. |

#### CSS Parts

| Part   | Description                                    |
| ------ | ---------------------------------------------- |
| `root` | The container that wraps the avatar's content. |

### Fallback

> this may could just be a slot in the root?

Headless avatar fallback shown when the avatar has no loaded image.

#### Slots

| Slot        | Description      |
| ----------- | ---------------- |
| _(default)_ | Default content. |

#### CSS Parts

| Part       | Description                                    |
| ---------- | ---------------------------------------------- |
| `fallback` | The container that wraps the fallback content. |

### Image

> this may could just be a slot in the root?

Headless avatar image loads `src` and reports its status and `alt` to the avatar root.

#### Properties

| Property | Attribute | Type                  | Default | Inherited From | Description                                          |
| -------- | --------- | --------------------- | ------- | -------------- | ---------------------------------------------------- |
| `alt`    | `alt`     | `string \| undefined` | -       | -              | Alternative text contributed as the accessible name. |
| `src`    | `src`     | `string \| undefined` | -       | -              | Image source.                                        |

#### Events

| Event                         | Type                                                                                | Description                               |
| ----------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| `helix-loading-status-change` | `CustomEvent<{ alt?: string; status: "error" \| "idle" \| "loaded" \| "loading" }>` | Fired when the image load status changes. |

#### CSS Parts

| Part    | Description               |
| ------- | ------------------------- |
| `image` | The native image element. |


## BaseBadge

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

## BaseBanner

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