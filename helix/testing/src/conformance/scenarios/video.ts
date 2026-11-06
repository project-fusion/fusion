import { el, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Video, a player whose bar Helix draws. A scenario plays no
 * media, which neither half can load the same way, so the record says what a
 * press asks for, the next and the previous video, and what the keys do over
 * a video whose length is not known yet. Playing, pausing, seeking, and the
 * captions go through the media capability, which a jest spec of the phone
 * holds with a fake.
 */

/** A player with nothing loaded. */
const video = (props: Readonly<Record<string, PropValue>> = {}): Setup =>
  el('helix-video', { label: 'Lesson', ...props }, [])

const press = (label: string) => ({ kind: 'press' as const, label })
const key = (name: string) => ({ key: name, kind: 'key' as const })

/** Videos: asking for the next and the previous, and the keys before a length is known. */
export const VIDEO: readonly Scenario[] = [
  {
    family: 'video',
    intents: [press('Next'), press('Previous'), press('Next')],
    name: 'the extra controls ask for the next and the previous video',
    setup: video({ 'extra-controls': 'previous next' }),
  },
  {
    family: 'video',
    intents: [key('ArrowRight'), key('Home'), key('End'), key('5')],
    name: 'the keys before the length is known move nowhere',
    setup: video(),
  },
]
