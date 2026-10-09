---
name: helix
description: Writes and checks pages built with Helix, the web components in @fusion.dev/helix. Use when writing or reviewing code with helix- elements, Helix tokens, or the helix command line.
---

# Helix

This guide follows the latest release of Helix. A project that installed Helix has the copy for its own version at `node_modules/@fusion.dev/helix/skills/helix/SKILL.md`, and where the two differ, that copy is right.

## Using Helix with an agent

This guide is in two places, and both say the same thing:

- this page, which [llms.txt](https://fusion.dev/llms.txt) indexes
- `skills/helix/SKILL.md` inside `@fusion.dev/helix`, which matches the version
  you installed and works offline

[Link your tool to this guide](#link-your-tool-to-this-guide) says how to point
each tool at one of them. [The MCP server](https://fusion.dev/helix/docs/coding-agents) works with any
vendor and runs code, and Claude, Cursor, Windsurf, and Zed all support it.

### Read the family before writing its tags

```
https://fusion.dev/helix/components/<family>.md
https://fusion.dev/helix/components/<family>.json
```

Each family's file lists:

- the import lines for the family
- every tag
- every property, with its literal union
- every event, with its class and its React prop
- every slot, part, and custom property
- the examples, each with the import lines it needs

**If a tag is not in a family's file, it does not exist.** A property value
outside a declared union is invalid. Property types are literal unions for this
reason. `'ghost' | 'outlined' | 'solid' | 'subtle'` shows you the values, and a
named type such as `ButtonEmphasis` sends you somewhere else to find them.

The manifest at `https://fusion.dev/helix/custom-elements.json` holds every
family in one file, which is several megabytes. Read the families you use.
Start from `https://fusion.dev/llms.txt`. In one request, it names every
document and the machine-readable sources.

### Five mistakes that look like Helix bugs

Each of these looks like a bug in Helix. They are listed from the most common to
the least common.

#### 1. Writing a tag without importing its family

Each tag needs its family's entry imported. A family does not register another
family's elements that you write inside it, so a Select needs Option imported
beside it, and a Data Table needs Table:

```js
import '@fusion.dev/helix/select'
import '@fusion.dev/helix/option'
```

Without the second line, the options are unknown elements and the Select offers
nothing. Each family's Usage block and each example list the lines to import.
Copy them with the markup.

#### 2. Blocking a change without `preventDefault()`

**Setting `value`, `open`, `checked`, or `active` sets the starting state and
corrects the current state.** The element starts in that state and then applies
its own changes, the same as `<input value="Ada">`. This works with no handler:

```html
<helix-input
  label="Name"
  value="Ada"
></helix-input>
```

The mistake happens when you block a change. React restores a native `<input>`
whose state did not change. React does not do this for a custom element, so a
handler that does not call `setState` leaves the element with the new value. To
block a change, call `preventDefault()` on the matching `helix-before-*` event:

```tsx
<helix-input
  label="Name"
  onhelix-before-change={(event) => {
    event.preventDefault()
    setName(clean(event.detail.value))
  }}
  value={name}
/>
```

A form reset returns the element to `default-value` and the matching attributes
for the other states. See [State and control](https://fusion.dev/helix/docs/state-and-control).

#### 3. Using the exact event name

In React, write `onhelix-before-open`. `onHelixOpen` and `onOpen` do not work.
React removes `on` from the prop name and listens for exactly the rest, so the
casing must match. Outside React, use
`addEventListener('helix-before-open', …)`.

**Lifecycle events do not bubble. Coordination events do.**
`helix-before-open` and `helix-before-close` reach the element and stop there,
so a menu closing inside a dialog does not close the dialog. `helix-select`,
`helix-before-change`, and `helix-dismiss` cross shadow boundaries, so you can
listen for them on a container. If a listener on a wrapper receives nothing, the
event is a lifecycle event. Put the listener on the element.

#### 4. Styling a disabled control with `:disabled`

```css
helix-input:disabled { … }   /* right: matches a disabled fieldset too */
helix-input[disabled] { … }  /* wrong: a fieldset sets no attribute */
```

The browser disables a control inside `<fieldset disabled>` without adding an
attribute to it. The `[disabled]` selector does not match it, so the control
looks enabled while it does not accept input.

#### 5. Loading every style layer before the elements

```ts
import '@fusion.dev/helix-styles/helix.css'
import '@fusion.dev/helix/button'
```

`helix.css` combines four files in the order they must load:

1. `primitives.css`
2. `tokens.css`
3. `base.css`
4. `elements.css`

Import them one by one only when you need to replace one of them.

People most often leave out `elements.css`. Everything works without it until
you render the page on the server. An element that has not upgraded has no
styles of its own, so the markup appears unstyled and then jumps into place.

Each missing layer has its own symptom:

- An unstyled flash before hydration means `elements.css` is missing.
- Unstyled headings mean `base.css` is missing.
- No color anywhere means `primitives.css` or `tokens.css` is missing.

To tell the last two apart, look at the stylesheet. The screen looks the same.
Without `tokens.css`, nothing declares `--helix-color-*`. Without
`primitives.css`, all 185 semantic tokens are declared and every color resolves
to `rgba(0, 0, 0, 0)`, because `tokens.css` refers to a primitive 297 times and
to nothing else. A missing `primitives.css` looks like a working install, and
`helix.css` exists to prevent it.

### Choosing a component family

Look up the family in the manifest. Each family's `helix.aliases` lists its
other names, and a request often uses one of them:

- `Segment` and `NavItem` are `Toggle`.
- `Key` is `Legend`.
- `Hint` is `Tooltip`.

Know two rules before you search:

- **A group that reports a form value is a part.** A group that does not is its
  own family. `Radio.Group` and `Toggle.Group` are parts. `Checkbox Group` and
  `Button Group` are families whose members each submit their own value.
- **A control has no `size`.** Its height comes from `data-density` on the
  region, `sm` / `md` / `lg`, which crosses shadow boundaries through custom
  properties. If two controls in a row need different heights, change the
  layout.

### Styling components from outside

You can style a component in three ways. Try them in this order:

1. **A token.** `--helix-seed-radii: 2px` at `:root` reaches every component,
   because custom properties inherit. Most requests to restyle the button are
   really requests for less rounding across the brand. Set the seed. The four
   radii, including `--helix-radii-md`, are computed from it, so changing `md`
   alone changes neither the buttons nor the cards.
2. **A per-component hook.** For example, `--card-padding` on `helix-card`. Each
   hook is named after its component, documented on the component's page, and
   defaults to a semantic token.
3. **A part.** For example, `helix-select::part(trigger)`. A part gives you the
   most control, and it ties your styles to the component's internal structure.

**Never read a primitive.** `--_helix-neutral-500` and the other primitives
belong to `@fusion.dev/helix-styles`. The underscore marks them as internal.
Read the semantic tokens that refer to them.

### Styling HTML without custom elements

`@fusion.dev/helix-styles` is plain CSS with no JavaScript. It includes recipes
for markup that Helix does not render:

```html
<button
  data-button="solid"
  data-button-tone="primary"
>Save</button>
<article data-prose><h2>From a CMS</h2></article>
<div data-density="sm">…</div>
```

A recipe sets appearance only. It has none of these:

- state
- form participation
- focus trapping
- keyboard handling

If you are adding a script to a recipe, use the component.

### Link your tool to this guide

**Point your tool at the guide, and do not copy it.** A copy starts to go stale
as soon as you paste it, and the guide changes with the library.

The skill in the package matches the Helix you installed. In Claude Code, link
it into your project's skills folder:

```sh
mkdir -p .claude/skills
ln -s ../../node_modules/@fusion.dev/helix/skills/helix .claude/skills/helix
```

Other tools read a file in your repository. Add a line to it that names the
skill, or this page:

```md
Helix: read node_modules/@fusion.dev/helix/skills/helix/SKILL.md before
writing components, and node_modules/@fusion.dev/helix/api.json for the API.
```

| Tool | Where it goes |
|---|---|
| Claude Code | `.claude/skills/helix`, or a line in `AGENTS.md` or `CLAUDE.md` |
| Cursor | `.cursor/rules/` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Anything else | Whatever it reads. The line is the same |

We do not write those files for you, and we chose this on purpose. You would
have to maintain a file we generated in your repository against our changes. A
tool that rewrote it on install would be a dependency you did not ask for, in a
directory you own. You add the link or the line, and you can delete it.

### Install the Helix MCP server

```sh
helix mcp init --client claude
```

`helix mcp` answers from the Helix packages your project installs: families,
examples, import lines, tokens, and the theme a brand color produces. `--client`
takes `claude`, `cursor`, or `vscode`, and writes the server into the file that
client reads. [Coding agents](https://fusion.dev/helix/docs/coding-agents) lists the tools. It runs on your
machine, talks to a client you chose, and makes no network requests.

### What this guide does not cover

**Anything in the manifest.** Property names, unions, part names, event names,
and hooks change with the library, and they are in a file you can fetch. A list
of them here would be a second copy that goes stale. Fetch the family.

**The theme a brand color produces.** Helix computes it, so call
`helix_derive_theme`, or run `helix theme build`. Both take the same JSON that a
`helix.theme.json` file holds.

**Whether a component fits your case.** Read the examples to decide. Every
family's `.md` file includes them as text, and
`https://fusion.dev/helix/sandbox?e=<family>.<slug>` opens one for editing.

## Coding agents

We publish Helix as text for agents that write Helix code, so an agent does not
need to read the rendered website. Three sources give it the library as text.
We generate all three from the same sources as this site.

### The manifest

```
https://fusion.dev/helix/custom-elements.json
@fusion.dev/helix/custom-elements.json
```

The URL and the package path serve the same file. A package path works only
from a `node_modules` folder. An agent that found Helix through `llms.txt` can
reach this site and has no checkout, so it needs the URL.

The manifest lists:

- every element
- every property, with its literal type union
- every event, with its class
- every slot
- every part
- every custom property

We generate the framework typings, the reference documentation, and the site's
component pages from the manifest, so they always match it.

**If a tag is not in the manifest, it does not exist.** An agent can check every
tag and value it writes against the file, so an invented component is caught. A
prop value outside a declared union is invalid.

For the same reason, the analyzer requires literal unions for property types.
`'ghost' | 'outlined' | 'solid' | 'subtle'` shows you what to write. A named
type such as `ButtonEmphasis` sends you somewhere else to look.

### Markdown and JSON for each component family

```
https://fusion.dev/helix/components/<family>.md
https://fusion.dev/helix/components/<family>.json
```

These are static files, one pair for each family. Read the family you are
writing instead of the whole manifest. The manifest holds every family in one
file, and it is several megabytes.

The `.md` file has:

- the family's metadata
- a Usage block with the import lines for the family
- every element's description and API tables
- the examples, each with the import lines it needs

The HTML page leaves the examples out on purpose. The page lists what a
component can do, and the sandbox beside it shows what the component looks
like. Keeping pictures out of the reference keeps it the one place you can trust
to be complete. An agent cannot use the sandbox, and it reads an example as
text, so the `.md` file includes the examples.

Each example the visual check pictures links its pictures under it: wide at
640 pixels, narrow at 390, and dark at 640, taken in the environment that
`examples.json` records. Compare a render of your own to them.

The `.json` file has the same family as structured data, and three fields an
agent uses most:

- `usage`, the import block for each tier
- `imports` on each example, an import line for every element it writes
- `specifier` and `words` on each element: the line that registers it, and the
  properties `registerWords` translates

### Import every family you write

Each tag needs its family's entry imported. A family registers its own parts,
so `@fusion.dev/helix/tabs` registers Tab and Tab Panel. A family does not
register another family's elements that you write inside it:

```js
import '@fusion.dev/helix/select'
import '@fusion.dev/helix/option'
```

Without the Option import, the options are unknown elements and the Select
offers nothing. The same is true
of the layout around an example: a Button inside a Flex needs both imports.
Copy the import lines above an example together with its markup.

### Check the code you wrote

These checks run on your project, and each one prints JSON with `--json`:

| Command | What it finds |
|---|---|
| `helix scan` | Unknown tags, attributes, values, slots, parts, hooks, React event props, and tokens, a `--_helix-` primitive read, `[disabled]` on a form control, a selector on an attribute the element never writes back, and a tag whose entry nothing imports, each with its file and line |
| `helix theme audit` | Every foreground and background pair in your theme that misses its contrast target |
| `initDiagnostics()` from `@fusion.dev/helix-diagnostics` | The same findings on the running page, and what the library reports as it runs, such as an option nobody imported |

`helix scan` and `helix theme audit` exit 1 when they find an error and 0 when
they find none. Run them after you write Helix code, and fix each finding
before you finish. `helix scan --file <path>` reports one file's findings, and
`helix scan --stdin tsx` reads a snippet from stdin. Both still read the whole
project, so an import in another file counts.

### The index

```
/llms.txt
```

`llms.txt` lists every page on the site, in groups. Each entry links to the
page's `.md` file and has a one-sentence summary. We generate it from the same
route registry as the sitemap. Every page appears in it, and every entry in it
is a page that exists.

Start with `llms.txt`. In one request, it names every page on the site and the
two machine-readable sources above. This guide gives no page count, because a
number typed into prose goes stale.

### Links on each component page

Each family page has a menu beside its title with:

- **View Markdown**
- **Copy Markdown**
- links that send the document's URL to Claude or to Cursor

The links send the URL, because the URL stays current. A pasted copy starts to
go stale as soon as you paste it.

### The Helix MCP server

```sh
helix mcp init --client claude
```

`helix mcp` runs an MCP server over stdio. It answers from the Helix packages
your project installs, so every answer is for the version you build with, and
each one names that package and version. `helix mcp init` adds the server to
the file your client reads and keeps every other server in it:

| Client | File |
|---|---|
| `claude` | `.mcp.json` |
| `cursor` | `.cursor/mcp.json` |
| `vscode` | `.vscode/mcp.json` |

The server runs `npx @fusion.dev/helix-cli mcp`, which is the copy in your
project. It has nine tools:

| Tool | What it returns |
|---|---|
| `helix_find` | The families that answer a name, an alias, a tag, or a purpose, best first |
| `helix_family` | One family's tags, properties and their unions, events and their React props, slots, parts, custom properties, words, and import lines |
| `helix_example` | One example as HTML and TSX, with its stylesheet, the import lines it needs, and links to its pictures |
| `helix_imports` | The import lines for a list of tags, and the closest tag to any unknown one |
| `helix_tokens` | The semantic tokens, by a word in the name or description and by category |
| `helix_check` | The findings `helix scan` reports for the files you name, or for a snippet before you write it |
| `helix_check_page` | The findings the page diagnostics report for each address you name, opened headless, with what the library logged as the page ran |
| `helix_audit_theme` | Every foreground and background pair a brand color derives to, with its ratio and target |
| `helix_derive_theme` | The theme's CSS |

Each result is structured, with an output schema, and the same JSON as text.
A name that matches more than one family, such as `Dropdown`, returns an error
listing each family. The theme tools take the same JSON that a
`helix.theme.json` file holds.

Each lookup is also a command, for a script or a person:

```sh
helix api find dropdown
helix api family select
helix api example select
helix api imports helix-select helix-option
helix api tokens surface --category color
```

`--json` prints what the MCP tool returns.

**`helix_derive_theme` does not return a palette that fails its own targets**,
the same as `helix theme build`. A failing palette pasted into a stylesheet is
worse than a warning above it, and an agent does not read warnings.

You run `helix mcp` yourself, and we do not host it. A server we operated would
be one more service between you and your own tokens. `helix mcp` is a
subcommand of a binary you installed. It talks to a client you chose and makes
no network requests.

### What we do not publish for agents

**`llms-full.txt`, or any other whole-library download of the pages.** A single
file with every page goes out of date as soon as anything changes. Each link in
`llms.txt` can be cached on its own and stays current on its own.

`llms.txt` is the index, in one request, and each family's `.md` file is its
document. Fetch the families you use, or ask `helix mcp`.
