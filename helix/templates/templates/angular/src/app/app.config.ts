import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core'

/* No zone.js, which Angular no longer needs: a signal that changes is what
   updates a view, so the Helix elements' own events and timers start no
   change detection of their own. */
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
}
