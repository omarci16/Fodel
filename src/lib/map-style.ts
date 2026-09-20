/**
 * MapLibre style for the self-hosted Hungary PMTiles basemap, in FODEL's own
 * palette rather than a generic default style — the map should look like it
 * belongs on this site, not like an embedded third-party widget.
 *
 * Layer names (water/landuse/roads/buildings/place labels) match the
 * OpenMapTiles schema, which is what `tippecanoe`/`planetiler` produce and
 * what scripts/build-pmtiles.mjs documents building the tileset from. If the
 * actual tileset uses different layer names, these `source-layer` values are
 * the first thing to check.
 */
export function mapStyle(pmtilesUrl: string) {
  return {
    version: 8 as const,
    sources: {
      hungary: {
        type: 'vector' as const,
        url: `pmtiles://${pmtilesUrl}`,
      },
    },
    glyphs: '/fonts/{fontstack}/{range}.pbf',
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#F4F4F2' } },
      {
        id: 'water',
        type: 'fill',
        source: 'hungary',
        'source-layer': 'water',
        paint: { 'fill-color': '#D8DEE2' },
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'hungary',
        'source-layer': 'landcover',
        paint: { 'fill-color': '#ECEDEF', 'fill-opacity': 0.6 },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'hungary',
        'source-layer': 'transportation',
        paint: { 'line-color': '#D0D4D6', 'line-width': 1 },
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'hungary',
        'source-layer': 'building',
        minzoom: 13,
        paint: { 'fill-color': '#E0E2E4' },
      },
      {
        id: 'boundary',
        type: 'line',
        source: 'hungary',
        'source-layer': 'boundary',
        filter: ['<=', ['get', 'admin_level'], 6],
        paint: { 'line-color': '#B7BEC2', 'line-width': 1, 'line-dasharray': [2, 2] },
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'hungary',
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
        },
        paint: { 'text-color': '#102A43', 'text-halo-color': '#F4F4F2', 'text-halo-width': 1.4 },
      },
    ],
  };
}
