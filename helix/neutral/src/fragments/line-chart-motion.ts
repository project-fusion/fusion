import { list, measured, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Line Chart's motion on the web, which a phone draws at once: the lines
 * drawing on as they arrive and moving to new readings over
 * `--chart-move-duration` along `--chart-move-easing`, the wash fading in, a
 * series a legend hides fading out where it stood, and the guide and the band
 * gliding from reading to reading over `--chart-glide-duration`.
 *
 * **It reads the privates the shared chart motion sheet sets** from the public
 * hooks, each with the token it stands for, as the motion audit reads it, and
 * reduced motion there puts everything in place at once.
 *
 * **A chart never animates through a value it does not have**, so every move
 * is along `decelerate`, which no frame overshoots.
 */
export default fragment(
  'line-chart-motion',
  {
    parts: [
      'area',
      'band',
      'gridline',
      'guide',
      'line',
      'marker',
      'marker-ring',
      'terminus',
      'tick',
    ],
  },
  ({ on, rule }) => {
    const easing = token('easing-decelerate')
    const move = measured('_chart-move-duration', token('duration-normal'))
    const moveEasing = measured('_chart-move-easing', easing)
    const arrive = measured('_chart-arrive-duration', token('duration-slow'))
    const glide = measured('_chart-glide-duration', token('duration-fast'))
    return [
      on('line', [
        web([
          rule({
            transition: list(
              ['d', move, moveEasing],
              ['stroke-dasharray', arrive, 'step-end', 'allow-discrete'],
              ['stroke-dashoffset', arrive, easing],
              ['opacity', move, moveEasing],
              ['visibility', move],
            ),
          }),
          rule(
            { startingStyle: true },
            { strokeDasharray: ['1000px', '100000px'], strokeDashoffset: '1000px' },
          ),
        ]),
      ]),
      on('area', [
        web([
          rule({
            transition: list(
              ['d', move, moveEasing],
              ['opacity', arrive, easing],
              ['visibility', arrive],
            ),
          }),
          rule({ startingStyle: true }, { opacity: 0 }),
          /* Faded out over the move, where its arrival fades it in over the
             slower arrival beat. */
          rule(
            { also: { 'area-hidden': true } },
            {
              transition: list(
                ['d', move, moveEasing],
                ['opacity', move, moveEasing],
                ['visibility', move],
              ),
            },
          ),
        ]),
      ]),
      /* **A series a legend hid fades out where it stood**, while the others
         and the scale move to fit what is left. The tier below keeps its
         line, wash, marks and terminus where they were last drawn, hidden,
         which the transitions here hold off until the fade has run. Shown
         again, it fades in and moves from there to its place on the scale of
         the moment. Safari moves no path's shape, so there it fades in at its
         new place. */
      on('line', [web([rule({ also: { 'line-hidden': true } }, { opacity: 0 })])]),
      on('area', [web([rule({ also: { 'area-hidden': true } }, { opacity: 0 })])]),
      on('marker', [web([rule({ also: { 'marker-hidden': true } }, { opacity: 0 })])]),
      on('marker-ring', [web([rule({ also: { 'marker-ring-hidden': true } }, { opacity: 0 })])]),
      /* The marks ride their line to its new shape, at its pace, and fade with it. */
      on(
        ['marker', 'marker-ring'],
        [
          web([
            rule({
              transition: list(
                ['d', move, moveEasing],
                ['opacity', move, moveEasing],
                ['visibility', move],
              ),
            }),
          ]),
        ],
      ),
      /* The mark of a hidden series fades out with its line, where it stood.
         It is `hidden` on the headless tier, where nothing fades it, and drawn
         here while it fades. Here and not in the shared terminus, since a
         Sparkline hides no series. */
      on('terminus', [
        web([rule({ also: { 'terminus-hidden': true } }, { display: 'block', opacity: 0 })]),
      ]),
      /* **Where the browser moves no path's shape, as in Safari, the scale
         takes its new levels at once**, with the lines it measures, as the
         terminus does. The levels a new scale adds or drops still fade. */
      on(
        ['tick', 'gridline'],
        [
          web([
            rule(
              { supports: 'not (d: path("M0 0"))' },
              { transitionProperty: 'opacity, visibility' },
            ),
          ]),
        ],
      ),
      /* **The guide and the band glide from reading to reading** as the
         pointer or the keys move, over `--chart-glide-duration` along a curve
         that slows as it arrives and never passes the reading. Each is drawn
         new where its reading is when a reading is shown from none, so
         neither slides in. */
      on(['guide', 'band'], [web([rule({ transition: list(['translate', glide, easing]) })])]),
    ]
  },
)
