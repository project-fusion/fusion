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
| `tone` | `tone` | `'danger' \| 'info' \| 'neutral' \| 'primary' \| 'success' \| 'surface' \| 'warning' \| undefined` | - | `HelixBaseAnnouncement` | Which color the band wears. |

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
| `--app-header-backdrop` | The filter behind it. `none` to pair it with a panel. |
| `--app-header-border-color` | The line under the bar. None by default. |
| `--app-header-height` | Height of the banner. |
| `--app-header-inset` | Inline padding of the banner. |
| `--app-header-max-inline-size` | Width the content is centered in. |

## Aura

### Root — `helix-aura`

A lit, drifting background, drawn from the token layer.

Extends `HelixElement`.

One fragment shader over a full-screen triangle, with the palette read from
the tokens rather than given as colors. That is the whole reason this belongs
in a design system instead of in a page: a background written with hex values
is an asset that has to be re-cut when the brand moves, and one written
against `--helix-color-primary` is a consequence of it.

**Every shape ramps through four token stops**, and the token layer inverts
each of them: the page's own background, `primary-subtle`, `primary`, and
then a peak. The peak is the foreground on a dark page and `primary-active`
on a light one, because mixing a saturated hue toward near-black takes the
chroma out of exactly the pixels carrying the most of it. Which way the page
runs is not asked of the mode, which is a private token: it is read off the
ground's own luminance, which the shader already has.

**No dependency, and no scene graph.** The geometry is three vertices derived
from `gl_VertexID`, so there is no attribute, no buffer and no upload. The
common implementations of this reach for a 3D library to draw one quad, which
is a camera and a material system for four vertices that never move.

**It stops when nobody is looking**, off screen and in a background tab, and
`prefers-reduced-motion` gets one still frame rather than an empty box: the
composition is the point and the drift is a garnish.

**A layer over an interactive aura has to let the pointer through.** The
element is hit-testable only when `interactive` is set, because a background
that swallows clicks is worse than one that does nothing, but a scrim or an
overlay a consumer paints on top will absorb the move before it arrives. Any
decorative layer above this wants `pointer-events: none`. It has already
caught this repository's own bench once.

**The fallback needs no detection.** Where WebGL is refused the canvas never
paints and is transparent, and the host carries a gradient of the same tokens
underneath. Nothing has to ask whether it worked.

Presentation only, so there is no headless tier: the split exists to keep
behavior separate from styling, and there is no structure or semantics here
to separate. Decorative, so the host is hidden from assistive technology and
takes no pointer events.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `bloom` | `bloom` | `number` | `0.5` | - | How soft the falloff is, `0` tight and `1` diffuse. |
| `drift` | `drift` | `number` | `0` | - | How far the settings wander on their own, `0` still and `1` restless. |
| `gain` | `gain` | `number` | `1` | - | Overall brightness, as a multiplier on the field. |
| `interaction` | `interaction` | `'light' \| 'none' \| 'ripple' \| 'shadow' \| undefined` | - | - | What the pointer does, where the shape's own answer is not wanted. |
| `interactive` | `interactive` | `boolean` | `false` | - | Whether the pointer shifts and lifts the field. |
| `reach` | `reach` | `number` | `1` | - | How far the pointer reaches into the field, `0` upward. |
| `scale` | `scale` | `number` | `1` | - | Feature size, as a multiplier on the sampled coordinates. |
| `shape` | `shape` | `\| 'aurora'
    \| 'braid'
    \| 'flow'
    \| 'particles'
    \| 'prism'
    \| 'rays'
    \| 'streaks'
    \| 'threads'
    \| 'waves' \| undefined` | - | - | Which form the light takes. Absent is `braid`. |
| `speed` | `speed` | `number` | `1` | - | How fast it drifts, as a multiplier on time. |
| `tilt` | `tilt` | `number` | `14` | - | The field's rotation, in degrees. |
| `variance` | `variance` | `number` | `1` | - | How much the members of a population differ from one another, `0` a set that is uniform and `1` the resting amount. Clamped to that range: these are interpolations, so a larger number extrapolates rather than exaggerating, and a streak whose length has passed through zero is drawn as a bar across the whole frame. |

#### Parts

| Part | Description |
| --- | --- |
| `canvas` | The surface the shader draws into. |

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
| `href` | `href` | `string` | `''` | `HelixBaseBreadcrumb` | Where the crumb goes, and nothing where it is the current page. |
| `rel` | `rel` | `string` | `''` | `HelixBaseBreadcrumb` | What the link declares about where it goes. The consumer's decision. |
| `target` | `target` | `string` | `''` | `HelixBaseBreadcrumb` | Where the link opens, for the rare crumb that leaves the site. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The step: a link, or the text of the current page. |
| `separator` | Replaces the chevron shown before this item. |
| `start` | Before the label, for an icon. |
| `end` | After it, for a count or a mark. |

#### Parts

| Part | Description |
| --- | --- |
| `separator` | The separator preceding the item. |
| `link` | The crumb itself, which is an `<a>` where `href` is set. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--breadcrumbs-separator-color` | Color of the chevron. |
| `--breadcrumb-hover-color` | Fill behind a step under the pointer. |
| `--breadcrumb-control-size` | How tall a control slotted into a crumb is. |

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
| `appearance` | `appearance` | `'ghost' \| 'outlined' \| 'solid' \| 'subtle' \| undefined` | - | - | How much of its colour the button wears, which is how much it matters. |
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
| `tone` | `tone` | `'danger' \| 'neutral' \| 'primary' \| undefined` | - | - | What the button means, which decides its colour and nothing else. |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | `HelixBaseButton` | What activating the button does to its form. |
| `variant` | `variant` | `'danger' \| 'primary' \| 'secondary' \| 'tertiary' \| undefined` | - | - | One word for the four pairings anybody actually writes. |

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
| `--button-radii-start` | Leading corners, which a group flattens. |
| `--button-radii-end` | Trailing corners, which a group flattens. |

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

## Callout

### Root — `helix-callout`

Sets a passage apart as information, a warning, or an error.

Extends `HelixBaseCallout`.

Tinted from the severity's status color with `color-mix`, and marked with a
bar on the inline start so the severity survives being read in grayscale or
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
| `helix-toggle` | `HelixToggleEvent` | Fired before the state changes, and cancelable. |
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
| `--checkbox-border-color` | Edge of the box, in every state. |
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
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `orientation` | `orientation` | `'horizontal' \| undefined` | - | - | Which way the boxes run. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `value` | `value` | `string` | `''` | `HelixBaseCheckboxGroup` | The checked values, comma separated. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |

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

## Code

### Root — `helix-code`

A fragment of code inside a line of prose.

Extends `HelixBaseCode`.

A step down the scale, because a monospace face reads larger than the prose
around it at the same nominal size. `--code-size` overrides it.

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The code. |

#### Parts

| Part | Description |
| --- | --- |
| `code` | The `<code>` element. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--code-size` | The fragment's size. Defaults to `text-sm`. |

## Code Block

### Root — `helix-code-block`

A block of code, with somewhere to put its name and a way to take it.

Extends `HelixBaseCodeBlock`.

The header sits above the code rather than floating on it. Overlaid, which is
the usual build, the copy button covers the first line, which is the one line
of a snippet a reader is most likely to be reading.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `''` | `HelixBaseCodeBlock` | What to call this block, usually a file name or a language. |
| `noCopy` | `no-copy` | `boolean` | `false` | `HelixBaseCodeBlock` | Whether to leave the copy button off. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The code. |

#### Parts

| Part | Description |
| --- | --- |
| `block` | The scrolling `<pre>`. |
| `code` | The `<code>` inside it. |
| `frame` | The code and the copy button beside it. |
| `header` | The bar carrying the name, where there is one. |
| `copy` | The copy button. |
| `label` | The file name or language, where one is given. |

## Color Input

### Root — `helix-color-input`

A color, typed in any syntax or picked from a panel.

Extends `HelixBaseColorInput`.

The frame is the field rather than the input, so the trigger sits inside the
same box as the text and the focus ring is drawn once around the whole
control.

**The trigger fills the trailing end rather than sitting in it as an icon.** A
color field has one thing to show and it is a color, so the swatch takes the
height of the control and reads as a block of it. It is the one field here
whose trailing affordance is the value itself: Date Input's calendar mark
stands for an action, and an action stretched to field height is a large icon
and nothing more.

**The panel has no padding, and clips instead.** The square runs to its edge
and takes the panel's rounded corners from being clipped by it, rather than
sitting inset with a band of overlay showing on all four sides. The picker
pads its own lower rows.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `alpha` | `alpha` | `boolean` | `false` | `HelixBaseColorInput` | Whether the color carries an alpha channel. |
| `appearance` | `appearance` | `'swatch' \| undefined` | - | `HelixBaseColorInput` | Whether the field is a text box with a swatch on it, or only the swatch. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `format` | `format` | `ColorFormat` | `'hex'` | `HelixBaseColorInput` | The syntax the value is written in: `hex`, `rgb` or `hsl`. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `noFormat` | `no-format` | `boolean` | `false` | `HelixBaseColorInput` | Whether the reader may change the format from the panel. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placeholder` | `placeholder` | `string` | `'#000000'` | `HelixBaseColorInput` | What the field says before a color is in it. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `swatches` | `swatches` | `string` | `''` | `HelixBaseColorInput` | Colors offered under the picker, as a comma-separated list. |
| `triggerLabel` | `trigger-label` | `string` | `'Choose a color'` | `HelixBaseColorInput` | Accessible name for the control that opens the panel. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseColorInput` | Puts the caret in the field, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the color changes. |
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
| `control` | The text input carrying the value. Absent in `swatch`. |
| `trigger` | The control that opens the panel. |
| `preview` | The chip showing the color, inside the trigger. |
| `surface` | The floating panel. |
| `picker` | The color picker inside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--color-input-background-color` | Fill behind the field. |
| `--color-input-swatch-size` | Edge length of the block in `appearance="swatch"`. |
| `--color-input-swatch-radii` | Corner radius of that block. |
| `--color-input-panel-size` | Width of the panel, and so of the square. |

## Color Picker

### Root — `helix-color-picker`

Picks a color, from a square and two ramps.

Extends `HelixBaseColorPicker`.

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

**Every chip sits on a checkerboard.** A color with alpha painted on a solid
background is just a different color, and the one thing a preview owes a
reader is the difference between "pale blue" and "blue, half transparent".

No padding and no surface of its own. Flat on a page it takes the space it is
given, and in Color Input's panel the panel supplies both: a picker that
brought its own card would be a card inside a card there.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `alpha` | `alpha` | `boolean` | `false` | `HelixBaseColorPicker` | Whether the color carries an alpha channel. |
| `color` | - | `Color` | - | `HelixBaseColorPicker` | Where the picker stands: what was moved, or what the value says, or the start. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `format` | `format` | `ColorFormat` | `'hex'` | `HelixBaseColorPicker` | The syntax the value is written in: `hex`, `rgb` or `hsl`. |
| `invalid` | `invalid` | `boolean` | `false` | `HelixBaseColorPicker` | Whether the current selection fails validation. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `noEyedropper` | `no-eyedropper` | `boolean` | `false` | `HelixBaseColorPicker` | Whether the eyedropper is offered where the browser has one. |
| `noFormat` | `no-format` | `boolean` | `false` | `HelixBaseColorPicker` | Whether the reader may change the format. |
| `noValue` | `no-value` | `boolean` | `false` | `HelixBaseColorPicker` | Whether to leave the value out, for a picker whose value is stated elsewhere. |
| `swatches` | `swatches` | `string` | `''` | `HelixBaseColorPicker` | Colors offered under the picker, as a comma-separated list. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseColorPicker` | Puts the keyboard on the square, which is the control a reader wants. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the color changes. |
| `helix-copy` | `HelixCopyEvent` | Fired when the color is put on the clipboard. |

