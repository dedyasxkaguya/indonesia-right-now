export type GeoJSONGeometry =
  | { type: 'Point'; coordinates: number[] }
  | { type: 'MultiPoint'; coordinates: number[][] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] }
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export type GeoFeature = {
  type: 'Feature';
  properties: Record<string, string | number>;
  geometry: GeoJSONGeometry;
};

export type GeoCollection = {
  type: 'FeatureCollection';
  features: GeoFeature[];
};
