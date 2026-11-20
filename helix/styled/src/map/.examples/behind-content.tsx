/* The hero is a card the map fills: positioned, which is all `fill` asks of
   it, and as tall as its words and the padding around them. The padding's end
   keeps the map's controls clear, a column of buttons in that corner, and its
   bottom keeps the credit clear. The words are a card of their own, on a
   translucent ground so they read over any part of the map. */
export function Example() {
  return (
    <helix-card
      separation="plain"
      style={{
        '--card-border-width': '0px',
        '--card-padding':
          'var(--helix-space-2xl) calc(var(--helix-size-control-sm) + var(--helix-space-lg) + var(--helix-space-lg)) var(--helix-space-3xl) var(--helix-space-lg)',
        '--card-radius': '0px',
        position: 'relative',
      }}
    >
      {/* Preview frame: data-preview-map has the frame connect MapLibre, with landmarks: false; on your page, connectMap does. */}
      <helix-map
        credit-placement="bottom-end"
        data-preview-map
        data-preview-map-landmarks="false"
        fill
        gestures="cooperative"
        label="Downtown Austin"
        view="30.2672,-97.7431,13.5,40,0"
      >
        <div data-preview-map-canvas></div>
      </helix-map>

      <helix-card
        material="glass"
        separation="plain"
        style={{
          '--card-background-color': 'var(--helix-material-translucent)',
          '--card-color': 'var(--helix-color-foreground)',
          '--card-gap': 'var(--helix-space-sm)',
          '--card-padding': 'var(--helix-space-lg)',
          maxInlineSize: '26rem',
        }}
      >
        <helix-text
          as="h2"
          scale="heading"
        >
          Every stop, one map
        </helix-text>
        <helix-text as="p">
          The words decide how tall the hero is, and the map fills whatever that comes to behind
          them.
        </helix-text>
      </helix-card>
    </helix-card>
  )
}