#### Parts

| Part | Description |
| --- | --- |
| `grid` | The saturation and brightness square. |
| `grid-handle` | The mark showing where in the square the color sits. |
| `grid-saturation` | The range input for the square's horizontal axis. |
| `grid-brightness` | The range input for its vertical axis. |
| `controls` | The row under the square. |
| `sample` | The chip of the current color, which copies it when pressed. |
| `channels` | The ramps beside it. |
| `channel` | One ramp. |
| `actions` | The group holding the eyedropper and the syntax toggle. |
| `eyedropper` | The control that samples a color from the screen. |
| `footer` | The row holding the value and the tools. |
| `value` | The color as text, which can be typed or pasted. |
| `format` | The control that changes the syntax the value is written in. |
| `swatches` | The row of presets. |
| `swatch` | One preset. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--color-picker-inset` | Inset of the rows under the square, and the bottom. |
| `--color-picker-sample-size` | Edge length of the chip that copies the value. |
| `--color-picker-swatch-size` | Edge length of one preset. |
| `--color-picker-grid-ratio` | Aspect ratio of the square. |
| `--color-picker-grid-radii` | Corner radius of the square. |

## Combobox

### Root — `helix-combobox`

A field that filters a list as it is typed into.

Extends `HelixBaseCombobox`.

The frame is the field rather than the input, so the caret, the marks and the
focus ring are drawn once around the whole control, which is the arrangement
Input, Color Input and Date Input all take.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `creatable` | `creatable` | `boolean` | `false` | `HelixBaseCombobox` | Whether the reader may answer with something the list does not hold. |
| `createLabel` | `create-label` | `string` | `'Add'` | `HelixBaseCombobox` | What the create row says, before the words it would add. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `emptyText` | `empty-text` | `string` | `'No matches'` | `HelixBaseCombobox` | Words shown where the filter has hidden everything. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `listLabel` | `list-label` | `string` | `'Options'` | `HelixBaseCombobox` | Accessible name for the list, which has no visible one of its own. |
| `loading` | `loading` | `boolean` | `false` | `HelixBaseCombobox` | Whether the options are still on their way. |
| `loadingText` | `loading-text` | `string` | `'Loading'` | `HelixBaseCombobox` | What the list says while they are on their way. |
| `maxTags` | `max-tags` | `number` | `0` | `HelixBaseCombobox` | How many tags to draw before the rest become a count. `multiple` only. |
| `multiple` | `multiple` | `boolean` | `false` | `HelixBaseCombobox` | Whether more than one option can be chosen. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placeholder` | `placeholder` | `string` | `''` | `HelixBaseCombobox` | Text shown while nothing has been chosen. |
| `removeLabel` | `remove-label` | `string` | `'Remove'` | `HelixBaseCombobox` | What a tag's remove control is called, since the mark has no name. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `suggest` | `suggest` | `boolean` | `false` | `HelixBaseCombobox` | Whether the field finishes the word as it is typed. |
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
| `helix-change` | `HelixChangeEvent` | Fired when the chosen option changes. |
| `helix-create` | `HelixCreateEvent` | Fired when the reader asks for something the list does not hold, and cancelable. |
| `helix-open` | `HelixOpenEvent` | Fired when the panel opens. |
| `helix-close` | `HelixCloseEvent` | Fired when it closes. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The options, which are `helix-option` elements. |
| `start` | Before the text, for an icon. |
| `end` | After it, for a unit or a clear button. |
| `indicator` | Replaces the caret saying the field opens. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box around the text and its marks. |
| `control` | The text field itself. |
| `tags` | The row of chosen options, when `multiple` is set. |
| `tag` | One chosen option. |
| `rest` | The count of choices held beyond `max-tags`. |
| `create` | The row offering to add what was typed. |
| `indicator` | The caret. |
| `surface` | The floating panel. |
| `listbox` | The list inside it. |
| `items` | The scrolling box of options, forwarded from the listbox. |
| `empty` | What shows where the filter has hidden everything, forwarded from the listbox. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--combobox-background-color` | Fill behind the field. |
| `--combobox-control-size` | Smallest the text field shrinks to before it wraps below the tags. Defaults to `4ch`. |
| `--combobox-panel-size` | Width of the panel. Follows the field by default. |

## Command

### Root — `helix-command`

A list of commands, opened from anywhere and filtered by typing.

Extends `HelixBaseCommand`.

The palette is a dialog holding a filterable listbox, so what this tier adds
is where that dialog sits and how the list reads inside it. It opens against
the top of the window rather than centred, which is where every palette a
reader has used opens: a list that grows and shrinks as it is filtered would
otherwise walk up and down the screen under the words being typed.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `emptyText` | `empty-text` | `string` | `'No commands'` | `HelixBaseCommand` | Words shown where the filter has matched nothing. |
| `hotkey` | `hotkey` | `string` | `'mod+k'` | `HelixBaseCommand` | The key that opens it, as `mod+k` or `shift+p` or plain `k`. |
| `label` | `label` | `string` | `'Commands'` | `HelixBaseCommand` | Accessible name for the overlay, which has no visible heading. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placeholder` | `placeholder` | `string` | `'Search commands'` | `HelixBaseCommand` | Shown in the field before anything is typed. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when a command is chosen. |
| `helix-open` | `HelixOpenEvent` | Fired when the palette opens. |
| `helix-close` | `HelixCloseEvent` | Fired when it closes. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The commands, which are `helix-option` elements and their groups. |
| `footer` | Under the list, for the keys a reader can press. |

#### Parts

| Part | Description |
| --- | --- |
| `dialog` | The overlay's own box, forwarded from the dialog. |
| `listbox` | The list inside it. |
| `items` | The scrolling box of commands, forwarded from the listbox. |
| `empty` | What shows where the filter has hidden everything. |
| `search` | The region holding the field that narrows the list. |
| `search-field` | The field itself. |
| `footer` | The row under the list. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--command-size` | How wide the palette is. Defaults to `40rem`. |
| `--command-list-size` | How tall the list grows before it scrolls. |

## Copy Button

### Root — `helix-copy-button`

A button that puts a string on the clipboard and says it did.

Extends `HelixBaseCopyButton`.

Takes the icon button's square box, then stacks its two faces in one grid
cell so the press never changes the button's size. See the stylesheet: a
control that resizes under the pointer at the moment a reader is looking at
it for reassurance reads as a second, accidental press.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `command` | `command` | `string` | `''` | `HelixBaseButton` | What to send when the button is activated, and what to send it to. |
| `commandFor` | `commandfor` | `string` | `''` | `HelixBaseButton` | The id of the element the command is sent to. |
| `copiedLabel` | `copied-label` | `string` | `'Copied'` | `HelixBaseCopyButton` | What it is called, and says, after one. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `focusable` | - | `boolean` | `true` | `HelixBaseButton` | Whether the button holds its group's tab stop. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `'Copy'` | `HelixBaseButton` | What it is called, and says, before a press. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseButton` | Moves focus to the inner control, so the host is never the focus target. |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | `HelixBaseButton` | What activating the button does to its form. |
| `value` | `value` | `string` | `''` | `HelixBaseCopyButton` | What goes on the clipboard. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-copy` | `HelixCopyEvent` | Fired after the clipboard write succeeds. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The resting icon. Falls back to a clipboard. |
| `copied` | What replaces it once the write succeeds. Falls back to a check. |
| `start` | Content before the label, usually an icon. |
| `end` | Content after the label. |

#### Parts

| Part | Description |
| --- | --- |
| `tooltip` | The bubble, forwarded from the tooltip inside. |
| `button` | The inner button. |

## Date Input

### Root — `helix-date-input`

A date, typed or picked from a calendar.

Extends `HelixBaseDateInput`.

The frame is the field rather than the input, so the trigger sits inside the
same box as the text and the focus ring is drawn once around the whole
control. The trigger is a mark within that box rather than a button beside it:
a second frame inside the first is two controls where a reader sees one.

The calendar is the real `helix-date-picker`, in a panel with no border of its
own. A surface over the page is told apart by its shadow and by what it
covers, and a line around it as well reads as a box drawn around something
already separate.

Height comes from the region, like every other control: `data-density` on
whatever holds it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `dateStyle` | `date-style` | `'full' \| 'iso' \| 'long' \| 'medium' \| 'short'` | `'long'` | `HelixBaseDateInput` | How a date is written in the field: `short` through `full`, or ISO. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `disableDates` | `disable-dates` | `string` | `''` | `HelixBaseDateInput` | Dates that cannot be chosen, as a comma-separated `YYYY-MM-DD` list. |
| `disableDays` | `disable-days` | `string` | `''` | `HelixBaseDateInput` | Days of the week that cannot be chosen, `0` for Sunday through `6`. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `firstDayOfWeek` | `first-day-of-week` | `number` | `0` | `HelixBaseDateInput` | First column of the week in the calendar, `0` for Sunday through `6`. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `locale` | `locale` | `string` | `''` | `HelixBaseDateInput` | Language tag the calendar names its months and days in. |
| `max` | `max` | `string` | `''` | `HelixBaseDateInput` | Latest date that can be chosen, as `YYYY-MM-DD`. |
| `maxTags` | `max-tags` | `number` | `0` | `HelixBaseDateInput` | How many dates are shown as tags before the rest are counted, in `multiple`. |
| `min` | `min` | `string` | `''` | `HelixBaseDateInput` | Earliest date that can be chosen, as `YYYY-MM-DD`. |
| `mode` | `mode` | `'range' \| 'multiple' \| undefined` | - | `HelixBaseDateInput` | How many dates can be held at once. |
| `months` | `months` | `number` | `1` | `HelixBaseDateInput` | How many months the calendar shows, side by side. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placeholder` | `placeholder` | `string` | `'YYYY-MM-DD'` | `HelixBaseDateInput` | What the field says before a date is in it. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `triggerLabel` | `trigger-label` | `string` | `'Choose a date'` | `HelixBaseDateInput` | Accessible name for the control that opens the calendar. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseDateInput` | Puts the caret in the field, the way a label pointing at one would. |
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
| `date` | One held date, as a tag, in `multiple`. |
| `rest` | How many dates are held beyond the ones shown. |
| `trigger` | The control that opens the calendar. |
| `surface` | The floating panel. |
| `picker` | The date picker inside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--date-input-background-color` | Fill behind the field. |

## Date Picker

### Root — `helix-date-picker`

Shows a month, and takes a date from it.

