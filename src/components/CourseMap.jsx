// src/components/CourseMap.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet 기본 마커 아이콘 설정
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
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export default function CourseMap({ places }) {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (!places || places.length === 0) return;

    // 🌟 카카오맵 연동 전 임시(Mock) 좌표 생성기
    // 서울 중심부(시청역 인근)를 기준으로 장소 개수만큼 동선을 그럴싸하게 만들어줍니다.
    const baseLat = 37.5665;
    const baseLng = 126.9780;
    
    const mockPositions = places.map((p, idx) => {
      // 인덱스를 활용해 둥근 형태의 가상 동선을 계산합니다.
      const offsetLat = (Math.random() - 0.5) * 0.05 + (idx * 0.01);
      const offsetLng = (Math.random() - 0.5) * 0.05 + (idx * 0.015);
      
      return {
        lat: baseLat + offsetLat,
        lng: baseLng + offsetLng,
        name: p.place,
        category: p.category
      };
    });

    setPositions(mockPositions);
  }, [places]);

  if (positions.length === 0) {
    return (
      <div style={{ height: '250px', width: '100%', background: '#f1f5f9', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '16px', color: '#a0aec0', fontWeight: 'bold' }}>
        🗺️ 일정을 추가하면 동선이 표시됩니다.
      </div>
    );
  }

  const polylinePositions = positions.map(pos => [pos.lat, pos.lng]);

  return (
    <div style={{ height: '300px', width: '100%', marginTop: '24px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <MapContainer 
        center={polylinePositions[0]} 
        zoom={12} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {positions.map((pos, idx) => (
          <Marker key={idx} position={[pos.lat, pos.lng]}>
            <Popup>
              <strong>{idx + 1}. {pos.name}</strong><br />
              <span style={{ fontSize: '0.8rem', color: '#666' }}>{pos.category}</span>
            </Popup>
          </Marker>
        ))}

        {/* 핀들을 파란색 점선으로 연결 */}
        <Polyline 
          positions={polylinePositions} 
          pathOptions={{ color: '#0056b3', weight: 4, dashArray: '8, 8', lineCap: 'round' }} 
        />

        <ChangeView bounds={polylinePositions} />
      </MapContainer>
    </div>
  );
}