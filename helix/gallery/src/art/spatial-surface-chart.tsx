import type { ReactNode } from 'react'

/**
 * A height over a grid, drawn as a ruled surface standing over its floor,
 * which is what a 3D surface answers: where a measure rises and falls over
 * two others at once.
 *
 * **Lit from the upper left in the three inks**: a face rising to the right
 * at 0.12, a level one at 0.28, and one falling away at 0.55, so the slopes
 * read as relief and the card stays monotone. Each face stands on an opaque
 * silhouette and is painted back to front, as the renderer's depth test
 * would, so a ridge in front hides the valley behind it.
 */
export const spatialSurfaceChartArt: ReactNode = (
  <>
    <path
      className="artStroke"
      d="M145.1 73.1L244.7 130.6L174.9 170.9L75.3 113.4Z"
      fill="none"
      opacity="0.28"
      strokeWidth="1"
    />
    <g key="0-0">
      <path className="artSurface" d="M145.1 67.1L155.0 72.6L145.1 77.2L135.1 72.7Z" />
      <path
        className="artInk"
        d="M145.1 67.1L155.0 72.6L145.1 77.2L135.1 72.7Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M145.1 67.1L155.0 72.6L145.1 77.2L135.1 72.7Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="0-1">
      <path className="artSurface" d="M135.1 72.7L145.1 77.2L135.1 81.0L125.1 78.2Z" />
      <path
        className="artInk"
        d="M135.1 72.7L145.1 77.2L135.1 81.0L125.1 78.2Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M135.1 72.7L145.1 77.2L135.1 81.0L125.1 78.2Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="1-0">
      <path className="artSurface" d="M155.0 72.6L165.0 77.3L155.0 77.8L145.1 77.2Z" />
      <path
        className="artInk"
        d="M155.0 72.6L165.0 77.3L155.0 77.8L145.1 77.2Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M155.0 72.6L165.0 77.3L155.0 77.8L145.1 77.2Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="0-2">
      <path className="artSurface" d="M125.1 78.2L135.1 81.0L125.1 85.9L115.2 83.9Z" />
      <path
        className="artInk"
        d="M125.1 78.2L135.1 81.0L125.1 85.9L115.2 83.9Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M125.1 78.2L135.1 81.0L125.1 85.9L115.2 83.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="1-1">
      <path className="artSurface" d="M145.1 77.2L155.0 77.8L145.1 74.3L135.1 81.0Z" />
      <path
        className="artInk"
        d="M145.1 77.2L155.0 77.8L145.1 74.3L135.1 81.0Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M145.1 77.2L155.0 77.8L145.1 74.3L135.1 81.0Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="2-0">
      <path className="artSurface" d="M165.0 77.3L174.9 81.1L165.0 74.6L155.0 77.8Z" />
      <path
        className="artInk"
        d="M165.0 77.3L174.9 81.1L165.0 74.6L155.0 77.8Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M165.0 77.3L174.9 81.1L165.0 74.6L155.0 77.8Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="0-3">
      <path className="artSurface" d="M115.2 83.9L125.1 85.9L115.2 93.3L105.2 89.8Z" />
      <path
        className="artInk"
        d="M115.2 83.9L125.1 85.9L115.2 93.3L105.2 89.8Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M115.2 83.9L125.1 85.9L115.2 93.3L105.2 89.8Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="1-2">
      <path className="artSurface" d="M135.1 81.0L145.1 74.3L135.1 76.4L125.1 85.9Z" />
      <path
        className="artInk"
        d="M135.1 81.0L145.1 74.3L135.1 76.4L125.1 85.9Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M135.1 81.0L145.1 74.3L135.1 76.4L125.1 85.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="2-1">
      <path className="artSurface" d="M155.0 77.8L165.0 74.6L155.0 58.2L145.1 74.3Z" />
      <path
        className="artInk"
        d="M155.0 77.8L165.0 74.6L155.0 58.2L145.1 74.3Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M155.0 77.8L165.0 74.6L155.0 58.2L145.1 74.3Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="3-0">
      <path className="artSurface" d="M174.9 81.1L184.9 86.1L174.9 76.9L165.0 74.6Z" />
      <path
        className="artInk"
        d="M174.9 81.1L184.9 86.1L174.9 76.9L165.0 74.6Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M174.9 81.1L184.9 86.1L174.9 76.9L165.0 74.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="0-4">
      <path className="artSurface" d="M105.2 89.8L115.2 93.3L105.2 100.8L95.3 95.8Z" />
      <path
        className="artInk"
        d="M105.2 89.8L115.2 93.3L105.2 100.8L95.3 95.8Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M105.2 89.8L115.2 93.3L105.2 100.8L95.3 95.8Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="1-3">
      <path className="artSurface" d="M125.1 85.9L135.1 76.4L125.1 89.6L115.2 93.3Z" />
      <path
        className="artInk"
        d="M125.1 85.9L135.1 76.4L125.1 89.6L115.2 93.3Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M125.1 85.9L135.1 76.4L125.1 89.6L115.2 93.3Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="2-2">
      <path className="artSurface" d="M145.1 74.3L155.0 58.2L145.1 55.4L135.1 76.4Z" />
      <path
        className="artInk"
        d="M145.1 74.3L155.0 58.2L145.1 55.4L135.1 76.4Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M145.1 74.3L155.0 58.2L145.1 55.4L135.1 76.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="3-1">
      <path className="artSurface" d="M165.0 74.6L174.9 76.9L165.0 55.6L155.0 58.2Z" />
      <path
        className="artInk"
        d="M165.0 74.6L174.9 76.9L165.0 55.6L155.0 58.2Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M165.0 74.6L174.9 76.9L165.0 55.6L155.0 58.2Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="4-0">
      <path className="artSurface" d="M184.9 86.1L194.9 93.4L184.9 89.7L174.9 76.9Z" />
      <path
        className="artInk"
        d="M184.9 86.1L194.9 93.4L184.9 89.7L174.9 76.9Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M184.9 86.1L194.9 93.4L184.9 89.7L174.9 76.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="0-5">
      <path className="artSurface" d="M95.3 95.8L105.2 100.8L95.3 107.2L85.3 101.6Z" />
      <path
        className="artInk"
        d="M95.3 95.8L105.2 100.8L95.3 107.2L85.3 101.6Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M95.3 95.8L105.2 100.8L95.3 107.2L85.3 101.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="1-4">
      <path className="artSurface" d="M115.2 93.3L125.1 89.6L115.2 103.6L105.2 100.8Z" />
      <path
        className="artInk"
        d="M115.2 93.3L125.1 89.6L115.2 103.6L105.2 100.8Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M115.2 93.3L125.1 89.6L115.2 103.6L105.2 100.8Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="2-3">
      <path className="artSurface" d="M135.1 76.4L145.1 55.4L135.1 78.7L125.1 89.6Z" />
      <path
        className="artInk"
        d="M135.1 76.4L145.1 55.4L135.1 78.7L125.1 89.6Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M135.1 76.4L145.1 55.4L135.1 78.7L125.1 89.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="3-2">
      <path className="artSurface" d="M155.0 58.2L165.0 55.6L155.0 50.9L145.1 55.4Z" />
      <path
        className="artInk"
        d="M155.0 58.2L165.0 55.6L155.0 50.9L145.1 55.4Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M155.0 58.2L165.0 55.6L155.0 50.9L145.1 55.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="4-1">
      <path className="artSurface" d="M174.9 76.9L184.9 89.7L174.9 78.5L165.0 55.6Z" />
      <path
        className="artInk"
        d="M174.9 76.9L184.9 89.7L174.9 78.5L165.0 55.6Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M174.9 76.9L184.9 89.7L174.9 78.5L165.0 55.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="5-0">
      <path className="artSurface" d="M194.9 93.4L204.8 100.8L194.9 103.5L184.9 89.7Z" />
      <path
        className="artInk"
        d="M194.9 93.4L204.8 100.8L194.9 103.5L184.9 89.7Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M194.9 93.4L204.8 100.8L194.9 103.5L184.9 89.7Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="0-6">
      <path className="artSurface" d="M85.3 101.6L95.3 107.2L85.3 113.1L75.3 107.4Z" />
      <path
        className="artInk"
        d="M85.3 101.6L95.3 107.2L85.3 113.1L75.3 107.4Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M85.3 101.6L95.3 107.2L85.3 113.1L75.3 107.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="1-5">
      <path className="artSurface" d="M105.2 100.8L115.2 103.6L105.2 112.5L95.3 107.2Z" />
      <path
        className="artInk"
        d="M105.2 100.8L115.2 103.6L105.2 112.5L95.3 107.2Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M105.2 100.8L115.2 103.6L105.2 112.5L95.3 107.2Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="2-4">
      <path className="artSurface" d="M125.1 89.6L135.1 78.7L125.1 104.1L115.2 103.6Z" />
      <path
        className="artInk"
        d="M125.1 89.6L135.1 78.7L125.1 104.1L115.2 103.6Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M125.1 89.6L135.1 78.7L125.1 104.1L115.2 103.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="3-3">
      <path className="artSurface" d="M145.1 55.4L155.0 50.9L145.1 78.0L135.1 78.7Z" />
      <path
        className="artInk"
        d="M145.1 55.4L155.0 50.9L145.1 78.0L135.1 78.7Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M145.1 55.4L155.0 50.9L145.1 78.0L135.1 78.7Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="4-2">
      <path className="artSurface" d="M165.0 55.6L174.9 78.5L165.0 77.6L155.0 50.9Z" />
      <path
        className="artInk"
        d="M165.0 55.6L174.9 78.5L165.0 77.6L155.0 50.9Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M165.0 55.6L174.9 78.5L165.0 77.6L155.0 50.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="5-1">
      <path className="artSurface" d="M184.9 89.7L194.9 103.5L184.9 103.6L174.9 78.5Z" />
      <path
        className="artInk"
        d="M184.9 89.7L194.9 103.5L184.9 103.6L174.9 78.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M184.9 89.7L194.9 103.5L184.9 103.6L174.9 78.5Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="6-0">
      <path className="artSurface" d="M204.8 100.8L214.8 107.2L204.8 112.4L194.9 103.5Z" />
      <path
        className="artInk"
        d="M204.8 100.8L214.8 107.2L204.8 112.4L194.9 103.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M204.8 100.8L214.8 107.2L204.8 112.4L194.9 103.5Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="1-6">
      <path className="artSurface" d="M95.3 107.2L105.2 112.5L95.3 118.8L85.3 113.1Z" />
      <path
        className="artInk"
        d="M95.3 107.2L105.2 112.5L95.3 118.8L85.3 113.1Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M95.3 107.2L105.2 112.5L95.3 118.8L85.3 113.1Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="2-5">
      <path className="artSurface" d="M115.2 103.6L125.1 104.1L115.2 117.4L105.2 112.5Z" />
      <path
        className="artInk"
        d="M115.2 103.6L125.1 104.1L115.2 117.4L105.2 112.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M115.2 103.6L125.1 104.1L115.2 117.4L105.2 112.5Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="3-4">
      <path className="artSurface" d="M135.1 78.7L145.1 78.0L135.1 107.8L125.1 104.1Z" />
      <path
        className="artInk"
        d="M135.1 78.7L145.1 78.0L135.1 107.8L125.1 104.1Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M135.1 78.7L145.1 78.0L135.1 107.8L125.1 104.1Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="4-3">
      <path className="artSurface" d="M155.0 50.9L165.0 77.6L155.0 96.4L145.1 78.0Z" />
      <path
        className="artInk"
        d="M155.0 50.9L165.0 77.6L155.0 96.4L145.1 78.0Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M155.0 50.9L165.0 77.6L155.0 96.4L145.1 78.0Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="5-2">
      <path className="artSurface" d="M174.9 78.5L184.9 103.6L174.9 105.9L165.0 77.6Z" />
      <path
        className="artInk"
        d="M174.9 78.5L184.9 103.6L174.9 105.9L165.0 77.6Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M174.9 78.5L184.9 103.6L174.9 105.9L165.0 77.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="6-1">
      <path className="artSurface" d="M194.9 103.5L204.8 112.4L194.9 116.5L184.9 103.6Z" />
      <path
        className="artInk"
        d="M194.9 103.5L204.8 112.4L194.9 116.5L184.9 103.6Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M194.9 103.5L204.8 112.4L194.9 116.5L184.9 103.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="7-0">
      <path className="artSurface" d="M214.8 107.2L224.7 113.1L214.8 118.8L204.8 112.4Z" />
      <path
        className="artInk"
        d="M214.8 107.2L224.7 113.1L214.8 118.8L204.8 112.4Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M214.8 107.2L224.7 113.1L214.8 118.8L204.8 112.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="2-6">
      <path className="artSurface" d="M105.2 112.5L115.2 117.4L105.2 124.5L95.3 118.8Z" />
      <path
        className="artInk"
        d="M105.2 112.5L115.2 117.4L105.2 124.5L95.3 118.8Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M105.2 112.5L115.2 117.4L105.2 124.5L95.3 118.8Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="3-5">
      <path className="artSurface" d="M125.1 104.1L135.1 107.8L125.1 122.9L115.2 117.4Z" />
      <path
        className="artInk"
        d="M125.1 104.1L135.1 107.8L125.1 122.9L115.2 117.4Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M125.1 104.1L135.1 107.8L125.1 122.9L115.2 117.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="4-4">
      <path className="artSurface" d="M145.1 78.0L155.0 96.4L145.1 117.0L135.1 107.8Z" />
      <path
        className="artInk"
        d="M145.1 78.0L155.0 96.4L145.1 117.0L135.1 107.8Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M145.1 78.0L155.0 96.4L145.1 117.0L135.1 107.8Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="5-3">
      <path className="artSurface" d="M165.0 77.6L174.9 105.9L165.0 112.7L155.0 96.4Z" />
      <path
        className="artInk"
        d="M165.0 77.6L174.9 105.9L165.0 112.7L155.0 96.4Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M165.0 77.6L174.9 105.9L165.0 112.7L155.0 96.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="6-2">
      <path className="artSurface" d="M184.9 103.6L194.9 116.5L184.9 117.1L174.9 105.9Z" />
      <path
        className="artInk"
        d="M184.9 103.6L194.9 116.5L184.9 117.1L174.9 105.9Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M184.9 103.6L194.9 116.5L184.9 117.1L174.9 105.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="7-1">
      <path className="artSurface" d="M204.8 112.4L214.8 118.8L204.8 123.4L194.9 116.5Z" />
      <path
        className="artInk"
        d="M204.8 112.4L214.8 118.8L204.8 123.4L194.9 116.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M204.8 112.4L214.8 118.8L204.8 123.4L194.9 116.5Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="8-0">
      <path className="artSurface" d="M224.7 113.1L234.7 118.9L224.7 124.6L214.8 118.8Z" />
      <path
        className="artInk"
        d="M224.7 113.1L234.7 118.9L224.7 124.6L214.8 118.8Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M224.7 113.1L234.7 118.9L224.7 124.6L214.8 118.8Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="3-6">
      <path className="artSurface" d="M115.2 117.4L125.1 122.9L115.2 130.2L105.2 124.5Z" />
      <path
        className="artInk"
        d="M115.2 117.4L125.1 122.9L115.2 130.2L105.2 124.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M115.2 117.4L125.1 122.9L115.2 130.2L105.2 124.5Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="4-5">
      <path className="artSurface" d="M135.1 107.8L145.1 117.0L135.1 128.9L125.1 122.9Z" />
      <path
        className="artInk"
        d="M135.1 107.8L145.1 117.0L135.1 128.9L125.1 122.9Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M135.1 107.8L145.1 117.0L135.1 128.9L125.1 122.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="5-4">
      <path className="artSurface" d="M155.0 96.4L165.0 112.7L155.0 121.4L145.1 117.0Z" />
      <path
        className="artInk"
        d="M155.0 96.4L165.0 112.7L155.0 121.4L145.1 117.0Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M155.0 96.4L165.0 112.7L155.0 121.4L145.1 117.0Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="6-3">
      <path className="artSurface" d="M174.9 105.9L184.9 117.1L174.9 111.5L165.0 112.7Z" />
      <path
        className="artInk"
        d="M174.9 105.9L184.9 117.1L174.9 111.5L165.0 112.7Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M174.9 105.9L184.9 117.1L174.9 111.5L165.0 112.7Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="7-2">
      <path className="artSurface" d="M194.9 116.5L204.8 123.4L194.9 122.6L184.9 117.1Z" />
      <path
        className="artInk"
        d="M194.9 116.5L204.8 123.4L194.9 122.6L184.9 117.1Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M194.9 116.5L204.8 123.4L194.9 122.6L184.9 117.1Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="8-1">
      <path className="artSurface" d="M214.8 118.8L224.7 124.6L214.8 129.8L204.8 123.4Z" />
      <path
        className="artInk"
        d="M214.8 118.8L224.7 124.6L214.8 129.8L204.8 123.4Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M214.8 118.8L224.7 124.6L214.8 129.8L204.8 123.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="9-0">
      <path className="artSurface" d="M234.7 118.9L244.7 124.6L234.7 130.4L224.7 124.6Z" />
      <path
        className="artInk"
        d="M234.7 118.9L244.7 124.6L234.7 130.4L224.7 124.6Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M234.7 118.9L244.7 124.6L234.7 130.4L224.7 124.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="4-6">
      <path className="artSurface" d="M125.1 122.9L135.1 128.9L125.1 135.9L115.2 130.2Z" />
      <path
        className="artInk"
        d="M125.1 122.9L135.1 128.9L125.1 135.9L115.2 130.2Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M125.1 122.9L135.1 128.9L125.1 135.9L115.2 130.2Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="5-5">
      <path className="artSurface" d="M145.1 117.0L155.0 121.4L145.1 131.7L135.1 128.9Z" />
      <path
        className="artInk"
        d="M145.1 117.0L155.0 121.4L145.1 131.7L135.1 128.9Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M145.1 117.0L155.0 121.4L145.1 131.7L135.1 128.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="6-4">
      <path className="artSurface" d="M165.0 112.7L174.9 111.5L165.0 111.2L155.0 121.4Z" />
      <path
        className="artInk"
        d="M165.0 112.7L174.9 111.5L165.0 111.2L155.0 121.4Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M165.0 112.7L174.9 111.5L165.0 111.2L155.0 121.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="7-3">
      <path className="artSurface" d="M184.9 117.1L194.9 122.6L184.9 112.1L174.9 111.5Z" />
      <path
        className="artInk"
        d="M184.9 117.1L194.9 122.6L184.9 112.1L174.9 111.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M184.9 117.1L194.9 122.6L184.9 112.1L174.9 111.5Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="8-2">
      <path className="artSurface" d="M204.8 123.4L214.8 129.8L204.8 132.3L194.9 122.6Z" />
      <path
        className="artInk"
        d="M204.8 123.4L214.8 129.8L204.8 132.3L194.9 122.6Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M204.8 123.4L214.8 129.8L204.8 132.3L194.9 122.6Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="9-1">
      <path className="artSurface" d="M224.7 124.6L234.7 130.4L224.7 136.0L214.8 129.8Z" />
      <path
        className="artInk"
        d="M224.7 124.6L234.7 130.4L224.7 136.0L214.8 129.8Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M224.7 124.6L234.7 130.4L224.7 136.0L214.8 129.8Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="5-6">
      <path className="artSurface" d="M135.1 128.9L145.1 131.7L135.1 140.7L125.1 135.9Z" />
      <path
        className="artInk"
        d="M135.1 128.9L145.1 131.7L135.1 140.7L125.1 135.9Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M135.1 128.9L145.1 131.7L135.1 140.7L125.1 135.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="6-5">
      <path className="artSurface" d="M155.0 121.4L165.0 111.2L155.0 126.7L145.1 131.7Z" />
      <path
        className="artInk"
        d="M155.0 121.4L165.0 111.2L155.0 126.7L145.1 131.7Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M155.0 121.4L165.0 111.2L155.0 126.7L145.1 131.7Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="7-4">
      <path className="artSurface" d="M174.9 111.5L184.9 112.1L174.9 108.7L165.0 111.2Z" />
      <path
        className="artInk"
        d="M174.9 111.5L184.9 112.1L174.9 108.7L165.0 111.2Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M174.9 111.5L184.9 112.1L174.9 108.7L165.0 111.2Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="8-3">
      <path className="artSurface" d="M194.9 122.6L204.8 132.3L194.9 130.0L184.9 112.1Z" />
      <path
        className="artInk"
        d="M194.9 122.6L204.8 132.3L194.9 130.0L184.9 112.1Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M194.9 122.6L204.8 132.3L194.9 130.0L184.9 112.1Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="9-2">
      <path className="artSurface" d="M214.8 129.8L224.7 136.0L214.8 141.2L204.8 132.3Z" />
      <path
        className="artInk"
        d="M214.8 129.8L224.7 136.0L214.8 141.2L204.8 132.3Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M214.8 129.8L224.7 136.0L214.8 141.2L204.8 132.3Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="6-6">
      <path className="artSurface" d="M145.1 131.7L155.0 126.7L145.1 143.5L135.1 140.7Z" />
      <path
        className="artInk"
        d="M145.1 131.7L155.0 126.7L145.1 143.5L135.1 140.7Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M145.1 131.7L155.0 126.7L145.1 143.5L135.1 140.7Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="7-5">
      <path className="artSurface" d="M165.0 111.2L174.9 108.7L165.0 127.3L155.0 126.7Z" />
      <path
        className="artInk"
        d="M165.0 111.2L174.9 108.7L165.0 127.3L155.0 126.7Z"
        fillOpacity="0.12"
      />
      <path
        className="artStroke"
        d="M165.0 111.2L174.9 108.7L165.0 127.3L155.0 126.7Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="8-4">
      <path className="artSurface" d="M184.9 112.1L194.9 130.0L184.9 131.1L174.9 108.7Z" />
      <path
        className="artInk"
        d="M184.9 112.1L194.9 130.0L184.9 131.1L174.9 108.7Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M184.9 112.1L194.9 130.0L184.9 131.1L174.9 108.7Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="9-3">
      <path className="artSurface" d="M204.8 132.3L214.8 141.2L204.8 145.5L194.9 130.0Z" />
      <path
        className="artInk"
        d="M204.8 132.3L214.8 141.2L204.8 145.5L194.9 130.0Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M204.8 132.3L214.8 141.2L204.8 145.5L194.9 130.0Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="7-6">
      <path className="artSurface" d="M155.0 126.7L165.0 127.3L155.0 147.9L145.1 143.5Z" />
      <path
        className="artInk"
        d="M155.0 126.7L165.0 127.3L155.0 147.9L145.1 143.5Z"
        fillOpacity="0.28"
      />
      <path
        className="artStroke"
        d="M155.0 126.7L165.0 127.3L155.0 147.9L145.1 143.5Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="8-5">
      <path className="artSurface" d="M174.9 108.7L184.9 131.1L174.9 143.3L165.0 127.3Z" />
      <path
        className="artInk"
        d="M174.9 108.7L184.9 131.1L174.9 143.3L165.0 127.3Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M174.9 108.7L184.9 131.1L174.9 143.3L165.0 127.3Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="9-4">
      <path className="artSurface" d="M194.9 130.0L204.8 145.5L194.9 150.4L184.9 131.1Z" />
      <path
        className="artInk"
        d="M194.9 130.0L204.8 145.5L194.9 150.4L184.9 131.1Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M194.9 130.0L204.8 145.5L194.9 150.4L184.9 131.1Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="8-6">
      <path className="artSurface" d="M165.0 127.3L174.9 143.3L165.0 156.4L155.0 147.9Z" />
      <path
        className="artInk"
        d="M165.0 127.3L174.9 143.3L165.0 156.4L155.0 147.9Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M165.0 127.3L174.9 143.3L165.0 156.4L155.0 147.9Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="9-5">
      <path className="artSurface" d="M184.9 131.1L194.9 150.4L184.9 157.3L174.9 143.3Z" />
      <path
        className="artInk"
        d="M184.9 131.1L194.9 150.4L184.9 157.3L174.9 143.3Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M184.9 131.1L194.9 150.4L184.9 157.3L174.9 143.3Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
    <g key="9-6">
      <path className="artSurface" d="M174.9 143.3L184.9 157.3L174.9 164.4L165.0 156.4Z" />
      <path
        className="artInk"
        d="M174.9 143.3L184.9 157.3L174.9 164.4L165.0 156.4Z"
        fillOpacity="0.55"
      />
      <path
        className="artStroke"
        d="M174.9 143.3L184.9 157.3L174.9 164.4L165.0 156.4Z"
        fill="none"
        opacity="0.45"
        strokeWidth="0.75"
      />
    </g>
  </>
)