Extends `HelixBaseDatePicker`.

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
| `defaultMonth` | `default-month` | `string` | `''` | `HelixBaseDatePicker` | Month to open on, where nothing declared one. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `disableDates` | `disable-dates` | `string` | `''` | `HelixBaseDatePicker` | Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. |
| `disableDays` | `disable-days` | `string` | `''` | `HelixBaseDatePicker` | Days of the week that cannot be chosen, comma separated, `0` to `6`. |
| `firstDayOfWeek` | `first-day-of-week` | `number` | `0` | `HelixBaseDatePicker` | First column of the week, `0` for Sunday through `6` for Saturday. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `invalid` | `invalid` | `boolean` | `false` | `HelixBaseDatePicker` | Whether the current selection fails validation. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `'Date Picker'` | `HelixBaseDatePicker` | Accessible name for the grid. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `locale` | `locale` | `string` | `''` | `HelixBaseDatePicker` | Locale for month and day names. Absent uses the runtime's own. |
| `max` | `max` | `string` | `''` | `HelixBaseDatePicker` | Latest selectable date, as `YYYY-MM-DD`. |
| `min` | `min` | `string` | `''` | `HelixBaseDatePicker` | Earliest selectable date, as `YYYY-MM-DD`. |
| `mode` | `mode` | `'range' \| 'multiple' \| undefined` | - | `HelixBaseDatePicker` | How many dates can be held at once. |
| `month` | `month` | `string` | - | `HelixBaseDatePicker` | The month on show, as `YYYY-MM`. Follows `value`, then the current month. |
| `months` | `months` | `number` | `1` | `HelixBaseDatePicker` | How many months to show, side by side. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `nextLabel` | `next-label` | `string` | `'Next month'` | `HelixBaseDatePicker` | Accessible name for the control that pages forward. |
| `previousLabel` | `previous-label` | `string` | `'Previous month'` | `HelixBaseDatePicker` | Accessible name for the control that pages back. |
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
| `--date-picker-columns` | Months per row. Two unless there is only one. |
| `--date-picker-day-size` | Width and height of a day. |
| `--date-picker-track-size` | Width of a column, which is what sets the space between days. |
| `--date-picker-row-size` | Height of a week row. |
| `--date-picker-selected-color` | Fill behind a selected day. |
| `--date-picker-range-color` | Band behind the days in a range. |

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
| `align` | `align` | `'center' \| 'start' \| undefined` | - | - | Whether the panel's contents run from the start or center on it. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `label` | `label` | `string` | `''` | `HelixBaseDialog` | Accessible name for the dialog. |
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
| `--divider-color` | Color of the rule. |
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
| `emptyText` | `empty-text` | `string` | `'Nothing to show'` | `MixinCollection` | What is said where there are none, and none are coming. |
| `label` | `label` | `string` | `'Navigation'` | `HelixBaseDrilldown` | Accessible name for the region. |
| `loading` | `loading` | `boolean` | `false` | `MixinCollection` | Whether the rows are still on their way. |
| `loadingText` | `loading-text` | `string` | `'Loading'` | `MixinCollection` | What is said while they are on their way. |

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

## File Input

### Root — `helix-file-input`

A control for choosing files, by pointer or by dropping them on it.

Extends `HelixBaseFileInput`.

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
| `accept` | `accept` | `string` | `''` | `HelixBaseFileInput` | Which files the picker offers, as a native `accept` list. |
| `capture` | `capture` | `'environment' \| 'user' \| undefined` | - | `HelixBaseFileInput` | Which camera or microphone a mobile picker should offer, if any. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `files` | - | `File[]` | - | `HelixBaseFileInput` | The files chosen, which is the element's own and never assigned. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `locale` | `locale` | `string` | `''` | `HelixBaseFileInput` | Language tag the sizes are written in. Absent uses the runtime's own. |
| `multiple` | `multiple` | `boolean` | `false` | `HelixBaseFileInput` | Whether more than one file can be chosen. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `removeLabel` | `remove-label` | `string` | `'Remove'` | `HelixBaseFileInput` | What the control removing one file is called, per file. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `triggerLabel` | `trigger-label` | `string` | `'Choose files'` | `HelixBaseFileInput` | What the trigger reads, where nothing is slotted into it. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `clear()` | `HelixBaseFileInput` | Takes every file back out. |
| `focus()` | `HelixBaseFileInput` | Puts focus on the input, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `HelixBaseFileInput` | Empties it, which is what a form reset means for a file input. |
| `removeAt()` | `HelixBaseFileInput` | Drops one file, by index. |

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
| `detail` | Its name and its reading, stacked. |
| `name` | Its name. |
| `meta` | The row holding its size and kind. |
| `size` | How big it is. |
| `kind` | What kind of file it is. |
| `remove` | The control that takes it back out. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--file-input-background-color` | Fill behind the field. |
| `--file-input-inset` | Padding inside the field. |

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
| `appearance` | `appearance` | `'ghost' \| 'outlined' \| 'solid' \| 'subtle' \| undefined` | - | - | How much of its colour the button wears. See `Button` for the full note. |
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
| `raised` | `raised` | `boolean` | `false` | - | Whether it is raised off the page it sits on. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseButton` | Moves focus to the inner control, so the host is never the focus target. |
| `shape` | `shape` | `'circle' \| undefined` | - | - | The outline it is cut to, which is a third axis and not a fourth appearance. |
| `tone` | `tone` | `'danger' \| 'neutral' \| 'primary' \| undefined` | - | - | What the button means, which decides its colour and nothing else. |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | `HelixBaseButton` | What activating the button does to its form. |
| `variant` | `variant` | `'danger' \| 'primary' \| 'secondary' \| 'tertiary' \| undefined` | - | - | One word for the four pairings. See `Button` for the full note. |

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
| `--icon-button-shadow` | What it casts, where it is raised off the page. |

## Image

### Root — `helix-image`

A picture that says whether it arrived.

Extends `HelixBaseImage`.

Presentation only: the box the picture is given, how it fills it, and the
fade when it lands. What the three states are and when they change is the
base class.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `alt` | `alt` | `string` | `''` | `HelixBaseImage` | What it shows, for a reader who cannot see it. |
| `fetchPriority` | `fetch-priority` | `'auto' \| 'high' \| 'low'` | `'auto'` | `HelixBaseImage` | How urgently to fetch it, for the one picture that is the page. |
| `loading` | `loading` | `'eager' \| 'lazy'` | `'lazy'` | `HelixBaseImage` | Whether to wait until it is nearly on screen. |
| `rounded` | `rounded` | `boolean` | `false` | - | Whether the corners are cut. |
| `sizes` | `sizes` | `string` | `''` | `HelixBaseImage` | How much of the line it will take, passed through to the picture. |
| `src` | `src` | `string` | `''` | `HelixBaseImage` | Where the picture is. |
| `srcset` | `srcset` | `string` | `''` | `HelixBaseImage` | The candidate widths, passed through to the picture. |
| `status` | `status` | `'error' \| 'loaded' \| 'loading'` | `'loading'` | `HelixBaseImage` | Whether the picture is on its way, here, or never coming. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-load` | `HelixLoadEvent` | The picture arrived. |
| `helix-error` | `HelixErrorEvent` | It is not coming. |

#### Slots

| Slot | Description |
| --- | --- |
| `placeholder` | Shown until the picture arrives. |
| `fallback` | Shown instead of it, if it never does. |

#### Parts

| Part | Description |
| --- | --- |
| `image` | The picture itself. |
| `placeholder` | What stands in until it arrives. |
| `fallback` | What stands in when it fails. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--image-aspect` | The ratio of the box, as `16 / 9`. |
| `--image-fit` | How the picture fills it. |
| `--image-position` | Which part survives a crop. |
| `--image-radius` | Corner radius, under `rounded`. |
| `--image-placeholder-color` | The resting surface behind both stand-ins. |

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
| `clearable` | `clearable` | `boolean` | `false` | `HelixBaseInput` | Whether the field offers a button that empties it. |
| `clearLabel` | `clear-label` | `string` | `'Clear'` | `HelixBaseInput` | What the clear button is called, since an icon has no name of its own. |
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
| `pattern` | `pattern` | `string` | `''` | `HelixBaseInput` | A regular expression the value has to match, as the platform reads it. |
| `placeholder` | `placeholder` | `string` | `''` | `HelixBaseInput` | Shown while the field is empty. Not a label: it goes when typing starts. |
| `readOnly` | `read-only` | `boolean` | `false` | `HelixBaseInput` | Whether the field refuses input while still submitting its value. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `reveal` | `reveal` | `boolean` | `false` | `HelixBaseInput` | Whether a password field offers a toggle that shows what was typed. |
| `revealLabel` | `reveal-label` | `string` | `'Show password'` | `HelixBaseInput` | What the reveal toggle is called. The state is `aria-pressed`, not this. |
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
| `helix-input` | `HelixInputEvent` | Fired as the text changes, and cancelable. |
| `change` | `Event` | Relayed from the input once the reader has finished. |

#### Slots

| Slot | Description |
| --- | --- |
| `start` | Before the text, for an icon or a prefix. |
| `end` | After the text, for an icon or a unit. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box holding everything. |
| `control` | The input itself. |
| `clear` | The button that empties the field. |
| `reveal` | The button that shows and hides a password. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--input-size` | Height of the field. |
| `--input-background-color` | Fill behind the text. |

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

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `href` | `href` | `string` | `''` | `HelixBaseListItem` | Where the row goes, and nothing when it goes nowhere. |
| `rel` | `rel` | `string` | `''` | `HelixBaseListItem` | What the link declares about where it goes. The consumer's decision rather than one derived from `target`, for the reason `Tree.Item` gives. |
| `target` | `target` | `string` | `''` | `HelixBaseListItem` | Where the link opens, for the rare row that leaves the site. |

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
| `emptyText` | `empty-text` | `string` | `'Nothing to show'` | `MixinCollection` | What is said where there are none, and none are coming. |
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
| `loading` | `loading` | `boolean` | `false` | `MixinCollection` | Whether the rows are still on their way. |
| `loadingText` | `loading-text` | `string` | `'Loading'` | `MixinCollection` | What is said while they are on their way. |
| `multiple` | `multiple` | `boolean` | `false` | `HelixBaseListbox` | Whether more than one option can be the answer. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
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
| `navigate()` | `HelixBaseListbox` | Runs the list's own key handling for a caller whose focus is elsewhere. |
| `requestFilter()` | `HelixBaseListbox` | Requests a narrowing, and reports whether the request stood. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `reveal()` | `HelixBaseListbox` | Brings the chosen option to rest in the middle of the list. |

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

## Loader

### Root — `helix-loader`

Says that something indeterminate is in progress.

Extends `HelixBaseLoader`.

Sized in `em`, so it matches whatever text it sits beside without being told.
The color is `currentColor` for the same reason: a loader inside a primary
button is on the accent, and one in body copy is not, and neither should have
to say so.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'pulse' \| undefined` | - | - | How the waiting is drawn. |
| `label` | `label` | `string` | `'Loading'` | `HelixBaseLoader` | Accessible name, announced while the work is outstanding. |
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
| `--loader-size` | Diameter. Defaults to 1.5em. |
| `--loader-color` | Color of the moving arc. |
| `--loader-track-color` | Color of the circle behind it. |

## Megamenu

### Root — `helix-megamenu`

A section of a navigation that opens a panel of destinations.

Extends `HelixBaseMegamenu`.

Presentation only: the trigger, and the panel it opens as a grid of columns.
Everything about what opens it and what closes it is the base class.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'full' \| undefined` | - | `HelixBaseMegamenu` | Whether the panel is a card under the trigger or a band across the page. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `fullBelow` | `full-below` | `number` | `640` | `HelixBaseMegamenu` | The width, in pixels, under which a card becomes a band. Zero never does. |
| `label` | `label` | `string` | `''` | `HelixBaseMegamenu` | The section's name, which names the default trigger and the panel. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `openOn` | `open-on` | `'click' \| 'hover'` | `'hover'` | `HelixBaseMegamenu` | Whether hovering the trigger opens the panel, or only a press does. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-open` | `HelixOpenEvent` | Fired before it opens, and cancelable. |
| `helix-close` | `HelixCloseEvent` | Fired before it closes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The panel's contents: the consumer's own lists and headings. |
| `trigger` | The control that opens it. Falls back to a button named by `label`. |

#### Parts

