import type { CSSProperties, ReactNode } from 'react'

/**
 * Eight weeks of four days, each a prism as tall as its reading, which is the
 * whole of what separates this family from the flat heatmap.
 *
 * **Lit from the upper left in the three inks**: every top at 0.12, every left
 * face at 0.28, and every right face at 0.55, so height alone carries the
 * reading and the card stays monotone. A day with nothing in it is a sunken
 * tile on the floor.
 *
 * **Each prism stands on an opaque silhouette.** The inks are translucent, so
 * without one a prism in front showed the one behind it through its faces, and
 * the relief read as glass. The prisms are painted in the order of the
 * readings, back to front, as the component paints them. `artRow` staggers
 * each week.
 */
export const spatialHeatmapArt: ReactNode = (
  <>
    <g className="artMotion artRow" key="0-0" style={{ '--art-i': 0 } as CSSProperties}>
      <path
        className="artSurface"
        d="M125.3 47.5L140.0 56.0L140.0 68.0L125.3 76.5L110.6 68.0L110.6 56.0Z"
      />
      <path
        className="artInk"
        d="M110.6 56.0L125.3 64.5L125.3 76.5L110.6 68.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M125.3 64.5L140.0 56.0L140.0 68.0L125.3 76.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M125.3 47.5L140.0 56.0L125.3 64.5L110.6 56.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="0-1" style={{ '--art-i': 0 } as CSSProperties}>
      <path
        className="artSurface"
        d="M108.0 45.5L122.7 54.0L122.7 78.0L108.0 86.5L93.3 78.0L93.3 54.0Z"
      />
      <path className="artInk" d="M93.3 54.0L108.0 62.5L108.0 86.5L93.3 78.0Z" fillOpacity="0.28" />
      <path
        className="artInk"
        d="M108.0 62.5L122.7 54.0L122.7 78.0L108.0 86.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M108.0 45.5L122.7 54.0L108.0 62.5L93.3 54.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="0-2" style={{ '--art-i': 0 } as CSSProperties}>
      <path className="artSunken" d="M90.7 79.5L105.4 88.0L90.7 96.5L75.9 88.0Z" />
    </g>
    <g className="artMotion artRow" key="0-3" style={{ '--art-i': 0 } as CSSProperties}>
      <path
        className="artSurface"
        d="M73.3 77.5L88.1 86.0L88.1 98.0L73.3 106.5L58.6 98.0L58.6 86.0Z"
      />
      <path className="artInk" d="M58.6 86.0L73.3 94.5L73.3 106.5L58.6 98.0Z" fillOpacity="0.28" />
      <path className="artInk" d="M73.3 94.5L88.1 86.0L88.1 98.0L73.3 106.5Z" fillOpacity="0.55" />
      <path className="artInk" d="M73.3 77.5L88.1 86.0L73.3 94.5L58.6 86.0Z" fillOpacity="0.12" />
    </g>
    <g className="artMotion artRow" key="1-0" style={{ '--art-i': 1 } as CSSProperties}>
      <path
        className="artSurface"
        d="M142.6 45.5L157.3 54.0L157.3 78.0L142.6 86.5L127.9 78.0L127.9 54.0Z"
      />
      <path
        className="artInk"
        d="M127.9 54.0L142.6 62.5L142.6 86.5L127.9 78.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M142.6 62.5L157.3 54.0L157.3 78.0L142.6 86.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M142.6 45.5L157.3 54.0L142.6 62.5L127.9 54.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="1-1" style={{ '--art-i': 1 } as CSSProperties}>
      <path
        className="artSurface"
        d="M125.3 43.5L140.0 52.0L140.0 88.0L125.3 96.5L110.6 88.0L110.6 52.0Z"
      />
      <path
        className="artInk"
        d="M110.6 52.0L125.3 60.5L125.3 96.5L110.6 88.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M125.3 60.5L140.0 52.0L140.0 88.0L125.3 96.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M125.3 43.5L140.0 52.0L125.3 60.5L110.6 52.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="1-2" style={{ '--art-i': 1 } as CSSProperties}>
      <path
        className="artSurface"
        d="M108.0 77.5L122.7 86.0L122.7 98.0L108.0 106.5L93.3 98.0L93.3 86.0Z"
      />
      <path
        className="artInk"
        d="M93.3 86.0L108.0 94.5L108.0 106.5L93.3 98.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M108.0 94.5L122.7 86.0L122.7 98.0L108.0 106.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M108.0 77.5L122.7 86.0L108.0 94.5L93.3 86.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="1-3" style={{ '--art-i': 1 } as CSSProperties}>
      <path className="artSunken" d="M90.7 99.5L105.4 108.0L90.7 116.5L75.9 108.0Z" />
    </g>
    <g className="artMotion artRow" key="2-0" style={{ '--art-i': 2 } as CSSProperties}>
      <path
        className="artSurface"
        d="M159.9 67.5L174.7 76.0L174.7 88.0L159.9 96.5L145.2 88.0L145.2 76.0Z"
      />
      <path
        className="artInk"
        d="M145.2 76.0L159.9 84.5L159.9 96.5L145.2 88.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M159.9 84.5L174.7 76.0L174.7 88.0L159.9 96.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M159.9 67.5L174.7 76.0L159.9 84.5L145.2 76.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="2-1" style={{ '--art-i': 2 } as CSSProperties}>
      <path
        className="artSurface"
        d="M142.6 53.5L157.3 62.0L157.3 98.0L142.6 106.5L127.9 98.0L127.9 62.0Z"
      />
      <path
        className="artInk"
        d="M127.9 62.0L142.6 70.5L142.6 106.5L127.9 98.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M142.6 70.5L157.3 62.0L157.3 98.0L142.6 106.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M142.6 53.5L157.3 62.0L142.6 70.5L127.9 62.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="2-2" style={{ '--art-i': 2 } as CSSProperties}>
      <path
        className="artSurface"
        d="M125.3 75.5L140.0 84.0L140.0 108.0L125.3 116.5L110.6 108.0L110.6 84.0Z"
      />
      <path
        className="artInk"
        d="M110.6 84.0L125.3 92.5L125.3 116.5L110.6 108.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M125.3 92.5L140.0 84.0L140.0 108.0L125.3 116.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M125.3 75.5L140.0 84.0L125.3 92.5L110.6 84.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="2-3" style={{ '--art-i': 2 } as CSSProperties}>
      <path
        className="artSurface"
        d="M108.0 97.5L122.7 106.0L122.7 118.0L108.0 126.5L93.3 118.0L93.3 106.0Z"
      />
      <path
        className="artInk"
        d="M93.3 106.0L108.0 114.5L108.0 126.5L93.3 118.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M108.0 114.5L122.7 106.0L122.7 118.0L108.0 126.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M108.0 97.5L122.7 106.0L108.0 114.5L93.3 106.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="3-0" style={{ '--art-i': 3 } as CSSProperties}>
      <path className="artSunken" d="M177.3 89.5L192.0 98.0L177.3 106.5L162.5 98.0Z" />
    </g>
    <g className="artMotion artRow" key="3-1" style={{ '--art-i': 3 } as CSSProperties}>
      <path
        className="artSurface"
        d="M159.9 75.5L174.7 84.0L174.7 108.0L159.9 116.5L145.2 108.0L145.2 84.0Z"
      />
      <path
        className="artInk"
        d="M145.2 84.0L159.9 92.5L159.9 116.5L145.2 108.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M159.9 92.5L174.7 84.0L174.7 108.0L159.9 116.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M159.9 75.5L174.7 84.0L159.9 92.5L145.2 84.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="3-2" style={{ '--art-i': 3 } as CSSProperties}>
      <path
        className="artSurface"
        d="M142.6 73.5L157.3 82.0L157.3 118.0L142.6 126.5L127.9 118.0L127.9 82.0Z"
      />
      <path
        className="artInk"
        d="M127.9 82.0L142.6 90.5L142.6 126.5L127.9 118.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M142.6 90.5L157.3 82.0L157.3 118.0L142.6 126.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M142.6 73.5L157.3 82.0L142.6 90.5L127.9 82.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="3-3" style={{ '--art-i': 3 } as CSSProperties}>
      <path
        className="artSurface"
        d="M125.3 95.5L140.0 104.0L140.0 128.0L125.3 136.5L110.6 128.0L110.6 104.0Z"
      />
      <path
        className="artInk"
        d="M110.6 104.0L125.3 112.5L125.3 136.5L110.6 128.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M125.3 112.5L140.0 104.0L140.0 128.0L125.3 136.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M125.3 95.5L140.0 104.0L125.3 112.5L110.6 104.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="4-0" style={{ '--art-i': 0 } as CSSProperties}>
      <path
        className="artSurface"
        d="M194.6 87.5L209.3 96.0L209.3 108.0L194.6 116.5L179.9 108.0L179.9 96.0Z"
      />
      <path
        className="artInk"
        d="M179.9 96.0L194.6 104.5L194.6 116.5L179.9 108.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M194.6 104.5L209.3 96.0L209.3 108.0L194.6 116.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M194.6 87.5L209.3 96.0L194.6 104.5L179.9 96.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="4-1" style={{ '--art-i': 0 } as CSSProperties}>
      <path
        className="artSurface"
        d="M177.3 97.5L192.0 106.0L192.0 118.0L177.3 126.5L162.5 118.0L162.5 106.0Z"
      />
      <path
        className="artInk"
        d="M162.5 106.0L177.3 114.5L177.3 126.5L162.5 118.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M177.3 114.5L192.0 106.0L192.0 118.0L177.3 126.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M177.3 97.5L192.0 106.0L177.3 114.5L162.5 106.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="4-2" style={{ '--art-i': 0 } as CSSProperties}>
      <path
        className="artSurface"
        d="M159.9 95.5L174.7 104.0L174.7 128.0L159.9 136.5L145.2 128.0L145.2 104.0Z"
      />
      <path
        className="artInk"
        d="M145.2 104.0L159.9 112.5L159.9 136.5L145.2 128.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M159.9 112.5L174.7 104.0L174.7 128.0L159.9 136.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M159.9 95.5L174.7 104.0L159.9 112.5L145.2 104.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="4-3" style={{ '--art-i': 0 } as CSSProperties}>
      <path
        className="artSurface"
        d="M142.6 93.5L157.3 102.0L157.3 138.0L142.6 146.5L127.9 138.0L127.9 102.0Z"
      />
      <path
        className="artInk"
        d="M127.9 102.0L142.6 110.5L142.6 146.5L127.9 138.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M142.6 110.5L157.3 102.0L157.3 138.0L142.6 146.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M142.6 93.5L157.3 102.0L142.6 110.5L127.9 102.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="5-0" style={{ '--art-i': 1 } as CSSProperties}>
      <path
        className="artSurface"
        d="M211.9 85.5L226.6 94.0L226.6 118.0L211.9 126.5L197.2 118.0L197.2 94.0Z"
      />
      <path
        className="artInk"
        d="M197.2 94.0L211.9 102.5L211.9 126.5L197.2 118.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M211.9 102.5L226.6 94.0L226.6 118.0L211.9 126.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M211.9 85.5L226.6 94.0L211.9 102.5L197.2 94.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="5-1" style={{ '--art-i': 1 } as CSSProperties}>
      <path className="artSunken" d="M194.6 119.5L209.3 128.0L194.6 136.5L179.9 128.0Z" />
    </g>
    <g className="artMotion artRow" key="5-2" style={{ '--art-i': 1 } as CSSProperties}>
      <path
        className="artSurface"
        d="M177.3 117.5L192.0 126.0L192.0 138.0L177.3 146.5L162.5 138.0L162.5 126.0Z"
      />
      <path
        className="artInk"
        d="M162.5 126.0L177.3 134.5L177.3 146.5L162.5 138.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M177.3 134.5L192.0 126.0L192.0 138.0L177.3 146.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M177.3 117.5L192.0 126.0L177.3 134.5L162.5 126.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="5-3" style={{ '--art-i': 1 } as CSSProperties}>
      <path
        className="artSurface"
        d="M159.9 115.5L174.7 124.0L174.7 148.0L159.9 156.5L145.2 148.0L145.2 124.0Z"
      />
      <path
        className="artInk"
        d="M145.2 124.0L159.9 132.5L159.9 156.5L145.2 148.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M159.9 132.5L174.7 124.0L174.7 148.0L159.9 156.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M159.9 115.5L174.7 124.0L159.9 132.5L145.2 124.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="6-0" style={{ '--art-i': 2 } as CSSProperties}>
      <path
        className="artSurface"
        d="M229.2 83.5L243.9 92.0L243.9 128.0L229.2 136.5L214.5 128.0L214.5 92.0Z"
      />
      <path
        className="artInk"
        d="M214.5 92.0L229.2 100.5L229.2 136.5L214.5 128.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M229.2 100.5L243.9 92.0L243.9 128.0L229.2 136.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M229.2 83.5L243.9 92.0L229.2 100.5L214.5 92.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="6-1" style={{ '--art-i': 2 } as CSSProperties}>
      <path
        className="artSurface"
        d="M211.9 117.5L226.6 126.0L226.6 138.0L211.9 146.5L197.2 138.0L197.2 126.0Z"
      />
      <path
        className="artInk"
        d="M197.2 126.0L211.9 134.5L211.9 146.5L197.2 138.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M211.9 134.5L226.6 126.0L226.6 138.0L211.9 146.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M211.9 117.5L226.6 126.0L211.9 134.5L197.2 126.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="6-2" style={{ '--art-i': 2 } as CSSProperties}>
      <path className="artSunken" d="M194.6 139.5L209.3 148.0L194.6 156.5L179.9 148.0Z" />
    </g>
    <g className="artMotion artRow" key="6-3" style={{ '--art-i': 2 } as CSSProperties}>
      <path
        className="artSurface"
        d="M177.3 137.5L192.0 146.0L192.0 158.0L177.3 166.5L162.5 158.0L162.5 146.0Z"
      />
      <path
        className="artInk"
        d="M162.5 146.0L177.3 154.5L177.3 166.5L162.5 158.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M177.3 154.5L192.0 146.0L192.0 158.0L177.3 166.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M177.3 137.5L192.0 146.0L177.3 154.5L162.5 146.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="7-0" style={{ '--art-i': 3 } as CSSProperties}>
      <path
        className="artSurface"
        d="M246.5 117.5L261.3 126.0L261.3 138.0L246.5 146.5L231.8 138.0L231.8 126.0Z"
      />
      <path
        className="artInk"
        d="M231.8 126.0L246.5 134.5L246.5 146.5L231.8 138.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M246.5 134.5L261.3 126.0L261.3 138.0L246.5 146.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M246.5 117.5L261.3 126.0L246.5 134.5L231.8 126.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="7-1" style={{ '--art-i': 3 } as CSSProperties}>
      <path
        className="artSurface"
        d="M229.2 115.5L243.9 124.0L243.9 148.0L229.2 156.5L214.5 148.0L214.5 124.0Z"
      />
      <path
        className="artInk"
        d="M214.5 124.0L229.2 132.5L229.2 156.5L214.5 148.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M229.2 132.5L243.9 124.0L243.9 148.0L229.2 156.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M229.2 115.5L243.9 124.0L229.2 132.5L214.5 124.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="7-2" style={{ '--art-i': 3 } as CSSProperties}>
      <path
        className="artSurface"
        d="M211.9 137.5L226.6 146.0L226.6 158.0L211.9 166.5L197.2 158.0L197.2 146.0Z"
      />
      <path
        className="artInk"
        d="M197.2 146.0L211.9 154.5L211.9 166.5L197.2 158.0Z"
        fillOpacity="0.28"
      />
      <path
        className="artInk"
        d="M211.9 154.5L226.6 146.0L226.6 158.0L211.9 166.5Z"
        fillOpacity="0.55"
      />
      <path
        className="artInk"
        d="M211.9 137.5L226.6 146.0L211.9 154.5L197.2 146.0Z"
        fillOpacity="0.12"
      />
    </g>
    <g className="artMotion artRow" key="7-3" style={{ '--art-i': 3 } as CSSProperties}>
      <path className="artSunken" d="M194.6 159.5L209.3 168.0L194.6 176.5L179.9 168.0Z" />
    </g>
  </>
)
