# Helix on Expo Router

An app that runs as a website and as an iOS and Android app from one set of
pages, built with Helix and Expo Router.

## Run it

Install the dependencies first:

```sh
npm install
```

### On the web

```sh
npx expo start --web
```

Expo opens the app in your browser. `npm run web` runs the same command.

### On a phone or a simulator, with Expo Go

```sh
npx expo start
```

Scan the QR code with the camera on your phone, or press `i` for the iOS
Simulator or `a` for an Android emulator. Each one needs Expo Go installed.
`npm run dev` runs the same command.

### In a development build

Expo Go draws Helix's own colors. To draw your theme on a phone, build the app
on your machine:

```sh
npx expo run:ios
npx expo run:android
```

The first needs Xcode, and the second needs Android Studio. Both build on your
machine.

## Build the website

```sh
npm run build
```

`build` checks the types and writes the website into `dist`.

## What is where

| File | What it is |
|---|---|
| `app/_layout.tsx` | The layout around every route: the root, the header, and the screen showing |
| `app/index.tsx` | The home screen, at `/` |
| `app/projects/index.tsx` | The list of projects, at `/projects` |
| `app/projects/[id].tsx` | One project, at `/projects/<id>`, with a trail of crumbs from the route |
| `src/header.tsx` | The bar over every screen, with a link to each destination |
| `src/routes.ts` | The destinations, and the words of each crumb |
| `src/families.ts` | The Helix families the app draws |
| `helix.json` | Your theme |

Each file under `app` is a route. A page writes Helix tags such as
`helix-card`. On the web each tag is the web element. On a phone,
`babel.config.js` gives your files `@fusion.dev/helix/jsx-runtime`, which draws
each tag as the native component of that name.

What one platform alone has is a pair of files, `.web.tsx` and `.native.tsx`:

| Module | Web | Phone |
|---|---|---|
| `src/root` | Helix's stylesheet and your theme | Your theme, Helix's icons, and the status bar |
| `src/navigator` | The route showing, in the document's flow | A stack of screens |
| `src/page` | A `main` landmark that the document scrolls | A scroll view |

## Change the theme

Set your brand color in `helix.json`, then write the theme for the web:

```sh
npm run theme
```

`theme` writes `src/theme.css` with every color in light and dark mode. A
development build derives the same colors on the phone from `helix.json`.

## Learn more

- [Helix documentation](https://fusion.dev/helix/docs)
- [Routing with Expo Router](https://fusion.dev/helix/docs/routing)
- [Expo Router documentation](https://docs.expo.dev/router/introduction/)
