import { fetchTourApiData } from './tourApi';

const EMPTY_RESULT = { img: null, mapx: null, mapy: null };
const geocodeCache = new Map();
const inflightRequests = new Map();

const GENERIC_PLACE_NAMES = new Set([
  '감성 카페',
  '해변 산책로',
  '전망 좋은 야경 명소',
  '조용한 편집숍',
  '로컬 맛집',
  '전통시장',
  '디저트 카페',
  '브런치 식당',
  '체험 공간',
  '핫플 거리',
  '포토스팟',
  '전망대',
  '장소명 없음',
]);

let geocodeQueue = Promise.resolve();

function enqueueGeocode(task) {
  const run = geocodeQueue.then(task, task);
  geocodeQueue = run.then(() => undefined, () => undefined);
  return run;
}

function cacheKey(keyword, destination = '') {
  return `${keyword.trim().toLowerCase()}|${destination.trim().toLowerCase()}`;
}

export function hasValidCoords(place) {
  return Boolean(
    place?.mapx
    && place?.mapy
    && place.mapx !== 'null'
    && place.mapy !== 'null',
  );
}

export function isGeocodablePlaceName(placeName) {
  const trimmed = placeName?.trim();
  if (!trimmed) return false;
  if (GENERIC_PLACE_NAMES.has(trimmed)) return false;
  return true;
}

export function courseHasMapCoords(days = []) {
  return days.some((day) => day.schedules.some((schedule) => hasValidCoords(schedule)));
}

function buildSearchQueries(keyword, destination = '') {
  const trimmedKeyword = keyword.trim();
  const trimmedDestination = destination.trim();
  const queries = [];

  if (trimmedDestination) {
    queries.push(`${trimmedKeyword} ${trimmedDestination}`);
  }

  queries.push(trimmedKeyword);
  return queries;
}

export function toLatLng(mapx, mapy) {
  const lng = parseFloat(mapx);
  const lat = parseFloat(mapy);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    const convertedLng = (lng / 100000) + 126;
    const convertedLat = (lat / 100000) + 33;
    if (convertedLat >= 33 && convertedLat <= 43 && convertedLng >= 124 && convertedLng <= 132) {
      return { lat: convertedLat, lng: convertedLng };
    }
    return null;
  }

  return { lat, lng };
}

async function geocodeWithOpenMeteo(query) {
  try {
    const params = new URLSearchParams({
      name: query,
      count: '1',
      language: 'ko',
      format: 'json',
    });

    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
    if (!response.ok) return EMPTY_RESULT;

    const data = await response.json();
    const result = data?.results?.[0];

    if (!result?.latitude || !result?.longitude) {
      return EMPTY_RESULT;
    }

    return { img: null, mapx: String(result.longitude), mapy: String(result.latitude) };
  } catch {
    return EMPTY_RESULT;
  }
}

async function geocodeWithFreeApis(keyword, destination = '') {
  const queries = buildSearchQueries(keyword, destination);

  for (const query of queries) {
    const openMeteoResult = await geocodeWithOpenMeteo(query);
    if (openMeteoResult.mapx && openMeteoResult.mapy) {
      return openMeteoResult;
    }
  }

  return EMPTY_RESULT;
}

async function fetchPlaceDataUncached(keyword, destination = '') {
  const trimmedKeyword = keyword?.trim();
  if (!trimmedKeyword || !isGeocodablePlaceName(trimmedKeyword)) {
    return EMPTY_RESULT;
  }

  const tourApiData = await fetchTourApiData(trimmedKeyword);
  if (tourApiData.mapx && tourApiData.mapy) {
    return tourApiData;
  }

  return geocodeWithFreeApis(trimmedKeyword, destination);
}

export async function fetchPlaceData(keyword, destination = '') {
  const key = cacheKey(keyword, destination);

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const request = enqueueGeocode(() => fetchPlaceDataUncached(keyword, destination))
    .then((result) => {
      geocodeCache.set(key, result);
      inflightRequests.delete(key);
      return result;
    })
    .catch((error) => {
      inflightRequests.delete(key);
      geocodeCache.set(key, EMPTY_RESULT);
      throw error;
    });

  inflightRequests.set(key, request);
  return request;
}

async function enrichSchedule(schedule, destination) {
  if (hasValidCoords(schedule) || !isGeocodablePlaceName(schedule.place)) {
    return schedule;
  }

  const apiData = await fetchPlaceData(schedule.place, destination);
  if (!apiData.mapx || !apiData.mapy) {
    return schedule;
  }

  return {
    ...schedule,
    mapx: apiData.mapx,
    mapy: apiData.mapy,
    tourApiImg: schedule.tourApiImg || apiData.img || null,
  };
}

export async function applyCoordsToDays(days, destination = '') {
  const resolvedDays = [];

  for (const day of days) {
    const schedules = [];

    for (const schedule of day.schedules) {
      schedules.push(await enrichSchedule(schedule, destination));
    }

    resolvedDays.push({ ...day, schedules });
  }

  return resolvedDays;
}

export async function prefetchPlaceCoordinates(placeNames, destination = '') {
  const uniqueNames = [...new Set(placeNames.filter((name) => isGeocodablePlaceName(name)))];

  for (const placeName of uniqueNames) {
    await fetchPlaceData(placeName, destination);
  }
}
