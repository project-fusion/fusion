# @fusion.dev/site

`fusion.dev`: the landing page, the product pages, and the tools under them.
**Private**: it is the application, not something anyone installs.

| Here | What it is |
|---|---|
| `app/(site)/` | The public site. `page.tsx` and its `page.module.css` sit together |
| `app/(tool)/` | The sandbox, the theme builder and the aura page |
| `components/` | One component per folder, with its own stylesheet |
| `content/` | The registries the pages read: routes, products, verticals |
| `utils/`, `hooks/` | Shared logic, one module per folder |
| `preview/` | The sandbox frame's entry, bundled to `public/sandbox/` |
| `scripts/` | The generators this app owns, all of them turbo tasks |

**A component owns its own markup and its own styles.** A stylesheet under
`app/` is named for the route file beside it; anywhere else it lives in the
component's folder. Nothing imports a stylesheet from another folder.

**Elements register once, in a client component.** `HelixElements` holds every
`@fusion.dev/helix/*` import and renders `null`, so pages stay server
components: an unregistered tag is an unknown element in the HTML that upgrades
when the definition lands.

The sandbox preview is a static `frame.html` with an opaque origin, not a route,
so it is built by `bun run frame` rather than served by Next. `bun run dev`
builds it first.
