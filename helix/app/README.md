# @fusion.dev/helix-app

The Helix gallery on a phone. It lists each family `@fusion.dev/helix` draws on
React Native, each family's styled examples, and each example in a Preview tab
and a Code tab. It runs in Expo Go. **Private**: nothing here reaches npm.

The examples are the web's own `.examples` files, run as they are.
`scripts/examples.ts` writes a catalog that names each one as
`helix-example:<family>/<slug>`, `metro.config.ts` resolves that name to the
file in `@fusion.dev/helix`, and an example's JSX goes through
`@fusion.dev/helix/jsx-runtime`, which draws each `helix-*` tag as the native
component of that name. A tag with no native component says so
where it would be drawn.

A link opens the gallery at a family or an example: `/--/list`, or
`/--/list/selectable`, after the address Expo Go opens, and
`helix://list/selectable` in a build of the gallery. `rows` in place of a
family opens a list of 1,000 rows, which gives the frame rate of each scroll
you make in it. `preview` after an example, as in `helix://list/selectable/preview`,
opens its preview alone, without the Preview and Code tabs. `checks/<name>`
opens one of the checks the device runs make that no example shows, from
`src/checks.tsx`: `select-all`, `numbers`, `motion`, `rtl`, and `ltr`.
`proof` opens the proof app, and `proof/<route>` that app at one of its routes.

## The proof app

`proof` opens the proof app, `@fusion.dev/helix-proof` in `helix/proof`: a
project dashboard on Expo Router, written once for the web and a phone. The
gallery draws its route tree in a screen of its own with Expo Router's
`ExpoRoot`, at the route the rest of the link names: `helix://proof` opens it
at its start, and `helix://proof/projects/website/activity` at
`/projects/website/activity`. The app draws its own bar, so the gallery's
header is hidden there, and the system's back returns to the gallery.

`metro.config.ts` gives the app's files `@fusion.dev/helix/jsx-runtime`, as
the app's own Metro config does. The app's specs, its website, and the check
that its code names no platform are its own, in `helix/proof`.

## Scripts

| Script | Does |
|---|---|
| `bundle` | Writes each platform's bundle and its assets into `dist`, which name no address |
| `examples` | Writes the gallery's catalog of examples from the `api.json` and `examples.json` of `@fusion.dev/helix` |
| `export` | Runs `bundle`, then writes the manifests into `dist` for the base address given as `--base` |
| `serve` | Serves `dist` as the site does, at the address the export was written for |
| `start` | Starts Metro, for Expo Go on a simulator or on a phone on your network |
| `test` | Draws the shared-code checks with the native runtime |
| `typecheck` | Checks the app, and the scripts and Metro config, with their own types |

The app reaches the workspace packages through what each one exports, so they
are built first:

```sh
bunx turbo run export --filter @fusion.dev/helix-app -- --base http://127.0.0.1:8093/helix/app
bun run --filter @fusion.dev/helix-app serve
xcrun simctl openurl booted exp://127.0.0.1:8093/helix/app
```

## What `dist` holds

| Path | What it is |
|---|---|
| `_expo/static/js/<platform>/index-<hash>.js` | Each platform's bundle, as plain JavaScript |
| `assets/<hash>` | The images the bundles name |
| `ios.json`, `android.json` | Each platform's manifest, naming every file by its address under the base address |
| `host.json` | What the host answers beyond serving the files |
| `metadata.json` | What `expo export` wrote, which the manifests are written from |

**Two exports of one commit for one base address are the same bytes.** A
manifest's `id` is derived from the files it names and the base address, and
its `createdAt` is the time of the commit, or `SOURCE_DATE_EPOCH` when that is
set. Outside a repository, `createdAt` is the time of the export.

**Expo Go opens an update only when its `createdAt` is later than the one it
holds for the same scope**, and the scope is the base address. So each deploy
to one address carries a later date than the last, and a gallery served from
your computer does not stand in for the one on the site.

## What the host answers

`host.json` says it, for the host to read:

- **The base address answers with a manifest**, with or without its final
  slash: `ios.json` or `android.json`, by the `expo-platform` header Expo Go
  sends. Each manifest is also at its own name under the base address.
- **A manifest carries the protocol headers**: `expo-protocol-version: 0`,
  `expo-sfv-version: 0`, and `content-type: application/expo+json`. Without
  them, Expo Go reads it as a legacy manifest and refuses it. `vary:
  expo-platform` keeps a cache from serving one platform's manifest to the
  other.
- **`/message` accepts a WebSocket and keeps it open.** Expo Go opens one at
  the root of the host the manifest names the bundle on, outside the base
  address, to what it takes for a development server. Any other answer, a
  socket that closes included, brings another attempt two seconds later, and
  each attempt opens one more empty connection than the last. Measured on
  October 11, 2026, with Expo Go 58.0.2 on an iOS 27 simulator: the first 16
  attempts against a 404 opened 122 connections, and two minutes left 810
  sockets waiting to close. A socket kept open took one request and left one.

`bun run serve` does each of these. `MESSAGE=404 bun run serve` answers
`/message` another way, to measure it.

