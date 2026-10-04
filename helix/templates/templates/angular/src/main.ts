import { isDevMode } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'

/* A custom element registers as a side effect of being imported, so this line
   makes every Helix tag in the app real. Import the whole library while you are
   finding your feet. `@fusion.dev/helix/button` and its siblings are subpath
   exports, for when you want to pay for only what you use. The stylesheets are
   in `angular.json`, since Angular takes global styles there. */
import '@fusion.dev/helix'

import { App } from './app/app'
import { appConfig } from './app/app.config'

/* **Diagnostics in development only.** `ng serve` runs in development, and
   `ng build` in production, where `isDevMode()` is false and the chunk this
   imports is never requested. */
if (isDevMode()) {
  void import('./diagnostics')
}

bootstrapApplication(App, appConfig).catch((error: unknown) => console.error(error))
