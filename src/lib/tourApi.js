const EMPTY_RESULT = { img: null, mapx: null, mapy: null };

const TOUR_API_ENDPOINT = '/api/tour/B551011/KorService4/searchKeyword4';

function normalizeTourApiItem(items) {
  if (!items || items === '') return null;
  return Array.isArray(items) ? items[0] : items;
}

export function getTourApiServiceKey() {
  const raw = import.meta.env.VITE_TOUR_API_KEY
    || import.meta.env.VITE_PUBLIC_DATA_API_KEY
    || import.meta.env.VITE_DATA_GO_KR_API_KEY;

  return raw?.trim() || '';
}

function buildTourApiUrls(serviceKey, keyword) {
  const sharedParams = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'Sahara',
    _type: 'json',
    keyword,
    numOfRows: '1',
    pageNo: '1',
    listYN: 'Y',
    arrange: 'O',
  });

  const query = sharedParams.toString();
  const urls = [`${TOUR_API_ENDPOINT}?serviceKey=${serviceKey}&${query}`];

  if (!serviceKey.includes('%')) {
    urls.push(`${TOUR_API_ENDPOINT}?serviceKey=${encodeURIComponent(serviceKey)}&${query}`);
  }

  return urls;
}

function parseTourApiResponse(data) {
  const header = data?.response?.header;
  if (header?.resultCode && header.resultCode !== '0000') {
    return EMPTY_RESULT;
  }

  const item = normalizeTourApiItem(data?.response?.body?.items?.item);
  if (!item?.mapx || !item?.mapy) {
    return EMPTY_RESULT;
  }

  return {
    img: item.firstimage || item.firstimage2 || null,
    mapx: String(item.mapx),
    mapy: String(item.mapy),
  };
}

async function requestTourApi(serviceKey, keyword) {
  const urls = buildTourApiUrls(serviceKey, keyword);

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const parsed = parseTourApiResponse(data);
      if (parsed.mapx && parsed.mapy) {
        return parsed;
      }
    } catch {
      // 다음 URL 시도
    }
  }

  return EMPTY_RESULT;
}

export async function fetchTourApiData(keyword) {
  const trimmedKeyword = keyword?.trim();
  const serviceKey = getTourApiServiceKey();

  if (!trimmedKeyword || !serviceKey) {
    return EMPTY_RESULT;
  }

  return requestTourApi(serviceKey, trimmedKeyword);
}
