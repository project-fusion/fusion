import { headless, number, string, web } from '../../../render.js'

/**
 * Strands Stop's headless tier: pins a form of the ribbon to a section of a
 * page the ribbon travels down.
 *
 * **It draws nothing**, on either platform. On the web the ribbon reads its
 * stops to lay itself down the page; a phone has no page to lay it down, so
 * a stop there is never read. `for` names an element by its id, which a
 * phone has none of.
 *
 * **Held to `helix-strands-stop`.**
 */
export default headless('strands-stop', {
  props: {
    at: number(),
    for: web(string()),
    pattern: string(),
  },
  states: ['settled'],
  render: () => <></>,
})
