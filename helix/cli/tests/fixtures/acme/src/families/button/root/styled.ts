import { oneOf } from '@fusion.dev/helix-neutral/render'
import { token } from '@fusion.dev/helix-neutral/style'
import { styles } from '@fusion.dev/helix-neutral/table'
import button from './headless.js'

/** Acme's button: solid in its accent, or an outline, with a ring for the keyboard. */
export default styles(
  button,
  {
    prefix: 'button',
    hooks: {
      paddingInline: token('space-md'),
      radius: token('radius-control'),
    },
    props: {
      emphasis: oneOf(['outlined', 'solid']),
    },
    stylesheet: 'button/root/button-root.generated.css',
  },
  ({ hook, on, rule, variants }) => [
    on('host', [rule({ display: 'inline-flex' })]),
    on('button', [
      rule({
        alignItems: 'center',
        backgroundColor: token('color-accent'),
        borderRadius: hook.radius,
        color: token('color-on-accent'),
        display: 'inline-flex',
        fontFamily: token('font-body'),
        fontSize: token('text-md'),
        paddingInline: hook.paddingInline,
        transition: ['background-color', token('duration-quick'), token('easing-out')],
      }),
      variants('emphasis', {
        outlined: {
          backgroundColor: 'transparent',
          borderColor: token('color-line'),
          color: token('color-ink'),
        },
      }),
      rule({ focusVisible: true }, { outline: ['2px', 'solid', token('color-focus')] }),
      rule({ disabled: true }, { opacity: 0.5 }),
    ]),
  ],
)