| Part | Description |
| --- | --- |
| `trigger` | The default trigger, where none was slotted. |
| `panel` | The region that opens. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--megamenu-background` | The panel's own fill. |
| `--megamenu-backdrop` | A filter behind the panel, for glass. |
| `--megamenu-size` | How wide the panel may get. |
| `--megamenu-column-size` | The narrowest a column goes before the grid wraps. |
| `--megamenu-full-size` | How wide the band's contents may get, centred in it. |

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
| `emptyText` | `empty-text` | `string` | `'Nothing to show'` | `MixinCollection` | What is said where there are none, and none are coming. |
| `label` | `label` | `string` | `'Menu'` | `HelixBaseMenu` | Accessible name for the surface. |
| `loading` | `loading` | `boolean` | `false` | `MixinCollection` | Whether the rows are still on their way. |
| `loadingText` | `loading-text` | `string` | `'Loading'` | `MixinCollection` | What is said while they are on their way. |
| `offset` | `offset` | `number` | `4` | `HelixBaseMenu` | Space between the trigger and the surface, in pixels. |
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
| `download` | `download` | `boolean` | `false` | `HelixBaseMenuItem` | Whether the link saves the file rather than opening it. |
| `hasSubmenu` | - | `boolean` | - | `HelixBaseMenuItem` | Whether anything was slotted into `submenu`. |
| `href` | `href` | `string` | `''` | `HelixBaseMenuItem` | Where the row goes, which makes it a real link. |
| `isMenuItem` | - | `boolean` | `true` | `HelixBaseMenuItem` | Marks this as a row a menu should count. Cheaper than an instanceof. |
| `onPage` | - | `boolean` | `true` | `HelixBaseMenuItem` | Whether this row is on the page currently showing. |
| `rel` | `rel` | `string` | `''` | `HelixBaseMenuItem` | The relationship, which `target="_blank"` should always set. |
| `selected` | - | `boolean` | - | `HelixBaseMenuItem` | Whether this is the row the set is on, which in a menu is where focus is. |
| `showingSubmenu` | - | `boolean` | `false` | `HelixBaseMenuItem` | Whether this row's submenu is the page showing. |
| `target` | `target` | `string` | `''` | `HelixBaseMenuItem` | Where the link opens, for the rows that should leave the page. |
| `value` | `value` | `string` | `''` | `HelixBaseMenuItem` | What this row stands for, carried in the event when it is chosen. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseMenuItem` | Moves focus onto the row itself. |
| `focusItem()` | `HelixBaseMenuItem` | `NavigableItem`, so the arrow keys can be the shared controller's business. |
| `select()` | `HelixBaseMenuItem` | Chooses the row, which is the same act as pressing it. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the row is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The label. |
| `start` | Before the label. A mark about the row. |
| `submenu` | Rows this one opens, which makes it a way in. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The row, which is an `<a>` where `href` is set. |
| `start` | The leading column, which is a slot and is always there. |
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

What else differs is what the color means. A progress bar is one color because
there is one thing to say; a meter's fill takes the success, warning or danger
tone from the band its reading falls in, and only once thresholds have been
declared. An unbanded meter is neutral, because a gauge with nothing said
about it is a reading rather than good news.

A tick marks each threshold, so the reading can be placed against the bands
without seeing color at all.

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
| `shape` | `shape` | `'arc' \| 'ring' \| undefined` | - | `HelixBaseMeter` | Whether the reading is drawn as a bar, a ring or an arc. |
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
| `groove` | The unfilled circle, in `ring` and `arc`. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--meter-ring-size` | Edge length of the drawing, in `ring` and `arc`. |
| `--meter-ring-width` | Thickness of the stroke there. |
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

## Number Input

### Root — `helix-number-input`

A number a reader types or steps to.

Extends `HelixBaseNumberInput`.

The frame an `Input` wears, because in a form this stands in a row with them.
The difference is inside it: a button at each end of the box rather than
beside it, so the whole reads as one field rather than a field with two
controls after it.

The number is centered and set in tabular figures, which is the one place this
differs from every other field in the library. Digits are what changes under a
repeated press, and proportional ones make the number shuffle while it counts.

The steppers are out of the tab order. A keyboard reader already has four keys
on the field itself, and two more tab stops per number is a form that takes
three times as long to cross.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `decrementLabel` | `decrement-label` | `string` | `'Decrease'` | `HelixBaseNumberInput` | Accessible name for the control that steps down. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `describedBy` | - | `string \| undefined` | - | `MixinField` | Id of the description node, for `aria-describedby` on the control. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `incrementLabel` | `increment-label` | `string` | `'Increase'` | `HelixBaseNumberInput` | Accessible name for the control that steps up. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `largeStep` | `large-step` | `number \| undefined` | - | `HelixBaseNumberInput` | How far `PageUp` and `PageDown` move. |
| `max` | `max` | `number \| undefined` | - | `HelixBaseNumberInput` | Largest value the reader may reach. Absent has no ceiling. |
| `min` | `min` | `number \| undefined` | - | `HelixBaseNumberInput` | Smallest value the reader may reach. Absent has no floor. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `placeholder` | `placeholder` | `string` | `''` | `HelixBaseNumberInput` | Shown while the field is empty. Not a label: it goes when typing starts. |
| `readOnly` | `read-only` | `boolean` | `false` | `HelixBaseNumberInput` | Whether the field refuses input while still submitting its value. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `scrub` | `scrub` | `boolean` | `false` | `HelixBaseNumberInput` | Whether a grip is shown that changes the value when it is dragged. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBaseNumberInput` | Focus is delegated to the field, so the host is never the focus target. |
| `step` | `step` | `number` | `1` | `HelixBaseNumberInput` | How far one step moves. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseNumberInput` | Puts the caret in the field, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `select()` | `HelixBaseNumberInput` | Selects the number, so typing replaces it. |
| `stepDown()` | `HelixBaseNumberInput` | One step down. |
| `stepUp()` | `HelixBaseNumberInput` | One step up, or `PageUp`'s larger one. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-input` | `HelixInputEvent` | Fired as the value changes, and cancelable. |
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
| `label` | The name over the field, which is also the scrub grip. |

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
| `--option-inset` | Space before the label, shared with a group heading. |
| `--option-block-inset` | Space above and below it. `Command` raises this, a palette being a page of rows read at speed rather than a select's short list. |
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
it is where they happen to be standing, and a row of gray numbers with one
blue one reads as the blue one being an action.

Selected on `aria-current` rather than on a second attribute saying the same
thing: the state is already in the accessibility tree, and a `data-current`
beside it would be two places to keep in step.

The gap takes the same box as everything else in the row and only sits back a
shade in color. It is a control, so it answers hover and focus like one; it
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

## Pin Input

### Root — `helix-pin-input`

A short code, one character to a box.

Extends `HelixBasePinInput`.

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
| `cellLabel` | `cell-label` | `string` | `'Character {index} of {length}'` | `HelixBasePinInput` | Accessible name for one box, with `{index}` and `{length}` filled in. |
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
| `length` | `length` | `number` | `6` | `HelixBasePinInput` | How many characters the code has. |
| `mask` | `mask` | `boolean` | `false` | `HelixBasePinInput` | Whether the characters are hidden, the way a password is. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `readOnly` | `read-only` | `boolean` | `false` | `HelixBasePinInput` | Whether the boxes refuse input while still submitting their value. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `shadowRootOptions` | - | `ShadowRootInit` | `{ ...HelixFormElement.shadowRootOptions, delegatesFocus: true, }` | `HelixBasePinInput` | Focus is delegated, so the host is never the focus target. |
| `type` | `type` | `PinType` | `'numeric'` | `HelixBasePinInput` | What a box accepts, which decides the keyboard a phone offers. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `clear()` | `HelixBasePinInput` | Empties every box and returns to the first. |
| `focus()` | `HelixBasePinInput` | Puts the caret in the first empty box, which is where a reader resumes. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-input` | `HelixInputEvent` | Fired as the code changes, and cancelable. |
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

## Qr Code

### Root — `helix-qr-code`

Encodes a short piece of text as a scannable square.

Extends `HelixBaseQrCode`.

The picture is the base tier's. What this adds is a size that can be set
once, the colours a scanner needs, and the box that holds a centre mark.

**The ink is `currentColor` and the ground is a real fill.** A code has to be
dark on light to read, and the pair that guarantees it is not the page's
foreground and background: those invert together in dark mode, and a code
drawn light-on-dark is refused by a good half of the scanners in the world.
So the ground is stated and the ink is the foreground it is chosen for.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `correction` | `correction` | `QrCorrection \| undefined` | - | `HelixBaseQrCode` | How much of the code can be lost and still read. |
| `label` | `label` | `string` | `''` | `HelixBaseQrCode` | What the image is called. |
| `shape` | `shape` | `QrStyle` | `'square'` | `HelixBaseQrCode` | How the modules are drawn. |
| `value` | `value` | `string` | `''` | `HelixBaseQrCode` | What the code encodes, which is usually a URL. |

#### Slots

| Slot | Description |
| --- | --- |
| `logo` | A mark for the centre, which only reads at a high correction. |

#### Parts

| Part | Description |
| --- | --- |
| `code` | The square itself. |
| `modules` | Everything but the three corner squares. |
| `finders` | The three corner squares, which can take their own colour. |
| `logo` | The box holding the centre mark. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--qr-code-size` | How wide the square is. Defaults to `12rem`. |
| `--qr-code-color` | The dark modules. Defaults to the page's ink. |
| `--qr-code-finder-color` | The three corner squares. Defaults to the same ink as the modules. |
| `--qr-code-background-color` | Behind them, including the quiet zone. |
| `--qr-code-logo-size` | How much of the middle a mark may cover. Defaults to `27%`, which `H` correction carries: it can lose thirty percent. |
| `--qr-code-logo-inset` | The quiet zone around that mark. |

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
| `appearance` | `appearance` | `'chip' \| 'plain' \| 'card' \| undefined` | - | - | How the choice presents itself. |
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
| `icon` | A mark shown beside them, or instead of them under `appearance="chip"`, where the words become the accessible name and the mark is what a reader picks between. Separate from the default slot because the chip has to hide one and show the other, and they are both in the same place otherwise. |

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
| `--radio-border-color` | Edge of the circle, in every state. |
| `--radio-card-padding` | Inset of the card appearance. |
| `--radio-chip-size` | Diameter of the chip appearance. |
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

## Rating

### Root — `helix-rating`

A score out of a few marks, given or shown.

Extends `HelixBaseRating`.

Presentation only: the marks, and the clip that fills them partway.
Everything about what the score is and how it is chosen is the base class.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'dots' \| 'marks'` | `'marks'` | - | Which mark the row is drawn with. |
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
| `max` | `max` | `number` | `5` | `HelixBaseRating` | How many marks there are. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `readOnly` | `readonly` | `boolean` | `false` | `HelixBaseRating` | Whether this shows a score rather than asks for one. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `score` | - | `number` | - | `HelixBaseRating` | The score, as a number, clamped to what the marks can show. |
| `showValue` | `show-value` | `boolean` | `false` | `HelixBaseRating` | Whether the score is written out beside the marks. |
| `step` | `step` | `number` | `1` | `HelixBaseRating` | The smallest part of a mark that can be chosen. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |
| `valueText` | `value-text` | `string` | `''` | `HelixBaseRating` | How the score is read out, where "3.5 out of 5" is not what it should say. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |

#### Slots

| Slot | Description |
| --- | --- |
| `mark` | The shape of a mark, cloned into every position. Left empty, the stylesheet draws its own and `--rating-mark` swaps it. |

#### Parts

| Part | Description |
| --- | --- |
| `marks` | The row of marks. |
| `track` | The unfilled marks. |
| `fill` | The filled marks, clipped to the score. |
| `mark` | One mark, in either layer. |
| `option` | One place a reader can press, which is one step. |
| `value` | The score written out, under `show-value`. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--rating-mark` | The shape of one mark, as a mask image. |
| `--rating-size` | How big one mark is. |
| `--rating-gap` | Space between marks. |
| `--rating-color` | The colour of a filled mark. |
| `--rating-empty-color` | And of an unfilled one. |

## Sandbox

### Root — `helix-sandbox`

Pairs an editable source pane with a live preview.

