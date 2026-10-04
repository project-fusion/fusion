import { Injectable, signal } from '@angular/core'

/* **The whole router, which is a hash and a listener.**

   Three pages need `location.hash` and one event. Swap this file for the
   Angular router when you want lazy routes or guards: `withHashLocation()`
   keeps these addresses.

   A hash, because the History API wants a server that answers every path with
   the same document, and wherever you deploy has to be told to. A hash asks
   nothing of it. Each link in the app is a plain anchor to `#/` and a path. */

/** The current path, read from the hash, so the first page is `/`. */
const read = (): string => window.location.hash.slice(1) || '/'

/** The current path, kept current as the hash changes. */
@Injectable({ providedIn: 'root' })
export class Pathname {
  readonly current = signal(read())

  constructor() {
    window.addEventListener('hashchange', () => this.current.set(read()))
  }
}
