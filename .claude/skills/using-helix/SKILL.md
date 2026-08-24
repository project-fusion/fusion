---
name: using-helix
description: Writes application code that uses the published Helix packages: choosing a component family, binding its events, theming through tokens, and the ownership rule that makes a control ignore input. Use when consuming @helix-io/web, @helix-io/styles, @helix-io/headless or @helix-io/theme from an application, when a Helix control is not responding, or when a page needs Helix styling without custom elements.
---

# Using Helix

**This is the outward-facing half.** `adding-helix-components` is for a
contributor to this repository and assumes a checkout; this assumes the published
packages and a website. If you are editing `helix/web/src`, you want the other
one.

## Read the manifest before writing a tag

```
https://fusion.dev/helix/custom-elements.json
@helix-io/web/custom-elements.json
```

Every tag, every property with its literal union, every event with its class,
every slot, part and custom property. **The vocabulary is the file**: a tag that
is not in it does not exist, and a property value outside a declared union is one
the component rejects. Unions are literal rather than named for exactly this
reason, so `'ghost' | 'outlined' | 'solid' | 'subtle'` answers the question where
`ButtonEmphasis` sends you somewhere else.

One family as data, when the whole manifest is more than the question needs:

```
https://fusion.dev/helix/components/<family>.json
https://fusion.dev/helix/components/<family>.md
```

The `.md` carries the API tables **and the examples**, which the HTML page
deliberately does not. Start from `https://fusion.dev/llms.txt`, which is one
request and names every document plus these two surfaces.

## The four things that go wrong

These are in order of how often they look like a library bug and are not.

### 1. A declared `value` hands you the control

```html
<!-- Ignores every keystroke. Nothing is logged. Nothing looks wrong. -->
<helix-input label="Name" value="Ada"></helix-input>
```

**Writing `value`, `open`, `checked` or `active` is a claim of ownership.** From
then on the element announces changes and applies none of them, waiting to be
told. Which mode it is in is read once, at its first update.

Seed with the `default-` twin, or answer the event:

```html
<helix-input default-value="Ada" label="Name"></helix-input>
```

```tsx
<helix-input label="Name" onhelix-input={(e) => setName(e.detail.value)} value={name} />
```

In TypeScript this is a compile error rather than a surprise. Everywhere else the
element warns on its second unanswered request.

### 2. The event name is the event's own

`onhelix-open`, not `onHelixOpen` and not `onOpen`. React slices `on` off the
prop and listens for exactly what is left, so the casing is not negotiable. From
anything that is not React, `addEventListener('helix-open', …)`.

**Lifecycle does not bubble and coordination does.** `helix-open` and
`helix-close` reach the element and stop, so a menu closing inside a dialog is
not the dialog closing; `helix-select`, `helix-change` and `helix-dismiss` cross
shadow boundaries and can be caught on a container. If a listener on a wrapper
hears nothing, it is a lifecycle event and belongs on the element.

### 3. `:disabled`, never `[disabled]`

```css
helix-input:disabled { … }   /* right: matches a disabled fieldset too */
helix-input[disabled] { … }  /* wrong: a fieldset sets no attribute */
```

A control inside `<fieldset disabled>` is disabled by the platform and carries no
attribute, so the attribute selector paints it as live while it refuses input.

### 4. Three stylesheets, in this order

```ts
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
import '@helix-io/web'
```

The third is the one people leave out, and everything works without it until the
page is server-rendered: an element that has not upgraded has no styles of its
own, so the markup flashes unstyled and then snaps into place. The tell for a
missing layer is which: no color at all is `tokens.css`, bare headings is
`base.css`, a flash before hydration is `elements.css`.

## Choosing a family

Ask the manifest, not your memory. Each family's `helix.aliases` lists the other
names it goes by, which is usually how a request arrives: `Segment` and `NavItem`
are `Toggle`, `Key` is `Legend`, `Hint` is `Tooltip`.

Two distinctions worth knowing before searching:

- **A group is a part when it reports a form value** and its own family when it
  does not. `Radio.Group` and `Toggle.Group` are parts; `Checkbox Group` and
  `Button Group` are families whose members submit themselves.
- **A control has no `size`.** Height comes from `data-density` on the region,
  `sm` / `md` / `lg`, which crosses shadow boundaries through custom properties.
  If two controls in a row must differ in height, the layout is wrong rather than
  the API.

## Styling from the outside

Three doors, in the order to try them.

1. **A token.** `--helix-radii-md: 2px` at `:root` reaches every component,
   because custom properties inherit. Most "can I restyle the button" is really
   "our brand has less rounding".
2. **A per-component hook.** `--card-padding` on `helix-card`. Named after the
   component, documented on its page, defaults to a semantic token.
3. **A part.** `helix-select::part(trigger)`. The most powerful and the one that
   couples you to internal structure.

**Never read a primitive.** `--_helix-neutral-500` and its kind belong to
`@helix-io/styles`; the underscore says so and the indirection is the point.

## No custom elements at all

`@helix-io/styles` is plain CSS with no JavaScript, and it carries recipes for
markup Helix does not render:

```html
<button data-button="solid" data-button-tone="primary">Save</button>
<article data-prose><h2>From a CMS</h2></article>
<div data-density="sm">…</div>
```

A recipe has appearance and no behavior: no state, no form participation, no
focus trapping, no keyboard handling. If you are adding script to one, the
component is what you wanted.

## What this skill will not tell you

**Anything the manifest answers.** Property names, unions, part names, event
names and hooks change with the library and are in a file you can fetch; a list
of them here would be a second copy going stale. Fetch the family.

**What a brand color derives to.** That is computation rather than a document,
and `helix mcp` is where it lives: an MCP server over stdio with
`helix_audit_theme` and `helix_derive_theme`, both taking the JSON a
`helix.theme.json` holds. It runs on your machine and nobody hosts it.

**Whether a component is good for your case.** The examples are the honest
answer to that and they are text: every family's `.md` carries them, and
`https://fusion.dev/helix/sandbox?e=<family>.<slug>` opens one editable.
