'use client'

import { Projects } from '../../../../../../../helix/app/proof/index'
import sheet from './proof-page.module.css'

/* **Drawn on the server and hydrated.** React binds no custom element event
   prop, such as `onhelix-action`, when it hydrates one the server drew. Each
   Helix element binds the handlers React holds as it sends an event, on
   itself and on the ancestors the event reaches, so a row's press reaches
   the list's handler. */

/** The dashboard, in a column the width of a reading page. */
export function ProofPage() {
  return (
    <main className={sheet.page}>
      <Projects />
    </main>
  )
}
