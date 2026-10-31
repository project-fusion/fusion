import {
  Announce,
  cancelable,
  headless,
  numberOrString,
  oneOf,
  Pressable,
  Repeat,
  Slot,
  time,
  View,
  web,
} from '../../../render.js'

/**
 * Carousel's headless tier: one slide of several, with controls to move
 * between them.
 *
 * **The track is a scroller that snaps**, so a swipe and its glide are the
 * platform's own on both, and the controls scroll the track. A reader's swipe
 * moves the index once the track comes to rest, through the same refusable
 * request as a press of Next, and a refusal puts the track back.
 *
 * **Each slide stands in a pane the element draws**, which carries the group
 * role and the name saying where it stands, so a slide that is a link stays a
 * link. On the web the slide is assigned into the pane's slot. On a phone the
 * slot in each pane draws its slide.
 *
 * **`per-view` decides how many places the track stops**, and core counts them
 * on both platforms. `auto` fits as many as the track holds at
 * `--carousel-slide-min`, which a phone reads from the host's `style`.
 *
 * **Rotation stops on focus and on a touch or a hover, and stays stopped**
 * until the reader starts it again.
 *
 * **Web only:** `mouse-drag`, since a finger needs no such thing, its
 * `dragging` state, and the live part, which on a phone is the platform's
 * announcement.
 */
export default headless('carousel', {
  props: {
    autoplay: false,
    controls: oneOf(['always', 'auto', 'none']),
    defaultIndex: 0,
    fallbackLabel: 'Slides',
    index: 0,
    indicatorLabel: 'Slide {index}',
    indicatorsLabel: '{label} slides',
    interval: time('5s'),
    label: '',
    loop: false,
    mouseDrag: web(false),
    nextLabel: 'Next slide',
    orientation: oneOf(['horizontal', 'vertical']),
    perView: numberOrString(),
    previousLabel: 'Previous slide',
    roleLabel: 'carousel',
    slideLabel: '{index} of {count}',
    slideRoleLabel: 'slide',
    slidesPerMove: 1,
    startLabel: 'Start slide rotation',
    stopLabel: 'Stop slide rotation',
  },
  events: {
    activate: ['value'],
    beforeActivate: cancelable(['value']),
  },
  states: ['dragging', 'settled'],
  carousel: {
    arrows: 'arrows',
    atEnd: 'atEnd',
    atStart: 'atStart',
    autoplay: 'autoplay',
    controls: 'controls',
    defaultIndex: 'defaultIndex',
    dotsName: 'dotsName',
    dotted: 'dotted',
    fallbackLabel: 'fallbackLabel',
    index: 'index',
    indicatorLabel: 'indicatorLabel',
    indicatorsLabel: 'indicatorsLabel',
    interval: 'interval',
    label: 'label',
    loop: 'loop',
    named: 'named',
    nextLabel: 'nextLabel',
    onActivate: 'activate',
    onBeforeActivate: 'beforeActivate',
    orientation: 'orientation',
    panes: 'panes',
    perView: 'perView',
    previousLabel: 'previousLabel',
    roleLabel: 'roleLabel',
    rotationIcon: 'rotationIcon',
    rotationName: 'rotationName',
    rotationShown: 'rotationShown',
    slideLabel: 'slideLabel',
    slideRoleLabel: 'slideRoleLabel',
    slidesPerMove: 'slidesPerMove',
    spoken: 'spoken',
    startLabel: 'startLabel',
    stopLabel: 'stopLabel',
    stops: 'stops',
  },
  render: ({ carousel, entry, props }) => (
    <>
      <View part="controls">
        {carousel.rotationShown && (
          <Pressable
            label={carousel.rotationName}
            part="rotation"
            role="button"
          >
            <View
              ariaHidden
              icon={carousel.rotationIcon}
              part="rotation-mark"
            />
          </Pressable>
        )}
        {carousel.arrows && (
          <Pressable
            disabled={carousel.atStart}
            focusable-when-disabled
            label={props.previousLabel}
            part="previous"
            role="button"
          >
            <Slot name="previous-icon">
              <View
                ariaHidden
                icon="caret-left"
                part="previous-mark"
              />
            </Slot>
          </Pressable>
        )}
        {carousel.arrows && (
          <Pressable
            disabled={carousel.atEnd}
            focusable-when-disabled
            label={props.nextLabel}
            part="next"
            role="button"
          >
            <Slot name="next-icon">
              <View
                ariaHidden
                icon="caret-right"
                part="next-mark"
              />
            </Slot>
          </Pressable>
        )}
      </View>
      <View part="track">
        <Repeat
          each={carousel.panes}
          key="key"
          part="panes"
        >
          <View
            description={props.slideRoleLabel}
            label={entry.label}
            part="slide"
            role="group"
          >
            <Slot />
          </View>
        </Repeat>
      </View>
      <Announce
        part="live"
        platform="web"
      />
      {carousel.dotted && (
        <View
          label={carousel.dotsName}
          part="indicators"
          role="group"
        >
          <Repeat
            each={carousel.stops}
            key="key"
            part="dots"
          >
            <Pressable
              also={{ 'indicator-current': true }}
              current={entry.current}
              data-current={entry.current}
              label={entry.label}
              part="indicator"
              role="button"
            />
          </Repeat>
        </View>
      )}
    </>
  ),
})