Extends `HelixElement`.

Coordination is by event, the same way the accordion does it: a source pane
dispatches `SourceChange`, which bubbles, and the sandbox hands the value to
whatever preview is slotted into it. Neither child knows the other exists, so
either can be replaced or used alone.

The event carries the pane's `name`, which is what lets one sandbox hold
several panes without the root identifying senders by reference. `html` is
the preview's markup and `css` is its stylesheet. A pane named anything else
is showing something rather than driving it, and is ignored: the sandbox has
a pane rendering the example as JSX, and guessing would have put the text of
a React component into the preview.

**The dividers are two nested `helix-splitter`s, not a grid this element
drags itself.** It had its own: a five row grid, a stylesheet written to on
every pointer move, three pointer handlers, a keyboard handler reading which
axes each divider was allowed to move, and a corner placed by hand into the
cell where two tracks met. All of it is the splitter's now, including the
corner, which arrives on its own wherever a nested splitter crosses the one it
is in.

The panes are the inner splitter and the panel is the outer one, which is the
order that makes the panel span the full width: the outer divider runs edge to
edge and the inner stops at it.

**Both are controlled from here, so `split` and `panel-size` stay the truth.**
A splitter that owned its own position would leave this element reporting one
arrangement and showing another, and a consumer restoring a saved layout
writes to these two properties. Each splitter announces where it wants to go
and this answers, which is the same contract a form control has with a
framework.

**The panel is in pixels here and a percentage in the splitter, and the
conversion belongs here.** A terminal wants a number of lines rather than a
share of the window, so its height should not change when the window does. A
splitter has no business knowing that, so it stays percentage-pure and this
element, which does know what is in the panel, holds the box and converts.
That is also what keeps a stored `panelSize` from a previous visit meaning
what it meant when it was written.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `cornerLabel` | `corner-label` | `string` | `'Resize panes and panel'` | - | Accessible name for the divider that moves both at once. |
| `defaultPanelSize` | `default-panel-size` | `number` | `160` | - | What a reset makes the panel, in pixels. The pair to `panel-size`. |
| `defaultSplit` | `default-split` | `number` | `50` | - | Where a reset puts the divider, where nothing declared it. |
| `lead` | `lead` | `'source' \| 'preview'` | `'source'` | - | Which pane comes first, before the divider. |
| `orientation` | `orientation` | `'horizontal' \| 'vertical' \| undefined` | - | - | Whether the panes sit side by side or stacked. |
| `panelCollapsedSize` | `panel-collapsed-size` | `number` | `0` | - | What the panel's height becomes when it is closed. |
| `panelLabel` | `panel-label` | `string` | `'Resize panel'` | - | Accessible name for the panel's divider. |
| `panelSize` | `panel-size` | `number` | `160` | - | Height of the panel, in pixels. |
| `separatorLabel` | `separator-label` | `string` | `'Resize source pane'` | - | Accessible name for the divider. |
| `split` | `split` | `number` | `50` | - | Percentage of the sandbox given to the source pane. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when a divider is let go, with the new arrangement. |

#### Slots

| Slot | Description |
| --- | --- |
| `source` | The editable source pane. First unless `lead` says otherwise. |
| `preview` | The live preview. Second unless `lead` says otherwise. |
| `toolbar` | A bar across the top, spanning both panes. |
| `panel` | A panel under both panes, usually a terminal. |
| `status` | A status bar, spanning both panes at the bottom. |

#### Parts

| Part | Description |
| --- | --- |
| `body` | The splitter holding the panes above the panel. |
| `corner` | The handle where the two dividers cross. |
| `pane` | Either pane. |
| `panel` | The box holding whatever was slotted as the panel. |
| `panes` | The splitter holding the source and preview panes. |
| `separator` | Either divider. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--sandbox-min-block-size` | Minimum height of the sandbox. |
| `--sandbox-grab` | The invisible width of a divider's drag target. |
| `--sandbox-separator-color` | Color of the divider. |

### Preview — `helix-sandbox-preview`

Renders sandbox source in a frame of its own.

Extends `HelixElement`.

A sandboxed `<iframe>` pointed at `src`, which is a document the consumer
provides. That document imports whatever the examples need, listens for a
render message, and writes the markup into itself.

**A frame rather than the page.** Rendering into the page meant an example
was styled by whatever surrounded it, which flatters the preview and lies
about it: an example that restyles `helix-card` restyled the sandbox too, a
script in an example ran against the real document, and a stray
`position: fixed` escaped the pane. It also left nothing to capture console
output from, and the terminal has to come from somewhere.

The cost is that the frame starts empty. Styles and element definitions do
not cross into it, because a document has its own stylesheets and a window
has its own custom element registry, so `src` has to load them. That is the
consumer's document rather than something guessed at here.

**The source is not trusted, and the frame is what makes that safe.**
`fullscreen` is granted for the same reason and found the same way: a video
in the preview offered a fullscreen button that did nothing at all, because
the policy default is `self`, this frame is not `self`, and a denied request
rejects a promise nobody was watching. Two capabilities now, both explicit,
both starred.

`allow="clipboard-write *"` is granted explicitly, and the star matters: the
policy defaults to `self` and this frame has an opaque origin, so it is not
`self` and the default denies it. A component inside the preview that copies
to the clipboard is otherwise a control that silently does nothing, which is
how this was found. Nothing else is granted, and a copy still needs the
reader's own gesture.

`sandbox="allow-scripts"` and no `allow-same-origin`, so the document runs on
an opaque origin: script in an example cannot reach this page, its storage,
its cookies, or the editor the source was typed into. Without it they could,
measured, through an `onerror` handler on an image that fails to load, which
`innerHTML` does not strip the way it refuses a `<script>` tag.

That is what lets a sandbox hold markup a reader pasted from somewhere, or
one day arrived in a shared link, rather than only what its owner typed.

`allow-forms` is granted because examples have forms in them and a submit
that silently does nothing is a worse lie than one that navigates a frame
nobody is looking at. Top-level navigation, popups and modals are not.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `direction` | `direction` | `'rtl' \| undefined` | - | - | Writing direction inside the frame. |
| `label` | `label` | `string` | `'Preview'` | - | Accessible name for the frame. |
| `layout` | `layout` | `'padded' \| 'centered' \| 'fullscreen' \| undefined` | - | - | How the example is placed in the frame. |
| `source` | `source` | `string` | `''` | - | Markup to render. |
| `src` | `src` | `string` | `''` | - | Document the frame loads, which brings the styles and the elements. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `reload()` | - | Loads the frame's document again, and re-sends the example to it. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-console` | `HelixConsoleEvent` | Relayed from the frame, one per console call. |

#### Parts

| Part | Description |
| --- | --- |
| `frame` | The iframe. |

### Source — `helix-sandbox-source`

Editable source for a sandbox preview.

Extends `HelixElement`.

A real `<textarea>`, not a contenteditable div with a syntax highlighter over
it. Undo, selection, spellcheck suppression, mobile keyboards, and screen
reader support all come from the platform, and every one of them is
expensive to rebuild and easy to get subtly wrong.

Tab inserts two spaces rather than leaving the field, because a code pane
that cannot indent is not one. Escape then Tab still moves focus out, which
is the documented escape hatch for exactly this trade.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `fieldLabel` | `field-label` | `string` | `'Example source'` | - | Accessible name for the editable region. |
| `name` | `name` | `string` | `'html'` | - | Which source this pane holds, echoed in every `SourceChange`. |
| `tabIndents` | `tab-indents` | `boolean` | `true` | - | Whether Tab indents rather than moving focus. |
| `value` | `value` | `string` | `''` | - | The source being edited. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the source is edited. |

#### Parts

| Part | Description |
| --- | --- |
| `source` | The editable region. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--sandbox-source-background` | Fill behind the source. |
| `--sandbox-source-min-block-size` | Minimum height of the pane. |

### Status Bar — `helix-sandbox-status-bar`

Reports where the cursor is and what is being edited.

Extends `HelixElement`.

Slotted into a sandbox, which feeds it: the editor dispatches `helix-caret`
on every keystroke and every arrow press, the sandbox hears it and writes the
position here. Nothing about that reaches the consumer's framework, which is
the point. A caret position routed through React state would re-render the
workbench on every cursor move, to update two numbers.

**Not a live region.** The readout changes on every keystroke, so announcing
it would talk over the reader continuously while they type. It is text they
can navigate to, which is what a status bar is in every editor that has one.

A readout with nothing to say is not rendered at all rather than rendered
empty, or the bar keeps a gap where a value is not.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `column` | `column` | `number \| undefined` | - | - | One-based column of the cursor. Absent shows no readout. |
| `language` | `language` | `string \| undefined` | - | - | The language being edited, as a name or one the editor knows. |
| `line` | `line` | `number \| undefined` | - | - | One-based line of the cursor. Absent shows no readout. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | Items at the start of the bar. |
| `end` | Items after the readouts, at the end of the bar. |

#### Parts

| Part | Description |
| --- | --- |
| `caret` | The line and column readout. |
| `language` | The language readout. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--status-bar-color` | Color of the bar's text. |

### Terminal — `helix-sandbox-terminal`

Shows what the previewed example wrote to the console.

Extends `HelixElement`.

Fed by the sandbox, which hears `helix-console` from the preview and hands it
here. The preview is a separate document, so what arrives has already crossed
`postMessage`: text, not values.

**Repeats collapse.** An example with a render loop can write the same
warning hundreds of times, and two hundred identical lines say nothing that
one line and a count does not. Only consecutive repeats collapse, so the
order of what happened survives.

A `role="log"` rather than a live region by hand. It is the semantic for an
append-only stream, and it means a reader is told about new output without
the whole panel being re-announced each time.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `emptyLabel` | `empty-label` | `string` | `'Nothing written to the console yet.'` | - | What to show before anything has been written. |
| `label` | `label` | `string` | `'Console output'` | - | Accessible name for the log. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `clear()` | - | Empties the log. |
| `write()` | - | Adds a line, collapsing it into the one above when they are identical. |

#### Parts

| Part | Description |
| --- | --- |
| `log` | The scrolling region. |
| `entry` | One line. |
| `level` | The level a line came in at. |
| `message` | The text of a line. |
| `count` | How many times a repeated line arrived. |
| `empty` | Shown while nothing has been written. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--terminal-size` | Height of the scrolling region. |

### Toolbar — `helix-sandbox-toolbar`

The bar across the top of a sandbox.

Extends `HelixElement`.

Spans the source pane and the preview together, so what it holds is about the
sandbox rather than about one side of it. The files go at the start and the
menus at the end, which is the arrangement every editor has settled on.

**Not `role="toolbar"`.** That role brings a roving tabindex, one tab stop
for the whole group, and it is for a set of controls of the same kind. This
holds a tab list, which owns its own arrow-key behavior and would lose it.
Use `helix-toolbar` where the contents really are a row of buttons.

Both slots are bare, so an unfilled one generates no box and costs no gap.

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | Items at the start, usually the files. |
| `end` | Items at the end, usually menus. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--toolbar-gap` | Space between items. |
| `--sandbox-toolbar-size` | The bar's height. Defaults to a large control. |

## Scroll Area

### Root — `helix-scroll-area`

A scrolling box that says there is more.

Extends `HelixBaseScrollArea`.

Presentation only: the fades on the edges the base class names, and a
scrollbar that belongs to the system rather than to the platform. Which edges
have content past them is measured by the base class.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `''` | `HelixBaseScrollArea` | Names the region, for a reader arriving at it out of context. |
| `scroller` | - | `HTMLElement \| null` | - | `HelixBaseScrollArea` | The box that actually scrolls, for anything that needs to move it. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | What scrolls. |

#### Parts

