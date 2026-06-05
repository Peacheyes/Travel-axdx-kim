// src/components/CourseMap.jsx
import { useEffect, useRef } from 'react';

// 카테고리 텍스트를 분석해서 알맞은 이모지를 반환하는 헬퍼 함수
const getCategoryEmoji = (category) => {
  if (!category) return '📍';
  if (category.includes('식당') || category.includes('음식') || category.includes('맛집')) return '🍽️';
  if (category.includes('카페') || category.includes('커피') || category.includes('디저트')) return '☕';
  if (category.includes('숙소') || category.includes('호텔') || category.includes('펜션')) return '🛏️';
  if (category.includes('액티비티') || category.includes('체험')) return '🏄‍♂️';
  return '📸'; // 기본 관광지
};

export default function CourseMap({ places }) {
  const mapRef = useRef(null);

  useEffect(() => {
    // places 배열이 비어있거나 카카오 스크립트가 없으면 중단
    if (!places || places.length === 0 || !window.kakao) return;

    const options = {
      center: new window.kakao.maps.LatLng(37.566826, 126.9786567),
      level: 5,
    };
    const map = new window.kakao.maps.Map(mapRef.current, options);
    const ps = new window.kakao.maps.services.Places();
    const bounds = new window.kakao.maps.LatLngBounds();

    let searchCount = 0;
    const pathData = [];

    // 전달받은 장소 객체 배열을 순회하며 검색
    places.forEach((placeObj, index) => {
      // 이제 placeObj는 단순 문자열이 아니라 { place: '장소명', category: '카페', ... } 형태입니다.
      ps.keywordSearch(placeObj.place, (data, status) => {
        searchCount++;

        if (status === window.kakao.maps.services.Status.OK) {
          const latLng = new window.kakao.maps.LatLng(data[0].y, data[0].x);
          pathData.push({ index, latLng });
          bounds.extend(latLng);

          const emoji = getCategoryEmoji(placeObj.category);
          
          // HTML로 직접 만드는 예쁜 커스텀 마커 디자인
          const content = `
            <div style="
              background: white; 
              border: 2px solid #0056b3; 
              border-radius: 20px; 
              padding: 5px 10px; 
              font-size: 0.85rem; 
              font-weight: 700; 
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              display: flex;
              align-items: center;
              gap: 6px;
              transform: translateY(-20px);
            ">
              <span style="background: #e3f2fd; color: #0056b3; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; justify-content: center; align-items: center; font-size: 0.75rem;">
                ${index + 1}
              </span>
              <span>${emoji}</span>
              <span style="color: #333; white-space: nowrap;">${placeObj.place}</span>
            </div>
          `;

          // 기존 Marker 대신 CustomOverlay 사용
          new window.kakao.maps.CustomOverlay({
            map: map,
            position: latLng,
            content: content,
            yAnchor: 1 // 마커가 실제 좌표의 위쪽으로 뜨도록 조정
          });
        }

        // 모든 검색이 끝난 후 선 그리기 및 지도 범위 조정
        if (searchCount === places.length && pathData.length > 0) {
          pathData.sort((a, b) => a.index - b.index);
          const sortedPath = pathData.map(p => p.latLng);

          new window.kakao.maps.Polyline({
            path: sortedPath,
            strokeWeight: 4,
            strokeColor: '#0056b3', // 타임라인 색상과 맞춘 파란색
            strokeOpacity: 0.8,
            strokeStyle: 'shortdash', // 점선 스타일로 트렌디하게
          }).setMap(map);

          map.setBounds(bounds);
        }
      });
    });
  }, [places]);

  return (
    <div 
      ref={mapRef} 
      style={{ width: '100%', height: '320px', borderRadius: '12px', margin: '20px 0', border: '1px solid #e2e8f0' }} 
    />
  );
}