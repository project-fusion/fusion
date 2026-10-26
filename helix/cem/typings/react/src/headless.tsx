/** The headless tier's typings, beside the styled tier's in the same app. */
export function Headless() {
  return (
    <>
      <helix-headless-switch checked onhelix-before-check={(event) => event.detail.checked} />
      <helix-headless-switch
        // @ts-expect-error: a detail field the event does not carry
        onhelix-before-check={(event) => event.detail.value}
      />
      <helix-headless-button
        // @ts-expect-error: a styled-tier property the headless tier does not have
        emphasis="solid"
      />
    </>
  )
}
