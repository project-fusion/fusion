import type { ReactNode } from 'react'

/**
 * Three ribbons, one behind another, each a band whose top follows its
 * values across, which is what a 3D ribbon chart answers: how several series
 * move over the same places, each in its own depth.
 *
 * **In the three inks, lit from the upper left**, as the bar chart's bars:
 * each piece of top at 0.12, the side facing left at 0.28, and the end
 * facing right at 0.55, on opaque faces painted back to front, so a ribbon
 * in front hides the one behind it.
 */
export const spatialRibbonChartArt: ReactNode = (
  <>
    <path
      className="artStroke"
      d="M115.0 72.0L250.0 150.0L200.0 178.9L65.0 100.9Z"
      fill="none"
      opacity="0.28"
      strokeWidth="1"
    />
    <g key="0">
      <path className="artSurface" d="M115.8 37.8L133.6 42.0L126.1 46.4L108.3 42.1Z" />
      <path
        className="artInk"
        d="M115.8 37.8L133.6 42.0L126.1 46.4L108.3 42.1Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M133.6 42.0L151.3 48.3L143.8 52.6L126.1 46.4Z" />
      <path
        className="artInk"
        d="M133.6 42.0L151.3 48.3L143.8 52.6L126.1 46.4Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M151.3 48.3L169.0 64.5L161.5 68.9L143.8 52.6Z" />
      <path
        className="artInk"
        d="M151.3 48.3L169.0 64.5L161.5 68.9L143.8 52.6Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M169.0 64.5L186.8 70.8L179.3 75.1L161.5 68.9Z" />
      <path
        className="artInk"
        d="M169.0 64.5L186.8 70.8L179.3 75.1L161.5 68.9Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M186.8 70.8L204.5 73.0L197.0 77.4L179.3 75.1Z" />
      <path
        className="artInk"
        d="M186.8 70.8L204.5 73.0L197.0 77.4L179.3 75.1Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M204.5 73.0L222.3 87.3L214.8 91.6L197.0 77.4Z" />
      <path
        className="artInk"
        d="M204.5 73.0L222.3 87.3L214.8 91.6L197.0 77.4Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M222.3 87.3L240.0 91.5L232.5 95.9L214.8 91.6Z" />
      <path
        className="artInk"
        d="M222.3 87.3L240.0 91.5L232.5 95.9L214.8 91.6Z"
        fillOpacity="0.12"
      />
      <path
        className="artSurface"
        d="M108.3 82.1L108.3 42.1L126.1 46.4L143.8 52.6L161.5 68.9L179.3 75.1L197.0 77.4L214.8 91.6L232.5 95.9L232.5 153.9Z"
      />
      <path
        className="artInk"
        d="M108.3 82.1L108.3 42.1L126.1 46.4L143.8 52.6L161.5 68.9L179.3 75.1L197.0 77.4L214.8 91.6L232.5 95.9L232.5 153.9Z"
        fillOpacity="0.28"
      />
      <path className="artSurface" d="M232.5 153.9L232.5 95.9L240.0 91.5L240.0 149.5Z" />
      <path
        className="artInk"
        d="M232.5 153.9L232.5 95.9L240.0 91.5L240.0 149.5Z"
        fillOpacity="0.55"
      />
    </g>
    <g key="1">
      <path className="artSurface" d="M99.2 57.4L116.9 71.7L109.4 76.0L91.7 61.7Z" />
      <path className="artInk" d="M99.2 57.4L116.9 71.7L109.4 76.0L91.7 61.7Z" fillOpacity="0.12" />
      <path className="artSurface" d="M116.9 71.7L134.6 73.9L127.1 78.2L109.4 76.0Z" />
      <path
        className="artInk"
        d="M116.9 71.7L134.6 73.9L127.1 78.2L109.4 76.0Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M134.6 73.9L152.4 80.2L144.9 84.5L127.1 78.2Z" />
      <path
        className="artInk"
        d="M134.6 73.9L152.4 80.2L144.9 84.5L127.1 78.2Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M152.4 80.2L170.1 96.4L162.6 100.7L144.9 84.5Z" />
      <path
        className="artInk"
        d="M152.4 80.2L170.1 96.4L162.6 100.7L144.9 84.5Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M170.1 96.4L187.9 110.7L180.4 115.0L162.6 100.7Z" />
      <path
        className="artInk"
        d="M170.1 96.4L187.9 110.7L180.4 115.0L162.6 100.7Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M187.9 110.7L205.6 112.9L198.1 117.2L180.4 115.0Z" />
      <path
        className="artInk"
        d="M187.9 110.7L205.6 112.9L198.1 117.2L180.4 115.0Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M205.6 112.9L223.4 119.2L215.9 123.5L198.1 117.2Z" />
      <path
        className="artInk"
        d="M205.6 112.9L223.4 119.2L215.9 123.5L198.1 117.2Z"
        fillOpacity="0.12"
      />
      <path
        className="artSurface"
        d="M91.7 91.7L91.7 61.7L109.4 76.0L127.1 78.2L144.9 84.5L162.6 100.7L180.4 115.0L198.1 117.2L215.9 123.5L215.9 163.5Z"
      />
      <path
        className="artInk"
        d="M91.7 91.7L91.7 61.7L109.4 76.0L127.1 78.2L144.9 84.5L162.6 100.7L180.4 115.0L198.1 117.2L215.9 123.5L215.9 163.5Z"
        fillOpacity="0.28"
      />
      <path className="artSurface" d="M215.9 163.5L215.9 123.5L223.4 119.2L223.4 159.2Z" />
      <path
        className="artInk"
        d="M215.9 163.5L215.9 123.5L223.4 119.2L223.4 159.2Z"
        fillOpacity="0.55"
      />
    </g>
    <g key="2">
      <path className="artSurface" d="M82.5 79.0L100.2 85.3L92.7 89.6L75.0 83.4Z" />
      <path className="artInk" d="M82.5 79.0L100.2 85.3L92.7 89.6L75.0 83.4Z" fillOpacity="0.12" />
      <path className="artSurface" d="M100.2 85.3L118.0 97.5L110.5 101.9L92.7 89.6Z" />
      <path
        className="artInk"
        d="M100.2 85.3L118.0 97.5L110.5 101.9L92.7 89.6Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M118.0 97.5L135.7 101.8L128.2 106.1L110.5 101.9Z" />
      <path
        className="artInk"
        d="M118.0 97.5L135.7 101.8L128.2 106.1L110.5 101.9Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M135.7 101.8L153.5 108.0L146.0 112.4L128.2 106.1Z" />
      <path
        className="artInk"
        d="M135.7 101.8L153.5 108.0L146.0 112.4L128.2 106.1Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M153.5 108.0L171.2 124.3L163.7 128.6L146.0 112.4Z" />
      <path
        className="artInk"
        d="M153.5 108.0L171.2 124.3L163.7 128.6L146.0 112.4Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M171.2 124.3L188.9 130.5L181.4 134.9L163.7 128.6Z" />
      <path
        className="artInk"
        d="M171.2 124.3L188.9 130.5L181.4 134.9L163.7 128.6Z"
        fillOpacity="0.12"
      />
      <path className="artSurface" d="M188.9 130.5L206.7 146.8L199.2 151.1L181.4 134.9Z" />
      <path
        className="artInk"
        d="M188.9 130.5L206.7 146.8L199.2 151.1L181.4 134.9Z"
        fillOpacity="0.12"
      />
      <path
        className="artSurface"
        d="M75.0 101.4L75.0 83.4L92.7 89.6L110.5 101.9L128.2 106.1L146.0 112.4L163.7 128.6L181.4 134.9L199.2 151.1L199.2 173.1Z"
      />
      <path
        className="artInk"
        d="M75.0 101.4L75.0 83.4L92.7 89.6L110.5 101.9L128.2 106.1L146.0 112.4L163.7 128.6L181.4 134.9L199.2 151.1L199.2 173.1Z"
        fillOpacity="0.28"
      />
      <path className="artSurface" d="M199.2 173.1L199.2 151.1L206.7 146.8L206.7 168.8Z" />
      <path
        className="artInk"
        d="M199.2 173.1L199.2 151.1L206.7 146.8L206.7 168.8Z"
        fillOpacity="0.55"
      />
    </g>
  </>
)
