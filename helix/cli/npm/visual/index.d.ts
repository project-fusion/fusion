import type { Page } from 'playwright'

/** A color scheme a shot is taken in, declared on the page and emulated both. */
export type Scheme = 'dark' | 'light'

/** One picture of every entry. */
export interface Shot {
  /** The viewport's height in pixels. The picture is the full page either way. 800 when not given. */
  height?: number
  /** Names the shot in the report, in exceptions and, unless `suffix` is given, in the baseline's file name. */
  name: string
  /** The color scheme the page is told it has. */
  scheme: Scheme
  /** What the baseline's file name carries after its stem. `.<name>` when not given, so `preview.phone.png`. */
  suffix?: string
  /** The viewport's width in pixels, set on `body` by the harness too. */
  width: number
}

/** One color for each scheme. */
export interface Pair {
  /** The color in the dark scheme. */
  dark: string
  /** The color in the light scheme. */
  light: string
}

/** The ground, the ink and the inset the harness sets on `body`. */
export interface Harness {
  /** The page's background. `#fff` and `#000` when not given. */
  ground?: Pair
  /** The page's text color. `#000` and `#fff` when not given. */
  ink?: Pair
  /** Pixels between the page's edge and its content. 24 when not given. */
  padding?: number
}

/** How a shot is compared with its baseline. */
export interface Diff {
  /**
   * `pixel` counts the pixels past `threshold`, and is the default. `perceptual` scores structural
   * similarity, for photographs and gradients whose pixels move a shade on every render.
   */
  mode?: 'perceptual' | 'pixel'
  /** Pixels a shot may differ by and still pass, in the pixel mode. 0 when not given. */
  pixels?: number
  /** The lowest structural similarity a shot may score and pass, in the perceptual mode, from 0 to 1. 0.99 when not given. */
  ssim?: number
  /** How far apart two colors may be and still be one pixel, from 0 to 1. 0.1 when not given. */
  threshold?: number
}

/** HTML files from a glob, each pictured inside a document the harness writes. */
export interface HtmlSource {
  /** The diff for this source's shots, in place of the config's. */
  diff?: Diff
  /**
   * Relative requests from a page answered by another file in its directory,
   * with `{stem}` for the page's own file name without its extension:
   * `{ 'styles.css': '{stem}.css' }`.
   */
  files?: Record<string, string>
  /**
   * Which files under `root` are entries. `*` matches within a path segment,
   * `**` matches any number of directories, and `{name}` is the one segment
   * that names the entry: `{name}/.examples/preview.html`.
   */
  glob: string
  /** The harness's colors and inset, or `false` to picture the file as it is. */
  harness?: boolean | Harness
  /** Picks this source out of the others. */
  kind: 'html'
  /** The first half of each entry's id, `<name>/<entry>`. One word. */
  name: string
  /** Where the glob starts, relative to the config. */
  root: string
  /** URLs of scripts the page loads, each with `defer`, after the harness style. */
  scripts?: string[]
  /** URLs of stylesheets the page links, before the harness style. */
  styles?: string[]
}

/** What every source on a server shares. */
interface Served {
  /** The directory each entry's baselines are written in, relative to the config. */
  baselines: string
  /** The directory `start` runs in, relative to the config. */
  cwd?: string
  /** The diff for this source's shots, in place of the config's. */
  diff?: Diff
  /** The first half of each entry's id, `<name>/<entry>`. One word. */
  name: string
  /**
   * A shell command that starts the server, run only when nothing answers at `url`, and stopped
   * when the run ends. Left out, the server has to be running already.
   */
  start?: string
  /** Seconds to wait for the server to answer after `start`. 120 when not given. */
  timeout?: number
  /** The server's address, `http://localhost:3000`. */
  url: string
}

/** Pages of any server, by route or from its sitemap. */
export interface ServerSource extends Served {
  /** Picks this source out of the others. */
  kind: 'server'
  /** Routes to picture, each a path or a path and the name its baselines take. `/` is named `index`. */
  routes?: (string | { name: string; path: string })[]
  /** A sitemap's path on the server, `/sitemap.xml`, whose every route is pictured too. */
  sitemap?: string
}

/** Stories from a running Storybook, read from its `index.json`. */
export interface StorybookSource extends Served {
  /** Stories carrying one of these tags are left out. */
  exclude?: string[]
  /** Only stories carrying one of these tags, when any are given. */
  include?: string[]
  /** Picks this source out of the others. */
  kind: 'storybook'
}