**The site serves the gallery at `/helix/app`.** Its build runs `bundle`, then
`fusion/site/scripts/copy-helix-app.mjs` copies `dist` into the site's
`public/helix/app` and writes the manifests there for the deploy's own
address, with `scripts/manifests.ts --dist`. `fusion/site/next.config.ts`
answers the base address, and `fusion/site/app/message/route.ts` holds the
socket.

## On devices

Each night, `.github/workflows/native-devices.yml` builds the gallery in
Release and runs the Maestro flows in `.maestro` on an iOS simulator and an
Android emulator. `scripts/devices.sh` runs them in passes, with the
appearance and the text size each pass sets first, and its header lists the
passes. Each platform runs the flows on one device and the screenshots on
another, at once. The run keeps these for seven days:

- a video of each family with a behavior
- a screenshot of each family's examples in light and dark, at the default
  and the largest text size
- screenshots of the steps of each flow, and of the examples drawn right to
  left
- the frame rate of the list of 1,000 rows

| Flow | Does |
|---|---|
| `allow-links.yaml` | Accepts the prompt iOS shows the first time a link opens the gallery, before the other flows |
| `app-header.yaml` | Presses a destination in the bar, which the page marks current, and lifts the transparent bar off a page that scrolls |
| `breadcrumbs.yaml` | Presses crumbs, which open their links, and reads the current page |
| `button.yaml` | Presses the pending button |
| `button-group.yaml` | Presses buttons in a group that chooses several |
| `checkbox.yaml` | Checks and clears a box, and reads the checked and mixed states |
| `checkbox-group.yaml` | Checks boxes in a group, and selects all and none |
| `keys/*.yaml` | On Android, presses Button with Enter, and moves through List, Tabs, Radio Group, and Toggle Group with the arrow keys |
| `list.yaml` | Drags a row by its grip, and selects rows |
| `megamenu.yaml` | Opens the band of destinations from its trigger, closes it with a touch outside and by choosing a destination, and reads the events it sends |
| `motion.yaml` | Pauses and starts the motion of Icon, Badge, Progress, and Skeleton with Motion Toggle |
| `navigation.yaml` | Presses destinations, which the page marks current, along a row and down a column |
| `numbers.yaml` | Reads Trend's numbers in German, compact and as a percent |
| `proof.yaml` | Opens a project in the proof app, presses each tab, archives the project, goes back to the list, and opens every project's activity from the header |
| `radio.yaml` | Chooses radios |
| `readings.yaml` | Reads the values of Meter and Progress |
| `right-to-left.yaml` | Draws the gallery right to left, takes a screenshot of the examples whose offsets follow the direction, and sets it back |
| `rows-open.yaml`, `rows-scroll.yaml` | Opens the list of 1,000 rows, then flings it down and back up. `rows.yaml` runs both |
| `screens/*.yaml` | Takes a screenshot of each family's examples, one family to a flow |
| `steps.yaml` | Presses stages, and reads the current step |
| `switch.yaml` | Turns a switch on and off |
| `tabs.yaml` | Presses tabs |
| `toast.yaml` | Dismisses messages with their button and a swipe, shows the next one a queue held back, reads the dismissal the page hears, and undoes an archived file |
| `toggle.yaml` | Chooses toggles in a group that chooses one and in one that chooses several |
| `tour.yaml` | Opens the tour, moves between its stops with Next and Back, finishes it with Done and ends it with Skip, reads the tour's own labels, follows stops into a menu and a drawer, and reads the events the page hears |

`maestro test .maestro` runs the flows that press each family on the
simulator or emulator you have running, with a release build of the gallery
on it, and `maestro test -e MODE=light -e SIZE=default .maestro/screens` takes
the screenshots. For an iOS simulator, from this folder:

```sh
bunx turbo run build --filter '@fusion.dev/helix-app^...'
bun run examples
bunx expo prebuild --platform ios
xcodebuild -workspace ios/Helix.xcworkspace -scheme Helix -configuration Release \
  -sdk iphonesimulator -derivedDataPath ios/build ARCHS=arm64 CODE_SIGNING_ALLOWED=NO build
xcrun simctl install booted ios/build/Build/Products/Release-iphonesimulator/Helix.app
maestro test .maestro
```

**What the tools cannot do:**

- Maestro sends an iOS simulator Return and Delete and no arrow keys, so the
  keyboard steps run on Android alone. On Android it sends the arrows, Enter,
  and Escape. Its Home is the system's Home button, so Home and End go
  untested on both.
- No step adjusts a row's grip as a screen reader does, which moves the row
  one place: Maestro has no command for an accessibility action.
- Maestro reads an Android element's words and its checked, focused, and
  selected states, and no value. So "Current page", "Current step", and the
  reading of a meter or a bar are read on iOS alone, where Maestro reads an
  element's value as its text. Those steps are optional until a night shows
  what iOS gives.
- Maestro compares no pictures, so whether motion stops is shown by pairs of
  screenshots and a video, for a person to look at.
- An iOS simulator gives no count of the frames its render server draws. The
  list of 1,000 rows counts its own, on the UI thread, on both platforms, and
  Android's `dumpsys gfxinfo` counts them too. A simulator and an emulator
  draw with the computer's processor, so their numbers follow changes from
  night to night and say nothing about a phone.
