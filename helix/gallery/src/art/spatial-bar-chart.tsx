import type { ReactNode } from 'react'

/**
 * A grid of bars, each a block as tall as its value, categories across and
 * series in depth, which is what a 3D bar chart answers: how one measure
 * stands across two sets of names at once.
 *
 * **In the three inks, lit from the upper left**, as the heatmap's relief:
 * each top at 0.12, the side facing left at 0.28, and the one facing right
 * at 0.55, on an opaque silhouette painted back to front, so a bar in
 * front hides the one behind it.
 */
export const spatialBarChartArt: ReactNode = (
  <>
    <path
      className="artStroke"
      d="M136.7 67.4L253.2 134.6L183.3 175.0L66.8 107.7Z"
      fill="none"
      opacity="0.28"
      strokeWidth="1"
    />
    <g key="0-0">
      <path
        className="artSurface"
        d="M122.7 33.1L136.7 25.0L150.7 33.1L150.7 80.8L136.7 88.9L122.7 80.8Z"
      />
      <path
        className="artInk"
        d="M122.7 80.8L136.7 88.9L136.7 41.1L122.7 33.1Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M136.7 88.9L150.7 80.8L150.7 33.1L136.7 41.1Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M122.7 33.1L136.7 41.1L150.7 33.1L136.7 25.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="0-1">
      <path
        className="artSurface"
        d="M99.4 41.4L113.4 33.3L127.4 41.4L127.4 94.3L113.4 102.4L99.4 94.3Z"
      />
      <path
        className="artInk"
        d="M99.4 94.3L113.4 102.4L113.4 49.5L99.4 41.4Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M113.4 102.4L127.4 94.3L127.4 41.4L113.4 49.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M99.4 41.4L113.4 49.5L127.4 41.4L113.4 33.3Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="1-0">
      <path
        className="artSurface"
        d="M146.0 59.0L160.0 51.0L174.0 59.0L174.0 94.3L160.0 102.4L146.0 94.3Z"
      />
      <path
        className="artInk"
        d="M146.0 94.3L160.0 102.4L160.0 67.1L146.0 59.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M160.0 102.4L174.0 94.3L174.0 59.0L160.0 67.1Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M146.0 59.0L160.0 67.1L174.0 59.0L160.0 51.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="0-2">
      <path
        className="artSurface"
        d="M76.1 49.7L90.1 41.7L104.1 49.7L104.1 107.7L90.1 115.8L76.1 107.7Z"
      />
      <path className="artInk" d="M76.1 107.7L90.1 115.8L90.1 57.8L76.1 49.7Z" fillOpacity="0.28" />
      <path
        className="artInk"
        d="M90.1 115.8L104.1 107.7L104.1 49.7L90.1 57.8Z"
        fillOpacity="0.55"
      />
      <path className="artInk" d="M76.1 49.7L90.1 57.8L104.1 49.7L90.1 41.7Z" fillOpacity="0.12" />
    </g>
    <g key="1-1">
      <path
        className="artSurface"
        d="M122.7 67.4L136.7 59.3L150.7 67.4L150.7 107.7L136.7 115.8L122.7 107.7Z"
      />
      <path
        className="artInk"
        d="M122.7 107.7L136.7 115.8L136.7 75.4L122.7 67.4Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M136.7 115.8L150.7 107.7L150.7 67.4L136.7 75.4Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M122.7 67.4L136.7 75.4L150.7 67.4L136.7 59.3Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="2-0">
      <path
        className="artSurface"
        d="M169.3 48.6L183.3 40.5L197.3 48.6L197.3 107.7L183.3 115.8L169.3 107.7Z"
      />
      <path
        className="artInk"
        d="M169.3 107.7L183.3 115.8L183.3 56.7L169.3 48.6Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M183.3 115.8L197.3 107.7L197.3 48.6L183.3 56.7Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M169.3 48.6L183.3 56.7L197.3 48.6L183.3 40.5Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="1-2">
      <path
        className="artSurface"
        d="M99.4 82.5L113.4 74.5L127.4 82.5L127.4 121.2L113.4 129.3L99.4 121.2Z"
      />
      <path
        className="artInk"
        d="M99.4 121.2L113.4 129.3L113.4 90.6L99.4 82.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M113.4 129.3L127.4 121.2L127.4 82.5L113.4 90.6Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M99.4 82.5L113.4 90.6L127.4 82.5L113.4 74.5Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="2-1">
      <path
        className="artSurface"
        d="M146.0 57.5L160.0 49.4L174.0 57.5L174.0 121.2L160.0 129.3L146.0 121.2Z"
      />
      <path
        className="artInk"
        d="M146.0 121.2L160.0 129.3L160.0 65.6L146.0 57.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M160.0 129.3L174.0 121.2L174.0 57.5L160.0 65.6Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M146.0 57.5L160.0 65.6L174.0 57.5L160.0 49.4Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="3-0">
      <path
        className="artSurface"
        d="M192.6 91.6L206.6 83.6L220.6 91.6L220.6 121.2L206.6 129.3L192.6 121.2Z"
      />
      <path
        className="artInk"
        d="M192.6 121.2L206.6 129.3L206.6 99.7L192.6 91.6Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M206.6 129.3L220.6 121.2L220.6 91.6L206.6 99.7Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M192.6 91.6L206.6 99.7L220.6 91.6L206.6 83.6Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="2-2">
      <path
        className="artSurface"
        d="M122.7 64.7L136.7 56.6L150.7 64.7L150.7 134.6L136.7 142.7L122.7 134.6Z"
      />
      <path
        className="artInk"
        d="M122.7 134.6L136.7 142.7L136.7 72.8L122.7 64.7Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M136.7 142.7L150.7 134.6L150.7 64.7L136.7 72.8Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M122.7 64.7L136.7 72.8L150.7 64.7L136.7 56.6Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="3-1">
      <path
        className="artSurface"
        d="M169.3 100.5L183.3 92.5L197.3 100.5L197.3 134.6L183.3 142.7L169.3 134.6Z"
      />
      <path
        className="artInk"
        d="M169.3 134.6L183.3 142.7L183.3 108.6L169.3 100.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M183.3 142.7L197.3 134.6L197.3 100.5L183.3 108.6Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M169.3 100.5L183.3 108.6L197.3 100.5L183.3 92.5Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="4-0">
      <path
        className="artSurface"
        d="M215.9 114.2L229.9 106.1L243.9 114.2L243.9 134.6L229.9 142.7L215.9 134.6Z"
      />
      <path
        className="artInk"
        d="M215.9 134.6L229.9 142.7L229.9 122.2L215.9 114.2Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M229.9 142.7L243.9 134.6L243.9 114.2L229.9 122.2Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M215.9 114.2L229.9 122.2L243.9 114.2L229.9 106.1Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="3-2">
      <path
        className="artSurface"
        d="M146.0 108.9L160.0 100.8L174.0 108.9L174.0 148.1L160.0 156.2L146.0 148.1Z"
      />
      <path
        className="artInk"
        d="M146.0 148.1L160.0 156.2L160.0 116.9L146.0 108.9Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M160.0 156.2L174.0 148.1L174.0 108.9L160.0 116.9Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M146.0 108.9L160.0 116.9L174.0 108.9L160.0 100.8Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="4-1">
      <path
        className="artSurface"
        d="M192.6 124.2L206.6 116.1L220.6 124.2L220.6 148.1L206.6 156.2L192.6 148.1Z"
      />
      <path
        className="artInk"
        d="M192.6 148.1L206.6 156.2L206.6 132.3L192.6 124.2Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M206.6 156.2L220.6 148.1L220.6 124.2L206.6 132.3Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M192.6 124.2L206.6 132.3L220.6 124.2L206.6 116.1Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="4-2">
      <path
        className="artSurface"
        d="M169.3 138.2L183.3 130.2L197.3 138.2L197.3 161.5L183.3 169.6L169.3 161.5Z"
      />
      <path
        className="artInk"
        d="M169.3 161.5L183.3 169.6L183.3 146.3L169.3 138.2Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M183.3 169.6L197.3 161.5L197.3 138.2L183.3 146.3Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M169.3 138.2L183.3 146.3L197.3 138.2L183.3 130.2Z"
        fillOpacity="0.12"
      />
    </g>
  </>
)