| Part | Description |
| --- | --- |
| `viewport` | The scrolling box. |
| `edges` | Where the sideways edge cues are drawn. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--scroll-area-fade` | How deep the fades are, at both edges. |
| `--scroll-area-fade-block-start` | How deep the top one is, or `0` to drop it. |
| `--scroll-area-fade-block-end` | And the bottom one. |
| `--scroll-area-fade-inline-start` | How deep the leading sideways one is, or `0` to drop it. |
| `--scroll-area-fade-inline-end` | And the trailing one. |
| `--scroll-area-fade-color` | What they fade to, which is the ground behind. |
| `--scroll-area-scrollbar` | The scrollbar width keyword. |
| `--scroll-area-thumb-color` | The scrollbar's handle. |
| `--scroll-area-track-color` | And its track. |

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
| `emptyText` | `empty-text` | `string` | `'No matches'` | `HelixBaseSelect` | What it says where there are none. |
| `feedback` | `feedback` | `string` | `''` | `MixinField` | What is wrong, in the reader's words rather than the browser's. |
| `filterable` | `filterable` | `boolean` | `false` | `HelixBaseSelect` | Whether the list can be narrowed by typing. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `hint` | `hint` | `string` | `''` | `MixinField` | Help under the control, shown while there is nothing wrong. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `''` | `MixinField` | The accessible name, and the fallback for the `label` slot. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `loading` | `loading` | `boolean` | `false` | `HelixBaseSelect` | Whether the options are still on their way. |
| `loadingText` | `loading-text` | `string` | `'Loading'` | `HelixBaseSelect` | What the list says while they are on their way. |
| `multiple` | `multiple` | `boolean` | `false` | `HelixBaseSelect` | Whether more than one option can be the answer. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
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
| `start` | Before the chosen value, for an icon or a prefix. |
| `end` | After it, for a count, a unit, or a clear button. |
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
| `range` | `range` | `boolean` | `false` | `HelixBaseSlider` | Whether there are two thumbs and the value is a pair. |
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
| `helix-input` | `HelixInputEvent` | Fired as the value changes, and cancelable. |
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
| `--slider-track-image` | The whole track, for a slider whose color is the value. |

## Speed Dial

### Root — `helix-speed-dial`

A button that fans out the few actions a screen is for.

Extends `HelixBaseSpeedDial`.

Presentation only: the column the actions fan into, and which end they line
up on. Everything about what opens it, what closes it and how a keyboard
moves through it is the base class.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
| `label` | `label` | `string` | `'Actions'` | `HelixBaseSpeedDial` | Names the trigger and the set of actions it opens. |
| `offset` | `offset` | `number` | `12` | `HelixBaseSpeedDial` | Space between the trigger and the actions, in pixels. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placement` | `placement` | `Placement` | `'top-end'` | `HelixBaseSpeedDial` | Which way the actions fan out. They move if that side does not fit. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-open` | `HelixOpenEvent` | Fired before it opens, and cancelable. |
| `helix-close` | `HelixCloseEvent` | Fired before it closes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The actions. |
| `trigger` | The control that opens it. Falls back to a button named by `label`. |

#### Parts

| Part | Description |
| --- | --- |
| `trigger` | The default trigger, where none was slotted. |
| `actions` | The region the actions are drawn in. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--speed-dial-gap` | Space between the actions. |

### Item — `helix-speed-dial-item`

One action in a speed dial: a mark, and a name beside it.

Extends `HelixBaseSpeedDialItem`.

Presentation only: a round mark the size of a small control, and the name on
a chip beside it so it can be read against whatever the dial is floating
over. Everything about choosing it is the base class.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseSpeedDialItem` | Whether the action can be chosen. |
| `isSpeedDialItem` | - | `boolean` | `true` | `HelixBaseSpeedDialItem` | Tells the dial its own rows apart from anything else slotted in. |
| `selected` | - | `boolean` | - | `HelixBaseSpeedDialItem` | Whether this is the row the set is on, which here is where focus is. |
| `value` | `value` | `string` | `''` | `HelixBaseSpeedDialItem` | What this action stands for, carried in the event when it is chosen. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseSpeedDialItem` | Puts focus on the control inside, which is what a reader can reach. |
| `focusItem()` | `HelixBaseSpeedDialItem` | `NavigableItem`, so the arrow keys are the shared controller's business. |
| `select()` | `HelixBaseSpeedDialItem` | Chooses the action, which is the same act as pressing it. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the action is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The action's name. |
| `icon` | The mark, which is what a dial is read by. |

#### Parts

| Part | Description |
| --- | --- |
| `item` | The control. |
| `icon` | The mark's box. |
| `label` | The name beside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--speed-dial-item-size` | Edge length of the mark. |

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
| `appearance` | `appearance` | `'grip' \| 'line' \| undefined` | - | - | Whether the divider carries a grip. |
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
| `--splitter-grip-color` | The grip beside the line, once it is shown. |
| `--splitter-grip-length` | How far the grip runs along the divider. |
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

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `direction` | `direction` | `'column-reverse' \| 'row' \| 'row-reverse' \| undefined` | - | `HelixBaseStat` | Which way the label and the value are arranged. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The value. |
| `label` | What the value measures. |
| `unit` | The unit, set beside the value. |

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

## Steps

### Root — `helix-steps`

A sequence of stages, and where the reader is in it.

Extends `HelixBaseSteps`.

The numbering is a CSS counter rather than a property, so a step's position
is drawn by the browser at layout and is right in the server's markup with no
script involved. Reordering the steps renumbers them; nothing has to be told.

A step's name is a `helix-button`, so what it looks like under the pointer,
with focus, and when refused are Button's decisions and Button's hooks. There
is no `--steps-hover-color`: `--button-background-color` is that hook, and a
second name for it here would be a second thing to keep in step.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `active` | `active` | `string` | - | `MixinControllerActive` | Which item is current, by its `value`. |
| `appearance` | `appearance` | `'numeric' \| undefined` | - | `HelixBaseSteps` | What each step is marked with. |
| `defaultActive` | `default-active` | `string` | `''` | `MixinControllerActive` | Initial item for uncontrolled use. Ignored once `active` is written. |
| `label` | `label` | `string` | `'Steps'` | `HelixBaseSteps` | Accessible name for the sequence. |
| `orientation` | `orientation` | `'vertical' \| undefined` | - | `HelixBaseSteps` | Which way the steps run. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `requestActive()` | `MixinControllerActive` | Requests a new current item, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the active step changes. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The steps, which are `helix-step` elements. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--steps-gap` | Space between one step and the next. |
| `--steps-connector-inset` | Air either side of a mark, before the rail. |
| `--steps-marker-size` | Size of the mark, glyph or digit. |
| `--steps-connector-color` | The rule running through the steps. |
| `--steps-complete-color` | The mark on a finished step. |
| `--steps-current-color` | The mark on the current step. |

### Step — `helix-step`

One stage in a sequence.

Extends `HelixBaseStep`.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `complete` | `complete` | `boolean` | `false` | `HelixBaseStep` | Whether the reader has finished this stage. |
| `current` | `current` | `boolean` | `false` | `HelixBaseStep` | Whether this is the stage the reader is in. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseStep` | Whether the reader may go to this stage. |
| `value` | `value` | `string` | `''` | `HelixBaseStep` | What this stage is called when it announces itself. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `select()` | `HelixBaseStep` | Announces the step, unless it is refusing. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the step is pressed. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The step's name. |
| `description` | A line under the name, for what the stage is for. |
| `marker` | Replaces the number, or the check a complete step shows. |
| `content` | What the stage holds, shown while it is the current one. |

#### Parts

| Part | Description |
| --- | --- |
| `marker` | The shape carrying the number or the check. |
| `body` | The name and its description. |
| `label` | The step's name, which is a `helix-button`. |
| `description` | The line under it. |
| `lead` | The half line arriving from the step before. |
| `trail` | The half line running on to the next. |
| `content` | What the stage holds, while it is open. |

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
| `helix-toggle` | `HelixToggleEvent` | Fired before the state changes, and cancelable. |
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
| `emptyText` | `empty-text` | `string` | `'Nothing to show'` | `MixinCollection` | What is said where there are none, and none are coming. |
| `label` | `label` | `string` | `''` | `HelixBaseTable` | Accessible name for the table. |
| `loading` | `loading` | `boolean` | `false` | `MixinCollection` | Whether the rows are still on their way. |
| `loadingText` | `loading-text` | `string` | `'Loading'` | `MixinCollection` | What is said while they are on their way. |
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
| `appearance` | `appearance` | `'segmented' \| 'underlined' \| undefined` | - | `HelixBaseTabs` | How the row reads. |
| `defaultActive` | `default-active` | `string` | `''` | `MixinControllerActive` | Initial item for uncontrolled use. Ignored once `active` is written. |
| `label` | `label` | `string` | `'Tabs'` | `HelixBaseTabs` | Accessible name for the tab list. |
| `manual` | `manual` | `boolean` | `false` | `HelixBaseTabs` | Whether arrowing to a tab also selects it. |

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
| `prefix` | A category the label belongs to, set before it and weightier. |

#### Parts

| Part | Description |
| --- | --- |
| `dismiss` | The remove button, when `dismissible`. |
| `prefix` | The category before the label. |

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
| `helix-input` | `HelixInputEvent` | Fired as the text changes, and cancelable. |
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

## Time Input

### Root — `helix-time-input`

A time, typed or picked from a list.

Extends `HelixBaseTimeInput`.

The frame is the field rather than the input, so the trigger sits inside the
same box as the text and the focus ring is drawn once around the whole
control. The trigger is a mark within that box rather than a button beside it,
the arrangement Date Input settled on.

The panel is the field's width, which is the one place this differs from Input
Date: a calendar is seven columns with a width of its own, and a list of times
is a column of one line each, so it should be as wide as the control it
belongs to. That is the same reasoning Select gives for its own list.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'list' \| 'wheels'` | `'list'` | `HelixBaseTimeInput` | Whether the panel is one list of times or a column each. |
| `defaultOpen` | `default-open` | `boolean` | `false` | `MixinControllerOpen` | Initial open state for uncontrolled use, where nothing declared one. |
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
| `locale` | `locale` | `string` | `''` | `HelixBaseTimeInput` | Language tag the times are written in. Absent uses the runtime's own. |
| `max` | `max` | `string` | `'23:59'` | `HelixBaseTimeInput` | Latest time that can be chosen, as `HH:mm`. |
| `maxTags` | `max-tags` | `number` | `0` | `HelixBaseTimeInput` | How many times are shown as tags before the rest are counted, in `multiple`. |
| `min` | `min` | `string` | `'00:00'` | `HelixBaseTimeInput` | Earliest time that can be chosen, as `HH:mm`. |
| `mode` | `mode` | `'multiple' \| 'range' \| undefined` | - | `HelixBaseTimeInput` | How many times can be held at once. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `placeholder` | `placeholder` | `string` | `'HH:mm'` | `HelixBaseTimeInput` | What the field says before a time is in it. |
| `required` | `required` | `boolean` | `false` | `MixinField` | Whether the form refuses to submit without it. |
| `resolvedFeedback` | - | `string` | - | `MixinField` | The message actually shown: the consumer's, or the platform's, or none. |
| `step` | `step` | `number` | `15` | `HelixBaseTimeInput` | How far apart the offered times are, in minutes. |
| `timeStyle` | `time-style` | `'iso' \| 'local'` | `'local'` | `HelixBaseTimeInput` | Whether the field writes the time out, or holds the value as it is. |
| `triggerLabel` | `trigger-label` | `string` | `'Choose a time'` | `HelixBaseTimeInput` | Accessible name for the control that opens the list. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseTimeInput` | Puts the caret in the field, the way a label pointing at one would. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestOpen()` | `MixinControllerOpen` | Requests an open-state change, and reports whether it was applied. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `toggleOpen()` | `MixinControllerOpen` | Requests the opposite of the current state. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the time changes. |
| `helix-open` | `HelixOpenEvent` | Fired when the list opens. |
| `helix-close` | `HelixCloseEvent` | Fired when it closes. |

