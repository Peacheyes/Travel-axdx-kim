// src/components/CourseMap.jsx
import { useEffect, useRef } from 'react';

export default function CourseMap({ places }) {
  const mapRef = useRef(null);

  useEffect(() => {
    // 장소 데이터가 없거나 카카오맵 스크립트가 로드되지 않았으면 실행 안 함
    if (!places || places.length === 0 || !window.kakao) return;

    // 1. 지도 초기화 (초기 중심점은 임시로 서울 지정, 나중에 마커 위치로 자동 이동됨)
    const options = {
      center: new window.kakao.maps.LatLng(37.566826, 126.9786567),
      level: 5,
    };
    const map = new window.kakao.maps.Map(mapRef.current, options);
    
    // 장소 검색 객체 및 지도 범위 재설정 객체
    const ps = new window.kakao.maps.services.Places();
    const bounds = new window.kakao.maps.LatLngBounds();
    
    let searchCount = 0;
    const pathData = []; // 순서대로 선을 긋기 위해 임시 저장할 배열

    // 2. 각 장소 이름을 검색하여 좌표로 변환
    places.forEach((placeName, index) => {
      ps.keywordSearch(placeName, (data, status) => {
        searchCount++;
        
        if (status === window.kakao.maps.services.Status.OK) {
          const latLng = new window.kakao.maps.LatLng(data[0].y, data[0].x);
          
          // 비동기 검색 결과의 순서가 섞이지 않도록 인덱스와 함께 저장
          pathData.push({ index, latLng });
          bounds.extend(latLng);

          // 지도에 마커 추가
          new window.kakao.maps.Marker({
            map: map,
            position: latLng,
            title: placeName,
          });
        }

        // 3. 모든 장소의 검색이 끝났을 때
        if (searchCount === places.length) {
          if (pathData.length > 0) {
            // 인덱스 순서대로(여행 동선 순서대로) 정렬
            pathData.sort((a, b) => a.index - b.index);
            const sortedPath = pathData.map(p => p.latLng);

            // 장소들을 이어주는 선(Polyline) 그리기
            const polyline = new window.kakao.maps.Polyline({
              path: sortedPath,
              strokeWeight: 4,
              strokeColor: '#FF0000', // 빨간색 선
              strokeOpacity: 0.8,
              strokeStyle: 'solid',
            });
            polyline.setMap(map);

            // 찍힌 마커들이 모두 한눈에 들어오도록 지도의 중심과 확대 레벨 자동 조정
            map.setBounds(bounds);
          }
        }
      });
    });
  }, [places]);

  return (
    <div 
      ref={mapRef} 
      style={{ width: '100%', height: '250px', borderRadius: '8px', margin: '15px 0' }} 
    />
  );
}