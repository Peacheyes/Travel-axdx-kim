// src/components/CourseMap.jsx
import { useEffect, useRef, useState } from 'react';

const getCategoryEmoji = (category) => {
  if (!category) return '📍';
  if (category.includes('식당') || category.includes('음식') || category.includes('맛집')) return '🍽️';
  if (category.includes('카페') || category.includes('커피') || category.includes('디저트')) return '☕';
  if (category.includes('숙소') || category.includes('호텔') || category.includes('펜션')) return '🛏️';
  if (category.includes('액티비티') || category.includes('체험')) return '🏄‍♂️';
  return '📸'; 
};

export default function CourseMap({ places }) {
  const mapRef = useRef(null);
  // 하얀 박스 안에 띄울 에러 메시지 상태 관리
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!places || places.length === 0) return;

    // 1. 카카오 객체가 없으면 조용히 넘어가지 않고 화면에 경고문 띄우기!
    if (!window.kakao || !window.kakao.maps) {
      setErrorMsg('🚨 카카오맵을 불러오지 못했습니다. index.html 파일에 <script> 태그가 있는지, GitHub에 푸시되었는지 확인해주세요.');
      return;
    }

    setErrorMsg(''); // 에러가 없으면 메시지 초기화

    const options = {
      center: new window.kakao.maps.LatLng(37.566826, 126.9786567),
      level: 5,
    };
    const map = new window.kakao.maps.Map(mapRef.current, options);
    const ps = new window.kakao.maps.services.Places();
    const bounds = new window.kakao.maps.LatLngBounds();

    let searchCount = 0;
    const pathData = [];

    places.forEach((placeObj, index) => {
      // 2. 검색 정확도 향상! "늘봄흑돼지 식당" -> "늘봄흑돼지"로 불필요한 단어 제거 후 검색
      const cleanPlaceName = placeObj.place.replace(/식당|카페|숙소|관광지|관광/g, '').trim();

      ps.keywordSearch(cleanPlaceName, (data, status) => {
        searchCount++;

        if (status === window.kakao.maps.services.Status.OK) {
          const latLng = new window.kakao.maps.LatLng(data[0].y, data[0].x);
          pathData.push({ index, latLng });
          bounds.extend(latLng);

          const emoji = getCategoryEmoji(placeObj.category);
          const content = `
            <div style="background: white; border: 2px solid #0056b3; border-radius: 20px; padding: 5px 10px; font-size: 0.85rem; font-weight: 700; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 6px; transform: translateY(-20px);">
              <span style="background: #e3f2fd; color: #0056b3; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; justify-content: center; align-items: center; font-size: 0.75rem;">${index + 1}</span>
              <span>${emoji}</span>
              <span style="color: #333; white-space: nowrap;">${cleanPlaceName}</span>
            </div>
          `;

          new window.kakao.maps.CustomOverlay({
            map: map,
            position: latLng,
            content: content,
            yAnchor: 1
          });
        }

        // 모든 장소 검색이 끝난 시점
        if (searchCount === places.length) {
          if (pathData.length > 0) {
            pathData.sort((a, b) => a.index - b.index);
            const sortedPath = pathData.map(p => p.latLng);

            new window.kakao.maps.Polyline({
              path: sortedPath,
              strokeWeight: 4,
              strokeColor: '#0056b3',
              strokeOpacity: 0.8,
              strokeStyle: 'shortdash',
            }).setMap(map);

            map.setBounds(bounds);
          } else {
            // 3. 만약 모든 장소가 검색 실패했다면 알려주기
            setErrorMsg('🗺️ AI가 추천한 장소들을 카카오맵에서 찾을 수 없습니다.');
          }
        }
      });
    });
  }, [places]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', height: '320px', borderRadius: '12px', margin: '20px 0', 
        border: '1px solid #e2e8f0', backgroundColor: '#f8f9fa',
        display: 'flex', justifyContent: 'center', alignItems: 'center' // 글자 중앙 정렬
      }} 
    >
      {/* 에러 메시지가 있을 때만 하얀 박스 중앙에 빨간 글씨로 출력 */}
      {errorMsg && <p style={{ color: '#e53e3e', fontWeight: 'bold', padding: '20px', textAlign: 'center', wordBreak: 'keep-all' }}>{errorMsg}</p>}
    </div>
  );
}