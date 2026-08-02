import { geoAlbersUsa, type GeoProjection } from "d3-geo";

/**
 * Matches data/us_state_paths.json's own projection exactly (see that file's
 * `note` field: "d3.geoAlbersUsa scale1280 translate[480,300]") so city markers
 * line up with the state-outline background geometry.
 */
let cached: GeoProjection | null = null;

function projection(): GeoProjection {
  if (!cached) {
    cached = geoAlbersUsa().scale(1280).translate([480, 300]);
  }
  return cached;
}

export function projectLatLon(lat: number, lon: number): [number, number] | null {
  return projection()([lon, lat]);
}
