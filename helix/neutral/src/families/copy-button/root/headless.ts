import {
  bind,
  box,
  copy,
  derive,
  event,
  headless,
  live,
  not,
  pressable,
  prop,
  region,
  text,
  when,
  wrap,
} from '../../../tree.js'

/**
 * Copy Button's headless tier: a button that copies `value` to the clipboard
 * and confirms the copy.
 *
 * **A press copies, and the button says what became of it** for
 * `feedback-duration`: named by `copied-label` and drawing a check where
 * the text is on the clipboard, and by `error-label` with a cross where the
 * platform refused the write or there was nothing to copy. `copy` is sent
 * once the text is there, with it as `value`, and `copy-error` where it is
 * not. The same words are said to a screen reader.
 *
 * **The words show in a tooltip around the button**, which it draws: its
 * name on hover and focus and the result after a press on the web, the
 * result alone under `tooltip="copy"`, and none under `tooltip="none"`. A
 * phone has no hover, so it shows the result alone. `tooltip-placement` is
 * the side the bubble prefers. `show-label` draws the words beside the icon.
 *
 * **Named by `aria-label`, then `label`**, Copy. Icon Button's press and
 * look, under its own name: `pending` and `disabled` keep a press from
 * copying, and the icons passed into the default, `copied`, and `failed`
 * regions replace the clipboard, the check, and the cross.
 *
 * **The web's**: `from`, which copies from another element on the page by
 * its id, and `name`. A phone has no document to find an element in.
 *
 * **Held to `helix-copy-button`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('copy-button', {
  copy: copy({
    after: 'feedback-duration',
    copied: 'copied',
    failed: 'failed',
    fails: 'copy-error',
    says: 'says',
    sends: 'copy',
    text: 'value',
    told: 'told',
    words: { copied: 'copied-words', failed: 'failed-words', resting: 'name' },
  }),
  derived: {
    'copied-words': derive('copy-button-copied'),
    'failed-words': derive('copy-button-failed'),
    name: derive('copy-button-name'),
    tips: derive('copy-button-tips'),
  },
  events: [
    event('copy', { detail: ['value'] }),
    event('copy-error'),
    event('press', { detail: ['pointerType'] }),
  ],
  props: [
    prop('aria-label', 'string', { default: '' }),
    prop('copied-label', 'string', { default: 'Copied' }),
    prop('disabled', 'boolean', { default: false }),
    prop('error-label', 'string', { default: 'Could not copy' }),
    prop('feedback-duration', 'number', { default: 1600 }),
    prop('focusable', 'boolean', { attribute: false, default: true }),
    prop('focusable-when-disabled', 'boolean', { default: false }),
    prop('fallback-label', 'string', { default: 'Copy' }),
    prop('label', 'string', { default: '' }),
    prop('pending', 'boolean', { default: false }),
    prop('pending-label', 'string', { default: 'Loading' }),
    prop('show-label', 'boolean', { default: false }),
    prop('tooltip', ['copy', 'full', 'none']),
    prop(
      'tooltip-placement',
      [
        'bottom',
        'bottom-end',
        'bottom-start',
        'left',
        'left-end',
        'left-start',
        'right',
        'right-end',
        'right-start',
        'top',
        'top-end',
        'top-start',
      ],
      { default: 'top' },
    ),
    prop('value', 'string', { default: '' }),
    /* An element on the page by its id, and a form's name. */
    prop('from', 'string', { default: '', platform: 'web' }),
    prop('name', 'string', { default: '', platform: 'web' }),
  ],
  states: ['copied', 'failed', 'pending', 'pressed', 'settled'],
  tree: [
    wrap(
      'tooltip',
      {
        draws: 'tooltip',
        exports: {
          arrow: true,
          'arrow-bottom': true,
          'arrow-left': true,
          'arrow-right': true,
          'arrow-top': true,
          surface: true,
          'surface-bottom': true,
          'surface-left': true,
          'surface-right': true,
          'surface-top': true,
        },
        /* The result's words, shown while they stand. */
        gives: {
          content: bind('told'),
          open: bind('told'),
          persist: true,
          placement: bind('tooltip-placement'),
        },
        while: bind('tips'),
      },
      [
        pressable(
          'button',
          {
            busy: bind('pending'),
            copies: true,
            disabled: bind('disabled'),
            'focusable-when-disabled': bind('focusable-when-disabled'),
            label: bind('says'),
            role: 'button',
            sends: 'press',
          },
          [
            region('copied', { hidden: not('copied') }, [
              box('mark', { decorative: true, glyph: 'check' }),
            ]),
            region('failed', { hidden: not('failed') }, [
              box('mark', { decorative: true, glyph: 'x' }),
            ]),
            region('default', { hidden: bind('told') }, [
              box('mark', { decorative: true, glyph: 'copy' }),
            ]),
            when('pending', box('spinner', { decorative: true })),
            when(
              'show-label',
              box('text', { decorative: true }, [
                /* As wide as the widest of its three words, so the
                   button keeps its width as they change. */
                text('words', {
                  says: bind('says'),
                  widest: {
                    copied: bind('copied-words'),
                    failed: bind('failed-words'),
                    resting: bind('name'),
                  },
                }),
              ]),
            ),
          ],
        ),
      ],
    ),
    live('live', { says: bind('pending-label'), while: bind('pending') }),
  ],
})
