import { env, hasKey } from '../config/env.js';
import { cache } from '../config/cache.js';

/**
 * Google Maps Geocoding (FR-09, FR-10).
 * Resolves coordinates to the most specific place available — estate, village,
 * road or ward — instead of generalising to a county. The county is still
 * extracted separately for grouping/labels.
 * Degrades gracefully: without a key it returns a coordinate-based label so
 * the UI keeps working in development.
 */

const GEO_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// Kenya on Google Maps: county = administrative_area_level_1,
// sub-county = level_2, ward = level_3. Below that come locality,
// sublocality (estate/village), neighborhood, route and premise.
function extractPlace(components = [], compoundPlusCode = null) {
  const find = (...types) =>
    components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

  const point = find('premise', 'point_of_interest', 'establishment');
  const road = find('route');
  const estate = find('sublocality_level_1', 'sublocality', 'neighborhood');
  const town = find('locality', 'postal_town');
  const ward = find('administrative_area_level_3');
  const subCounty = find('administrative_area_level_2');
  const county = find('administrative_area_level_1');

  // Most specific label first: "Riverside Dr, Kileleshwa, Nairobi" — never just "Nairobi".
  const parts = [...new Set([point, road, estate, ward || town, subCounty, county].filter(Boolean))];
  const precise = parts.slice(0, 3).join(', ') || compoundPlusCode || null;

  return {
    precise,
    estate: estate || null,
    ward: ward || null,
    subCounty: subCounty || null,
    county: county || subCounty || town || null,
  };
}

export async function reverseGeocode(lat, lng) {
  const key = `geo:rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = await cache.get(key);
  if (cached) return cached;

  if (!hasKey(env.googleMapsKey)) {
    const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return { formatted: label, precise: label, estate: null, ward: null, subCounty: null, county: null, plusCode: null, lat, lng };
  }
  const url = `${GEO_URL}?latlng=${lat},${lng}&key=${env.googleMapsKey}`;
  const r = await fetch(url);
  const data = await r.json();
  // results[0] is the most specific match Google found for the point.
  const top = data.results?.[0];
  const plusCode = data.plus_code?.compound_code || null;
  const detail = extractPlace(top?.address_components, plusCode);
  const place = {
    formatted: top?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    ...detail,
    precise: detail.precise || top?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    plusCode,
    lat,
    lng,
  };
  await cache.set(key, place, 86400);
  return place;
}

export async function forwardGeocode(q) {
  const key = `geo:fwd:${q.toLowerCase()}`;
  const cached = await cache.get(key);
  if (cached) return cached;

  if (!hasKey(env.googleMapsKey)) {
    return []; // client can use the browser Places widget instead
  }
  const url = `${GEO_URL}?address=${encodeURIComponent(q)}&region=ke&key=${env.googleMapsKey}`;
  const r = await fetch(url);
  const data = await r.json();
  const results = (data.results || []).slice(0, 5).map((res) => {
    const detail = extractPlace(res.address_components, res.plus_code?.compound_code || null);
    return {
      formatted: res.formatted_address,
      ...detail,
      precise: detail.precise || res.formatted_address,
      lat: res.geometry.location.lat,
      lng: res.geometry.location.lng,
    };
  });
  await cache.set(key, results, 86400);
  return results;
}
