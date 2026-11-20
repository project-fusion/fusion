import { headless, object, oneOf, Pressable, Text, View } from '../../../render.js'

/**
 * Sandbox Preview's headless tier: a frame that runs the source it is sent,
 * with a reload and an open button over it, and what the source threw drawn
 * over the stale example until the next source arrives.
 *
 * **It is the web's alone**, and its component draws nothing on a phone. It
 * runs a page of HTML, CSS and JavaScript in a sandboxed frame, which a phone
 * has no document to run. A phone's sandbox draws what its preview region
 * holds, as the gallery's examples pass one in.
 *
 * **Held to `helix-sandbox-preview`.** `helix system check` compares the
 * props, the events, the states, and the parts with what the manifest says
 * the element has.
 */
export default headless('sandbox-preview', {
  props: {
    cdn: 'https://esm.sh/',
    colorMode: oneOf(['dark', 'light']),
    controls: false,
    dependencies: object(),
    direction: oneOf(['rtl']),
    fallbackLabel: 'Preview',
    imports: object(),
    label: '',
    layout: oneOf(['centered', 'fullscreen', 'hug', 'padded']),
    modules: object(),
    openLabel: 'Open preview in a new tab',
    relay: '',
    reloadLabel: 'Reload preview',
    script: '',
    source: '',
    src: '',
    styles: '',
  },
  events: {
    console: ['level', 'text'],
    resize: ['size'],
  },
  states: ['blank', 'failed', 'loading', 'settled'],
  platform: 'web',
  render: ({ props }) => (
    <>
      <View
        label={props.label}
        part="frame"
      />
      <View part="error" />
      {props.controls && (
        <View part="controls">
          <Pressable
            label={props.reloadLabel}
            part="reload"
            role="button"
          >
            <Text part="reload-words">{props.reloadLabel}</Text>
          </Pressable>
          <Pressable
            label={props.openLabel}
            part="open"
            role="button"
          >
            <Text part="open-words">{props.openLabel}</Text>
          </Pressable>
        </View>
      )}
    </>
  ),
})
