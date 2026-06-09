// src/components/CourseMap.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet 기본 마커 아이콘 버그 수정용 (설치 시 필수)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 지도 범위(Bounds) 자동 조절 컴포넌트
function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function CourseMap({ places }) {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    // 🌟 TourAPI에서 넘어온 좌표(mapx: 경도, mapy: 위도)가 존재하는 장소만 필터링
    const validPlaces = places.filter(p => p.mapx && p.mapy && p.mapx !== "null" && p.mapy !== "null");
    
    // Leaflet은 [위도(Y), 경도(X)] 순서로 데이터를 받습니다.
    const coords = validPlaces.map(p => ({
      lat: parseFloat(p.mapy),
      lng: parseFloat(p.mapx),
      name: p.place,
      category: p.category
    }));
    
    setPositions(coords);
  }, [places]);

  // 좌표가 아예 없을 경우를 대비한 가짜 지도 (기본 화면)
  if (positions.length === 0) {
    return (
      <div style={{ height: '300px', width: '100%', background: '#e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '16px', color: '#718096', fontWeight: 'bold' }}>
        🗺️ 일정을 추가하면 AI가 동선을 계산합니다.
      </div>
    );
  }

  // 선을 그리기 위한 좌표 배열 추출
  const polylinePositions = positions.map(pos => [pos.lat, pos.lng]);
  const bounds = L.latLngBounds(polylinePositions);

  return (
    <div style={{ height: '300px', width: '100%', marginTop: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <MapContainer 
        center={polylinePositions[0]} 
        zoom={11} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false} // 모바일 스크롤 편의를 위해 지도 자체 스크롤 줌 끄기
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 장소마다 파란 핀(Marker) 꽂기 */}
        {positions.map((pos, idx) => (
          <Marker key={idx} position={[pos.lat, pos.lng]}>
            <Popup>
              <strong>{idx + 1}. {pos.name}</strong><br />
              {pos.category}
            </Popup>
          </Marker>
        ))}

        {/* 핀과 핀 사이를 점선으로 연결 */}
        <Polyline 
          positions={polylinePositions} 
          pathOptions={{ color: '#0056b3', weight: 4, dashArray: '5, 10' }} // 파란색 점선 디자인
        />

        <ChangeView bounds={polylinePositions} />
      </MapContainer>
    </div>
  );
}