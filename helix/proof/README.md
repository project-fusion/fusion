# @fusion.dev/helix-proof

The Helix proof app: a project dashboard on Expo Router, built from Helix
families alone, written once and run as a website and in a phone app. It is
the reference for an app that shares its code between the web and a phone.
**Private**: nothing here reaches npm.

## Routes

| Route | Shows |
|---|---|
| `/` | Opens `/projects` |
| `/projects` | The week in numbers, what needs a look, and every project |
| `/projects/<project>` | The project's overview |
| `/projects/<project>/activity` | What happened on the project |
| `/projects/<project>/settings` | Who hears about the project, who sees it, and archiving it |
| `/activity` | What happened across every project |

Each file under `app` is a route, as Expo Router reads it. The modules the
routes draw are under `src`.

## How it runs on both platforms

- **Each page is ordinary React with `helix-*` tags.** `babel.config.cjs`
  gives the app's files `@fusion.dev/helix/jsx-runtime` on both platforms.
  On the web it is React's own runtime, and each tag is the web element. On a
  phone it draws each tag as the native component of that name.
- **`@fusion.dev/helix/expo-router` follows the router on both platforms.**
  `HelixAppRoot` opens each Helix link through the router, and
  `useHelixRoute` marks the header's destinations current, gives each link
  its `href`, and builds the trail of crumbs. A press on a destination, a
  crumb, a tab, or a row goes through the router: on the web from the link's
  own anchor, and on a phone after the element's `onBeforeSelect`.
- **A page names no platform.** What one platform alone has is a pair of
  files, `.web.tsx` and `.native.tsx`:

  | Module | Web | Phone |
  |---|---|---|
  | `src/root` | Helix's stylesheet, the theme, and the page's frame | The theme, Helix's icons, and the status bar |
  | `src/navigator` | The route showing, in the document's flow | A stack, with the router's header hidden |
  | `src/page` | A `main` landmark that the document scrolls | A scroll view |

- **`helix shared` checks the rest.** `bun run check:cli:shared` from the
  repository's root reports anything in `app` or `src` that only the web
  has, such as a DOM element, CSS, or a web-only family or prop.

## Scripts

| Script | Does |
|---|---|
| `bundle` | Writes the website into `dist`, for the base URL `/helix/app/proof` |
| `start` | Starts Metro, for Expo Go on a simulator or a phone, and the website at `/helix/app/proof` |
| `test` | Draws the route tree with the native runtime and presses through it |
| `theme` | Writes the `theme` of `helix.json` into `src/theme.css` for the web and `src/theme.ts` for a phone |
| `typecheck` | Checks that `src/theme.css` and `src/theme.ts` are what `helix.json` builds, then checks the shared and web files as the web's, the `.native.tsx` files as React Native's, and Metro's config |

The app reaches the workspace packages through what each one exports, so
they are built first:

```sh
bunx turbo run build --filter '@fusion.dev/helix-proof^...'
bun run --filter @fusion.dev/helix-proof start
```

## Where it runs

- **The site serves the website at `/helix/app/proof`.** Its build copies
  `dist` into `public/helix/app/proof`, and `fusion/site/next.config.ts`
  answers each route with the export's one page.
- **The Helix gallery draws the app at `helix://proof`**, as
  `helix/app/README.md` says, at the route the rest of the link names.