/** Entries listed in a JSON file: an array of `{ id, url }`, each `url` relative to the server. */
export interface CatalogSource extends Served {
  /** The catalog file, relative to the config. */
  catalog: string
  /** Picks this source out of the others. */
  kind: 'catalog'
}

/** Any source of entries. */
export type Source = CatalogSource | HtmlSource | ServerSource | StorybookSource

/** An entry as `inspect` sees it. */
export interface Entry {
  /** The HTML file, absolute, for an entry from an HTML source. */
  file?: string
  /** `<source>/<name>`, unique across the run. */
  id: string
  /** What the glob named it. */
  name: string
  /** The name of the source it came from. */
  source: string
  /** The page's address, for an entry on a server. */
  url?: string
}

/** A run of `inspect.run`, collected for `inspect.report`. */
export interface Inspected<Result = unknown> {
  /** The entry that was inspected. */
  entry: Entry
  /** What `run` returned. */
  result: Result
}

/** Checks of your own on each page, after its first picture. */
export interface Inspect<Result = unknown> {
  /**
   * Called once at the end of the run with every result. Return `{ failed: true }` to fail the run.
   */
  report?: (
    runs: Inspected<Result>[],
    context: {
      /** Whether the run is `helix visual update`. */
      update: boolean
    },
  ) => Promise<{ failed?: boolean } | undefined> | { failed?: boolean } | undefined
  /** Called on the page that was pictured, after its first shot. What it returns is kept for `report`. */
  run: (context: {
    /** The entry on the page. */
    entry: Entry
    /** The Playwright page. */
    page: Page
  }) => Promise<Result> | Result
}

/** One exception to the comparison, with the reason it exists. */
export interface Exception {
  /** An entry's id, `styled/aura`, or its name in every source, `aura`. */
  entry: string
  /** What was measured to justify it, said beside it in every run. */
  measured?: string
  /** How many pixels the shot may differ by. An exception whose shot stops differing fails the run. */
  pixels?: number
  /** Why the exception exists. */
  reason: string
  /** One shot by name, or every shot of the entry when not given. */
  shot?: string
  /** A surface that cannot hold still: never pictured, and named in every run as skipped. */
  unstable?: boolean
}

/** A `visual.config.ts`. */
export interface Config {
  /** How a shot is compared with its baseline, unless its source sets its own. */
  diff?: Diff
  /** Exceptions to the comparison, each with its reason. */
  exceptions?: Exception[]
  /** Where the environment fingerprint is kept, relative to the config. `visual.fingerprint.json` when not given. */
  fingerprint?: string
  /** Checks of your own on each page, after its first picture. */
  inspect?: Inspect
  /**
   * Selectors whose elements are painted over in one fixed color in every picture, for what changes on its
   * own and says nothing about the page, such as a version number or a date.
   */
  mask?: string[]
  /** `origin` refuses every request off the harness origin, and is the default. `open` lets them through. */
  network?: 'open' | 'origin'
  /** `linux` takes and compares baselines on Linux alone, and is the default. `any` compares wherever it runs. */
  platform?: 'any' | 'linux'
  /** Where each run writes its report and `run.json`, relative to the config. `.helix/visual` when not given. */
  report?: string
  /** How your project retakes its baselines, said when a run fails. */
  retake?: string
  /** URL paths the harness serves from disk, relative to the config. A path ending in `/` serves a directory. */
  serve?: Record<string, string>
  /** What the harness waits for before each picture. */
  settle?: {
    /**
     * Only custom elements whose tag starts with this are awaited, and one left undefined fails the
     * entry. Set it for a framework that writes hyphenated tags of its own, such as Next.js's
     * `next-route-announcer`. Every custom element when not given.
     */
    elements?: string
    /** A property each element may carry holding a promise that resolves when it has rendered. */
    readyProperty?: string
  }
  /** How `--shard` packs entries into shards. */
  shard?: {
    /** Measured seconds by entry name. */
    cost?: Record<string, number>
    /** Seconds a shot is taken to cost where `cost` names nothing. 1 when not given. */
    perShot?: number
  }
  /** The pictures taken of every entry. A wide width, a phone width and dark when not given. */
  shots?: Shot[]
  /** Where entries come from. */
  sources: Source[]
  /**
   * A stylesheet applied while each picture is taken and removed after, to hold still what `mask` alone
   * cannot, such as a masked element whose width follows its text.
   */
  style?: string
  /** A file to write the seconds each entry name took, relative to the config. */
  timings?: string
}

/** Returns the config unchanged, typed. */
export declare const defineConfig: (config: Config) => Config