#### Slots

| Slot | Description |
| --- | --- |
| `trigger` | The mark on the field saying a list opens. |
| `hint` | Help under the field. |
| `feedback` | What is wrong with it. |

#### Parts

| Part | Description |
| --- | --- |
| `field` | The box holding the text and the trigger. |
| `control` | The text input. |
| `time` | One held time, as a tag, in `multiple`. |
| `rest` | How many times are held beyond the ones shown. |
| `trigger` | The control that opens the list. |
| `surface` | The floating panel. |
| `picker` | The list inside it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--time-input-background-color` | Fill behind the field. |

## Time Picker

### Root — `helix-time-picker`

Picks a time, from a list of them.

Extends `HelixBaseTimePicker`.

A bounded list on a surface of its own, because ninety-six rows is taller than
anywhere it will be put. `--time-picker-list-height` is the bound and it is a height
rather than a count of rows: what a panel has is room, and a row count would
have to be recomputed every time the density changed.

No border and no fill of its own. Flat on a page it takes what it is given,
and in Time Input's panel the panel supplies both: a list that brought its own
card would be a card inside a card there.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'list' \| 'wheels'` | `'list'` | `HelixBaseTimePicker` | Whether the times are one list or a column each. |
| `defaultValue` | `default-value` | `string` | `''` | `MixinControllerValue` | The value the markup declared, which is where a reset returns to. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixFormElement` | Whether the control is non-interactive. |
| `disableTimes` | `disable-times` | `string` | `''` | `HelixBaseTimePicker` | Times that cannot be chosen, comma separated, as `HH:mm`. |
| `form` | - | `HTMLFormElement \| null` | - | `HelixFormElement` | The form this control belongs to, if any. |
| `formAssociated` | - | `boolean` | `true` | `HelixFormElement` | Opts the element into form ownership, labels, and submission. |
| `invalid` | `invalid` | `boolean` | `false` | `HelixBaseTimePicker` | Whether the current selection fails validation. |
| `isDisabled` | - | `boolean` | - | `HelixFormElement` | Whether the control is off, by its own attribute or by an ancestor. |
| `label` | `label` | `string` | `'Time'` | `HelixBaseTimePicker` | Accessible name for the list, which has no visible one of its own. |
| `labels` | - | `NodeList` | - | `HelixFormElement` | Labels associated with this control. |
| `locale` | `locale` | `string` | `''` | `HelixBaseTimePicker` | Language tag the times are written in. Absent uses the runtime's own. |
| `max` | `max` | `string` | `'23:59'` | `HelixBaseTimePicker` | Latest time offered, as `HH:mm`. |
| `min` | `min` | `string` | `'00:00'` | `HelixBaseTimePicker` | Earliest time offered, as `HH:mm`. |
| `mode` | `mode` | `'multiple' \| 'range' \| undefined` | - | `HelixBaseTimePicker` | How many times can be held at once. |
| `name` | `name` | `string` | `''` | `HelixFormElement` | Name submitted with the form. |
| `step` | `step` | `number` | `15` | `HelixBaseTimePicker` | How far apart the offered times are, in minutes. |
| `value` | `value` | `string` | - | `MixinControllerValue` | What the control holds now, and what its form submits. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `focus()` | `HelixBaseTimePicker` | Puts the keyboard on the list, which is the only control here. |
| `formDisabledCallback()` | `HelixFormElement` | The platform's notice that an ancestor fieldset changed. |
| `formResetCallback()` | `MixinControllerValue` | Returns the control to the value its markup declared. |
| `formStateRestoreCallback()` | `MixinControllerValue` | Restores the value when the browser brings a form back. |
| `requestValue()` | `MixinControllerValue` | Requests a new value, and reports whether the request stood. |
| `reveal()` | `HelixBaseTimePicker` | Each wheel comes to rest on its own answer. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the time changes. |

#### Parts

| Part | Description |
| --- | --- |
| `list` | The listbox holding the times, in `list`. |
| `columns` | The row of columns, in `wheels`. |
| `column` | One of them. |
| `items` | The scrolling column inside it, forwarded from the listbox. |
| `empty` | What it says when nothing matches, forwarded from the listbox. |
| `option` | One time in it. Carries `data-between` inside a range. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--time-picker-list-height` | How tall the list is before it scrolls. |
| `--time-picker-wheel-height` | How tall a wheel is. Five rows by default. |
| `--time-picker-row-size` | Height and least width of one row in a wheel. |
| `--time-picker-range-color` | Wash behind the times inside a range. |
| `--time-picker-selected-color` | Fill on the chosen row of a wheel. |

## Timeline

### Root — `helix-timeline`

A record of what happened, in the order it happened.

Extends `HelixBaseTimeline`.

Presentation only: the direction time runs in, and the spacing between one
event and the next. Every entry draws its own mark and its own line.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `label` | `label` | `string` | `''` | `HelixBaseTimeline` | Names the record, for a reader arriving at it out of context. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The entries. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--timeline-gap` | Space between one entry and the next. |

### Item — `helix-timeline-item`

One event on a timeline: when it happened, and what it was.

Extends `HelixBaseTimelineItem`.

Presentation only: the rail down the side, the mark on it, and the line that
arrives at this entry from the one before.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `datetime` | `datetime` | `string` | `''` | `HelixBaseTimelineItem` | When it happened, machine-readable. |
| `tone` | `tone` | `'danger' \| 'info' \| 'neutral' \| 'primary' \| 'success' \| 'warning' \| undefined` | - | `HelixBaseTimelineItem` | What kind of event it was, which decides the mark's colour and nothing else. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | What happened. |
| `marker` | The mark on the line. Falls back to a dot, which is the slot's own fallback content rather than anything this element works out: whether a consumer slotted a mark is a question only the platform can answer, and it answers it by rendering what is inside the slot when nothing replaced it. |
| `time` | When it happened, as a reader should see it written. |

#### Parts

| Part | Description |
| --- | --- |
| `connector` | The line arriving at this entry. |
| `dot` | The mark drawn where nothing was slotted for one. |
| `content` | What happened, and the time above it. |
| `marker` | The mark on the line. |
| `rail` | The column holding the mark and the line. |
| `time` | When it happened. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--timeline-marker-radius` | How round the mark is. Zero is a square, and half its size is a disc. |
| `--timeline-marker-size` | Edge length of the mark. |
| `--timeline-rail-size` | Width of the line. |

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

## Tour

### Root — `helix-tour`

A guided run through an interface, one stop at a time.

Extends `HelixBaseTour`.

The styled tier of `BaseTour`. It draws the light and nothing else.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `backLabel` | `back-label` | `string` | `''` | `HelixBaseTour` | Label for the control that goes back, handed to every stop. |
| `doneLabel` | `done-label` | `string` | `''` | `HelixBaseTour` | Label for the control that goes on from the last stop. |
| `index` | `index` | `number` | `0` | `HelixBaseTour` | Which stop the reader is on. |
| `label` | `label` | `string` | `''` | `HelixBaseTour` | Accessible name for the run, such as "Getting started". |
| `length` | - | `number` | - | `HelixBaseTour` | How many stops there are. |
| `nextLabel` | `next-label` | `string` | `''` | `HelixBaseTour` | Label for the control that goes on. |
| `open` | `open` | `boolean` | `false` | `HelixBaseTour` | Whether the tour is running. |
| `skipLabel` | `skip-label` | `string` | `''` | `HelixBaseTour` | Label for the control that leaves the tour. |
| `spotlightPadding` | `spotlight-padding` | `number` | `8` | `HelixBaseTour` | Space left around the target when it is lit, in pixels. |
| `stops` | - | `HelixBaseTourStop[]` | - | `HelixBaseTour` | The stops, in the order they were written. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `back()` | `HelixBaseTour` | Goes back, and does nothing on the first stop. |
| `next()` | `HelixBaseTour` | Goes on, and finishes the run on the last stop. |
| `skip()` | `HelixBaseTour` | Leaves the run early, which is a close rather than a completion. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired when the current stop moves, carrying the new index. |
| `helix-complete` | `HelixCompleteEvent` | Fired when the last stop is finished. |
| `helix-close` | `HelixCloseEvent` | Fired when the reader leaves early. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The stops, in the order they should be visited. |

#### Parts

| Part | Description |
| --- | --- |
| `spotlight` | The box over the current target, which paints the scrim. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--tour-scrim-color` | The darkness outside the lit box. |
| `--tour-spotlight-radius` | Corner radius of the lit box. |

### Stop — `helix-tour-stop`

One stop on a tour: what it points at, and a panel to say it in.

Extends `HelixBaseTourStop`.

The styled tier of `BaseTourStop`. The panel is `Popover`'s panel by another
name, on purpose.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `backLabel` | `back-label` | `string` | `'Back'` | `HelixBaseTourStop` | Label for the control that goes back. |
| `current` | `current` | `boolean` | `false` | `HelixBaseTourStop` | Whether this is the stop the reader is on. |
| `doneLabel` | `done-label` | `string` | `'Done'` | `HelixBaseTourStop` | Label for the control that goes on from the last stop. |
| `first` | `first` | `boolean` | `false` | `HelixBaseTourStop` | Whether this is the first stop, so there is nowhere back to. |
| `for` | `for` | `string` | `''` | `HelixBaseTourStop` | The id of the element this stop is about. |
| `last` | `last` | `boolean` | `false` | `HelixBaseTourStop` | Whether this is the last stop, so the control says Done. |
| `nextLabel` | `next-label` | `string` | `'Next'` | `HelixBaseTourStop` | Label for the control that goes on. |
| `placement` | `placement` | `Placement` | `'bottom'` | `HelixBaseTourStop` | Which side of the target the panel prefers. |
| `skipLabel` | `skip-label` | `string` | `'Skip'` | `HelixBaseTourStop` | Label for the control that leaves the tour. |
| `target` | - | `HTMLElement \| null` | - | `HelixBaseTourStop` | The element this stop is about, or null where the id resolves to nothing. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | What this stop says. A card, a heading and a line, anything. |
| `actions` | Replaces the controls, which are Back, Next and Skip. |

#### Parts

| Part | Description |
| --- | --- |
| `bubble` | The panel that points at the target. |
| `arrow` | The point, which the floating pass places against the target. |
| `content` | The region holding the slotted content. |
| `actions` | The row the controls sit in. |
| `back` | The control that goes to the previous stop. |
| `next` | The control that goes on, and finishes on the last stop. |
| `skip` | The control that leaves the tour. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--tour-arrow-size` | The point's box, before it is rotated. |
| `--tour-bubble-size` | How wide the panel may grow. |
| `--tour-padding` | Inset inside the panel. |
| `--tour-surface-color` | The panel's own surface. |

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
| `chevronPlacement` | `chevron-placement` | `'start' \| 'end' \| undefined` | - | - | Which end of the row the branch chevron sits at. |
| `defaultActive` | `default-active` | `string` | `''` | `MixinControllerActive` | Initial item for uncontrolled use. Ignored once `active` is written. |
| `emptyText` | `empty-text` | `string` | `'Nothing to show'` | `MixinCollection` | What is said where there are none, and none are coming. |
| `label` | `label` | `string` | `'Tree'` | `HelixBaseTree` | Accessible name for the tree. |
| `loading` | `loading` | `boolean` | `false` | `MixinCollection` | Whether the rows are still on their way. |
| `loadingText` | `loading-text` | `string` | `'Loading'` | `MixinCollection` | What is said while they are on their way. |

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
| `--tree-chevron-order` | Set from `chevron-placement`; read by each item. |
| `--tree-chevron-gap` | Set from `chevron-placement`; the space before the chevron. |

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
| `href` | `href` | `string` | `''` | `HelixBaseTreeItem` | Where this node goes, which makes its row a real link. |
| `isBranch` | - | `boolean` | - | `HelixBaseTreeItem` | Whether this node has children. |
| `level` | `level` | `number \| undefined` | - | `HelixBaseTreeItem` | Depth from the root, set by the tree so indentation needs no CSS nesting. |
| `open` | `open` | `boolean` | - | `MixinControllerOpen` | Whether the element is open. |
| `rel` | `rel` | `string` | `''` | `HelixBaseTreeItem` | What the link declares about where it goes. |
| `selected` | `selected` | `boolean` | `false` | `HelixBaseTreeItem` | Whether this item is the current one. |
| `target` | `target` | `string` | `''` | `HelixBaseTreeItem` | Where the link opens, for the rare row that leaves the site. |
| `value` | `value` | `string` | `''` | `HelixBaseTreeItem` | Identifies the item to the consumer, carried in `helix-select`. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `activate()` | `HelixBaseTreeItem` | Chooses this node the way a reader does, from a press or from Enter. |
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

