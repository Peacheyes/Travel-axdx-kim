// src/components/CourseMap.jsx
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 마커 아이콘 깨짐 방지
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 지도 포커스 자동 맞춤 컴포넌트
function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [bounds, map]);
  return null;
}

export default function CourseMap({ places = [] }) {
  // 장소명 텍스트를 하나로 합쳐서 어느 지역인지 단어를 유추합니다.
  const allPlacesText = places.map(p => p.place).join(' ');

  // 🚀 지역별 대략적인 중심 좌표 딕셔너리
  const baseCoord = useMemo(() => {
    if (allPlacesText.includes('서울') || allPlacesText.includes('홍대') || allPlacesText.includes('강남')) return { lat: 37.5665, lng: 126.9780 };
    if (allPlacesText.includes('부산') || allPlacesText.includes('해운대') || allPlacesText.includes('광안리')) return { lat: 35.1796, lng: 129.0756 };
    if (allPlacesText.includes('경주') || allPlacesText.includes('황리단길')) return { lat: 35.8562, lng: 129.2247 };
    if (allPlacesText.includes('강릉') || allPlacesText.includes('속초') || allPlacesText.includes('양양')) return { lat: 37.7518, lng: 128.8760 };
    if (allPlacesText.includes('여수') || allPlacesText.includes('순천')) return { lat: 34.7604, lng: 127.6622 };
    
    return { lat: 33.38, lng: 126.55 }; // 어떤 키워드도 안 걸리면 기본값은 제주도
  }, [allPlacesText]);

  // 해당 지역을 중심으로 마커를 예쁘게 흩뿌립니다.
  const mapData = places.map((p, index) => {
    const lat = baseCoord.lat + (Math.sin(index) * 0.05);
    const lng = baseCoord.lng + (Math.cos(index) * 0.05);
    return { ...p, lat, lng };
  });

  const linePositions = mapData.map(p => [p.lat, p.lng]);

  if (!places || places.length === 0) return null;

  return (
    <div style={{ width: '100%', height: '250px', borderRadius: '12px', overflow: 'hidden', marginTop: '15px', border: '1px solid #e2e8f0', position: 'relative', zIndex: 0 }}>
      {/* zIndex: 0 을 주어 지도가 팝업창을 뚫지 않도록 방어합니다 */}
      <MapContainer center={[baseCoord.lat, baseCoord.lng]} zoom={11} style={{ width: '100%', height: '100%', zIndex: 0 }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapData.map((place, idx) => (
          <Marker key={idx} position={[place.lat, place.lng]}>
            <Popup>
              <strong>{place.place}</strong>
              <br/>
              <span style={{ fontSize: '0.8rem', color: '#718096' }}>{place.category}</span>
            </Popup>
          </Marker>
        ))}
        {linePositions.length > 1 && <Polyline positions={linePositions} color="#0056b3" weight={3} dashArray="5, 10" />}
        <ChangeView bounds={linePositions} />
      </MapContainer>
    </div>
  );
}