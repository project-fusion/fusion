import type { ReactNode } from 'react'

/**
 * A floor shared out among blocks, each as large as its size and as tall as
 * a second measure, gathered into groups with a gap between them, which is
 * what a 3D treemap answers: how large each item is within its group, and
 * how it stands on another count.
 *
 * **In the three inks, lit from the upper left**, as the bar chart's bars:
 * each top at 0.12, the side facing left at 0.28, and the one facing right at
 * 0.55, on an opaque silhouette painted back to front, so a block in front
 * hides the one behind it.
 */
export const spatialTreemapArt: ReactNode = (
  <>
    <path
      className="artStroke"
      d="M160.0 52.0L260.0 109.7L160.0 167.4L60.0 109.7Z"
      fill="none"
      opacity="0.28"
      strokeWidth="1"
    />
    <g key="0">
      <path
        className="artSurface"
        d="M114.7 81.4L161.9 108.6L207.2 82.4L207.2 60.4L160.0 33.2L114.7 59.4Z"
      />
      <path
        className="artInk"
        d="M114.7 81.4L161.9 108.6L161.9 86.6L114.7 59.4Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M161.9 108.6L207.2 82.4L207.2 60.4L161.9 86.6Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M160.0 33.2L207.2 60.4L161.9 86.6L114.7 59.4Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="1">
      <path
        className="artSurface"
        d="M85.7 98.1L132.9 125.3L160.3 109.5L160.3 99.5L113.1 72.3L85.7 88.1Z"
      />
      <path
        className="artInk"
        d="M85.7 98.1L132.9 125.3L132.9 115.3L85.7 88.1Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M132.9 125.3L160.3 109.5L160.3 99.5L132.9 115.3Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M113.1 72.3L160.3 99.5L132.9 115.3L85.7 88.1Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="2">
      <path
        className="artSurface"
        d="M65.6 109.7L112.8 136.9L131.3 126.2L131.3 96.2L84.1 69.0L65.6 79.7Z"
      />
      <path
        className="artInk"
        d="M65.6 109.7L112.8 136.9L112.8 106.9L65.6 79.7Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M112.8 136.9L131.3 126.2L131.3 96.2L112.8 106.9Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M84.1 69.0L131.3 96.2L112.8 106.9L65.6 79.7Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="3">
      <path
        className="artSurface"
        d="M179.4 104.9L199.4 116.5L232.8 97.2L232.8 57.2L212.8 45.7L179.4 64.9Z"
      />
      <path
        className="artInk"
        d="M179.4 104.9L199.4 116.5L199.4 76.5L179.4 64.9Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M199.4 116.5L232.8 97.2L232.8 57.2L199.4 76.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M212.8 45.7L232.8 57.2L199.4 76.5L179.4 64.9Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="4">
      <path
        className="artSurface"
        d="M215.0 109.3L235.0 120.9L254.4 109.7L254.4 85.7L234.4 74.1L215.0 85.3Z"
      />
      <path
        className="artInk"
        d="M215.0 109.3L235.0 120.9L235.0 96.9L215.0 85.3Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M235.0 120.9L254.4 109.7L254.4 85.7L235.0 96.9Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M234.4 74.1L254.4 85.7L235.0 96.9L215.0 85.3Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="5">
      <path
        className="artSurface"
        d="M201.0 117.4L221.0 128.9L233.4 121.8L233.4 89.8L213.4 78.3L201.0 85.4Z"
      />
      <path
        className="artInk"
        d="M201.0 117.4L221.0 128.9L221.0 96.9L201.0 85.4Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M221.0 128.9L233.4 121.8L233.4 89.8L221.0 96.9Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M213.4 78.3L233.4 89.8L221.0 96.9L201.0 85.4Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="6">
      <path
        className="artSurface"
        d="M141.7 126.7L171.4 143.8L203.5 125.3L203.5 109.3L173.8 92.2L141.7 110.7Z"
      />
      <path
        className="artInk"
        d="M141.7 126.7L171.4 143.8L171.4 127.8L141.7 110.7Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M171.4 143.8L203.5 125.3L203.5 109.3L171.4 127.8Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M173.8 92.2L203.5 109.3L171.4 127.8L141.7 110.7Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="7">
      <path
        className="artSurface"
        d="M173.0 144.7L183.4 150.7L215.4 132.2L215.4 106.2L205.1 100.2L173.0 118.7Z"
      />
      <path
        className="artInk"
        d="M173.0 144.7L183.4 150.7L183.4 124.7L173.0 118.7Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M183.4 150.7L215.4 132.2L215.4 106.2L183.4 124.7Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M205.1 100.2L215.4 106.2L183.4 124.7L173.0 118.7Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="8">
      <path
        className="artSurface"
        d="M118.4 140.1L148.0 157.2L165.8 147.0L165.8 129.0L136.1 111.9L118.4 122.1Z"
      />
      <path
        className="artInk"
        d="M118.4 140.1L148.0 157.2L148.0 139.2L118.4 122.1Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M148.0 157.2L165.8 147.0L165.8 129.0L148.0 139.2Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M136.1 111.9L165.8 129.0L148.0 139.2L118.4 122.1Z"
        fillOpacity="0.12"
      />
    </g>
    <g key="9">
      <path
        className="artSurface"
        d="M149.6 158.2L160.0 164.2L177.8 153.9L177.8 141.9L167.4 135.9L149.6 146.2Z"
      />
      <path
        className="artInk"
        d="M149.6 158.2L160.0 164.2L160.0 152.2L149.6 146.2Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M160.0 164.2L177.8 153.9L177.8 141.9L160.0 152.2Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M167.4 135.9L177.8 141.9L160.0 152.2L149.6 146.2Z"
        fillOpacity="0.12"
      />
    </g>
  </>
)