## Trend

### Root — `helix-trend`

Which way a measurement moved, and whether that is good news.

Extends `HelixBaseTrend`.

The arrow takes the judgment colour and the number does not, which is the
opposite of the dashboard convention and is measured rather than preferred:
in light mode the success token is 3.8:1 on the surface, enough for a glyph
and short of what 13px text needs, and there is no darker green in the ramp.
The number therefore keeps the page's own foreground and stays the most
legible thing here, which is right anyway, since the number is what a reader
reads and the judgment is a gloss on it.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `direction` | `direction` | `'down' \| 'neutral' \| 'up' \| undefined` | - | `HelixBaseTrend` | Which way the measurement moved. |
| `good` | `good` | `'down' \| 'up' \| undefined` | - | `HelixBaseTrend` | Which direction is the improvement, for this metric. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The metric that moved. |
| `label` | What it moved over. |

#### Parts

| Part | Description |
| --- | --- |
| `direction` | The direction as a word, for readers who are not looking. |
| `icon` | The arrow. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--trend-color` | Colour of the arrow, overriding the judgment. |
| `--trend-icon-size` | Size of the arrow. |

## Video

### Root — `helix-video`

Plays a video, with controls this library draws rather than the
browser's.

Extends `HelixBaseVideo`.

The player is the base tier's. What this adds is the bar: where it sits, when
it is there, and what the two ranges look like, which is the whole reason to
replace a control set that cannot be styled.

**The bar is over the picture, not under it.** A bar in the layout would move
everything below the video by its own height and would leave a strip of page
colour under a picture that is meant to be the whole of it. Over it, the
video is the component's size and the controls belong to it.

**It goes when nobody is using it, and comes back for the keyboard.** Hidden
once a playing video has gone `idle-delay` without being touched, shown again
the moment the pointer moves, and shown whenever anything inside it has
focus, which is what keeps it reachable without a pointer. A paused video
keeps its bar, because a reader who stopped it is deciding what to do next.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `appearance` | `appearance` | `'plain' \| 'shadow' \| 'solid'` | `'shadow'` | - | Whether the bar floats on the picture or sits on its own ground. |
| `controls` | `controls` | `boolean` | `false` | `HelixBaseVideo` | Whether the browser draws the controls instead of this element. |
| `errorLabel` | `error-label` | `string` | `'This video could not be played'` | `HelixBaseVideo` | And what they are told when it will not play at all. |
| `extraControls` | `extra-controls` | `string` | `''` | `HelixBaseVideo` | Controls beyond the ones every player has, named in the order they appear. |
| `idleDelay` | `idle-delay` | `number` | `2500` | `HelixBaseVideo` | How long the bar waits after the pointer stops before it goes, in ms. |
| `label` | `label` | `string` | `''` | `HelixBaseVideo` | Accessible name, since a video is not described by its filename. |
| `loadingLabel` | `loading-label` | `string` | `'Loading'` | `HelixBaseVideo` | What a reader is told while the picture is waiting for more of itself. |
| `loop` | `loop` | `boolean` | `false` | `HelixBaseVideo` | Whether it starts again at the end. |
| `muted` | `muted` | `boolean` | `false` | `HelixBaseVideo` | Whether it starts silent, which is what an autoplaying video must do. |
| `overflowControls` | `overflow-controls` | `string` | `''` | `HelixBaseVideo` | Controls that go behind one button instead of onto the bar, named the same way. |
| `pauseLabel` | `pause-label` | `string` | `'Pause'` | `HelixBaseVideo` | And while it would stop it. |
| `playLabel` | `play-label` | `string` | `'Play'` | `HelixBaseVideo` | What the play control is called while it would start the video. |
| `playsInline` | `plays-inline` | `boolean` | `true` | `HelixBaseVideo` | Whether it plays where it sits rather than taking over the screen. |
| `poster` | `poster` | `string` | `''` | `HelixBaseVideo` | A still shown before it plays, which the platform draws itself. |
| `preload` | `preload` | `'auto' \| 'metadata' \| 'none'` | `'metadata'` | `HelixBaseVideo` | How much to fetch before anything is asked for. |
| `speeds` | `speeds` | `string` | `'0.5 1 1.5 2'` | `HelixBaseVideo` | The speeds offered, slowest first, as multipliers of normal. |
| `src` | `src` | `string` | `''` | `HelixBaseVideo` | Where the video is, for the common case of one file. |
| `startControl` | `start-control` | `'none' \| undefined` | - | `HelixBaseVideo` | The big mark over the picture before anything has played, or `none`. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `pause()` | `HelixBaseVideo` | Stops, leaving the frame up. |
| `play()` | `HelixBaseVideo` | Starts playing, where the platform allows it. |
| `seek()` | `HelixBaseVideo` | Moves to a point in seconds, clamped to what exists. |
| `toggle()` | `HelixBaseVideo` | Toggles playback, which is what every key and the button both come to. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-next` | `HelixNextEvent` | Fired when the reader asks for the next item. |
| `helix-previous` | `HelixPreviousEvent` | Fired when they ask for the previous one. |
| `play` | `Event` | Relayed, because it does not cross a shadow boundary. |
| `pause` | `Event` | Relayed for the same reason. |
| `ended` | `Event` | Relayed for the same reason. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | `<source>` and `<track>` elements, which are copied into the video. |
| `back` | Top left over the frame, for a way out of a set. |
| `controls` | Added to the control bar, before fullscreen. |
| `poster` | Shown over the video until it starts. |

#### Parts

| Part | Description |
| --- | --- |
| `stage` | The box holding the picture and its controls, and the focus target the keys are bound to. |
| `video` | The video itself. |
| `poster` | What covers it before it plays. |
| `back` | The region top left, for a way out of a set. |
| `failure` | What is said when the source will not play. |
| `loading` | What is said while the picture waits for more of itself. |
| `loading-mark` | The part of that which spins. |
| `cue` | The caption on screen now, drawn by this element. |
| `controls` | The bar along the bottom. |
| `play` | Play and pause. |
| `scrubber` | Where it is, and where to go. |
| `time` | The position and the duration. |
| `sound` | The speaker and its level, which are one control. |
| `mute` | Sound on and off. |
| `volume` | How loud. |
| `captions` | Subtitles on and off. |
| `captions-menu` | The language menu, where there is more than one. |
| `rewind` | The control that goes back ten seconds. |
| `forward` | The control that goes on ten seconds. |
| `remote` | Play on another device, where one is available. |
| `speed` | Playback speed, where it was asked for. |
| `pip` | Picture in picture, where it was asked for and exists. |
| `start` | The mark over the picture before anything has played. |
| `next` | Asks for the next item, where it was asked for. |
| `previous` | Asks for the previous one. |
| `download` | Saves the file, where it was asked for. |
| `overflow` | The menu holding the controls kept off the bar. |
| `more` | The button that opens it. |
| `fullscreen` | The whole screen, and back. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--video-aspect-ratio` | The shape of the box. Defaults to the video's own once known, and `16 / 9` until then. |
| `--video-well-color` | Behind the picture, and in the letterbox bars. |
| `--video-speed-size` | How wide the playback speed control is held, so the row does not move when the number changes. |
| `--video-radius` | The corner it is cut to. |
| `--video-controls-color` | The ink on the bar. |
| `--video-accent-color` | The played part of the scrubber. |
| `--video-start-size` | Width of the mark that starts it. |

## Video Playlist

### Root — `helix-video-playlist`

A set of clips and the one player they take turns in.

Extends `HelixBaseVideoPlaylist`.

Presentation only: the arrangement of the two regions and the scroller the
entries sit in. Everything about which clip is current is the base class.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `active` | `active` | `string` | - | `MixinControllerActive` | Which item is current, by its `value`. |
| `defaultActive` | `default-active` | `string` | `''` | `MixinControllerActive` | Initial item for uncontrolled use. Ignored once `active` is written. |
| `label` | `label` | `string` | `'Playlist'` | `HelixBaseVideoPlaylist` | Accessible name for the list, which usually has no visible heading. |

#### Methods

| Method | From | Description |
| --- | --- | --- |
| `requestActive()` | `MixinControllerActive` | Requests a new current item, and reports whether the request stood. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-change` | `HelixChangeEvent` | Fired before the current entry changes, and cancelable. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The entries. |
| `player` | The `helix-video` they play in. |

#### Parts

| Part | Description |
| --- | --- |
| `player` | The region holding the player. |
| `items` | The list of entries. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--video-playlist-layout` | Columns for the player and the list. |
| `--video-playlist-size` | How tall the list gets before it scrolls. |

### Item — `helix-video-playlist-item`

One entry in a video playlist.

Extends `HelixBaseVideoPlaylistItem`.

Presentation only: the row, its thumbnail column, and the mark on the one
playing. The base class holds what the entry is and what it announces.

#### Properties

| Property | Attribute | Type | Default | From | Description |
| --- | --- | --- | --- | --- | --- |
| `current` | - | `boolean` | `false` | `HelixBaseVideoPlaylistItem` | Whether the player is on this entry. |
| `disabled` | `disabled` | `boolean` | `false` | `HelixBaseVideoPlaylistItem` | Whether the entry can be chosen. |
| `poster` | `poster` | `string` | `''` | `HelixBaseVideoPlaylistItem` | What covers the picture before this entry plays, and the row's thumbnail. |
| `src` | `src` | `string` | `''` | `HelixBaseVideoPlaylistItem` | The file this entry plays. |
| `text` | - | `string` | - | `HelixBaseVideoPlaylistItem` | The entry's name, which is the words and not everything in it. |
| `value` | `value` | `string` | `''` | `HelixBaseVideoPlaylistItem` | What identifies the entry, and what `active` is compared against. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `helix-select` | `HelixSelectEvent` | Fired when the entry is chosen. |

#### Slots

| Slot | Description |
| --- | --- |
| *(default)* | The entry's name. |
| `media` | A thumbnail. Falls back to an image of `poster`. |
| `meta` | After the name. A duration, or a date. |

#### Parts

| Part | Description |
| --- | --- |
| `wrapper` | The `listitem`, which the button sits in. |
| `item` | The row, which is a button. |
| `media` | The leading column. |
| `thumbnail` | The image `poster` falls back to. |
| `label` | The name and whatever follows it. |

#### Custom properties

| Property | Description |
| --- | --- |
| `--video-playlist-item-background-color` | Fill behind a row. |
| `--video-playlist-media-size` | Width of the thumbnail column. |
