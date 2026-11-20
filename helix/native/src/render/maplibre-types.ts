/**
 * The part of `@maplibre/maplibre-react-native` a phone's map uses, typed
 * here so the package stays an optional peer: an app that draws no map
 * installs nothing, and helix/native builds without it.
 *
 * **Each name is the package's own**, as its 11.x line exports it, so the
 * map reads as MapLibre's documentation does: a place is `[longitude,
 * latitude]`, and a stretch of the world `[west, south, east, north]`.
 */
import type { ComponentType, ReactNode, Ref } from 'react'
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native'

/** A place, longitude first. */
export type LngLat = readonly [number, number]

/** A stretch of the world: west, south, east, north. */
export type LngLatBounds = readonly [number, number, number, number]

/** Where the map is looking, as it tells after a move. */
export interface ViewState {
  readonly bearing: number
  readonly bounds: LngLatBounds
  readonly center: LngLat
  readonly pitch: number
  readonly zoom: number
}

/** A move, and whether a finger made it. */
export type ViewStateChangeEvent = ViewState & {
  readonly animated: boolean
  readonly userInteraction: boolean
}

/** A tap on the map: where on the world, and where in the map's box, in points. */
export interface PressEvent {
  readonly lngLat: LngLat
  readonly point: readonly [number, number]
}

/** How far in from each edge the view's center stands, in points. */
export interface ViewPadding {
  readonly bottom?: number
  readonly left?: number
  readonly right?: number
  readonly top?: number
}

/** Where the camera stands, and how it moves there. */
export interface CameraStop {
  readonly bearing?: number
  readonly center?: LngLat
  readonly duration?: number
  readonly easing?: 'ease' | 'fly' | 'linear'
  readonly padding?: ViewPadding
  readonly pitch?: number
  readonly zoom?: number
}

/** The camera's methods, through its ref. */
export interface CameraRef {
  easeTo(stop: CameraStop & { readonly center: LngLat }): void
  jumpTo(stop: CameraStop & { readonly center: LngLat }): void
}

/** The map. */
export interface MapProps {
  readonly attribution?: boolean
  readonly children?: ReactNode
  readonly compass?: boolean
  readonly logo?: boolean
  /** A style URL, or the style itself. */
  readonly mapStyle: string | object
  readonly onDidFinishRenderingMapFully?: (event: NativeSyntheticEvent<null>) => void
  readonly onPress?: (event: NativeSyntheticEvent<PressEvent>) => void
  readonly onRegionDidChange?: (event: NativeSyntheticEvent<ViewStateChangeEvent>) => void
  readonly onRegionIsChanging?: (event: NativeSyntheticEvent<ViewStateChangeEvent>) => void
  readonly scaleBar?: boolean
  readonly style?: StyleProp<ViewStyle>
  readonly touchPitch?: boolean
}

/** The camera, inside the map. */
export interface CameraProps {
  readonly initialViewState?: CameraStop
  readonly maxZoom?: number
  readonly minZoom?: number
  readonly ref?: Ref<CameraRef>
}

/** A GeoJSON source, its layers inside it. */
export interface GeoJSONSourceProps {
  readonly children?: ReactNode
  readonly cluster?: boolean
  readonly clusterRadius?: number
  readonly data: object
  readonly id?: string
}

/** A raster source, its layer inside it. */
export interface RasterSourceProps {
  readonly attribution?: string
  readonly children?: ReactNode
  readonly id?: string
  readonly maxzoom?: number
  readonly tileSize?: number
  readonly tiles: readonly string[]
}

/** Heights in tiles, for hill shading. */
export interface RasterDEMSourceProps {
  readonly children?: ReactNode
  readonly encoding?: 'mapbox' | 'terrarium'
  readonly id?: string
  readonly maxzoom?: number
  readonly tileSize?: number
  readonly tiles: readonly string[]
}

/** A layer, written as the style specification writes one. */
export interface LayerProps {
  readonly [key: string]: unknown
  readonly id: string
  readonly type: string
}

/** The components and modules a phone's map draws with. */
export interface MapLibreModule {
  readonly Camera: ComponentType<CameraProps>
  readonly GeoJSONSource: ComponentType<GeoJSONSourceProps>
  readonly Layer: ComponentType<LayerProps>
  readonly Map: ComponentType<MapProps>
  readonly RasterDEMSource: ComponentType<RasterDEMSourceProps>
  readonly RasterSource: ComponentType<RasterSourceProps>
}
