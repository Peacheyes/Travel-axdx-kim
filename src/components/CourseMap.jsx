import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🚨 React-Leaflet의 고질적인 마커 아이콘 깨짐 현상을 해결하는 필수 코드
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 지도 중심을 마커들에 맞게 자동으로 이동시켜주는 컴포넌트
function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function CourseMap({ places = [] }) {
  // 💡 MVP 시연을 위한 임시 좌표 생성기 (장소 이름을 바탕으로 제주도 근처 좌표를 만듭니다)
  // 실제 서비스에서는 AI 프롬프트에 "위도와 경도도 같이 알려줘"라고 추가해야 합니다.
  const mapData = places.map((p, index) => {
    // 제주도 중심(33.38, 126.55)을 기준으로 장소마다 위치를 조금씩 다르게 흩뿌림
    const lat = 33.38 + (Math.sin(index) * 0.1);
    const lng = 126.55 + (Math.cos(index) * 0.1);
    return { ...p, lat, lng };
  });

  // 폴리라인(동선)을 그리기 위한 좌표 배열
  const linePositions = mapData.map(p => [p.lat, p.lng]);
  // 지도 중심을 잡기 위한 영역(Bounds) 설정
  const bounds = linePositions;

  if (!places || places.length === 0) {
    return <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>지도를 표시할 장소 데이터가 없습니다.</div>;
  }

  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', marginTop: '20px', border: '1px solid #e2e8f0', zIndex: 0 }}>
      {/* MapContainer: 지도를 그리는 도화지 */}
      <MapContainer 
        center={[33.38, 126.55]} 
        zoom={10} 
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false} // 스크롤 내리다 지도 확대되는 것 방지
      >
        {/* TileLayer: 전 세계가 함께 만드는 무료 OpenStreetMap 이미지 가져오기 */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 장소마다 마커와 팝업창 찍기 */}
        {mapData.map((place, idx) => (
          <Marker key={idx} position={[place.lat, place.lng]}>
            <Popup>
              <strong>{place.place}</strong>
              <br />
              <span style={{ fontSize: '0.8rem', color: '#718096' }}>{place.category}</span>
            </Popup>
          </Marker>
        ))}

        {/* 장소들을 이어주는 동선(선) 그리기 */}
        {linePositions.length > 1 && (
          <Polyline positions={linePositions} color="#0056b3" weight={3} dashArray="5, 10" />
        )}

        {/* 마커들이 모두 보이도록 지도 카메라 이동 */}
        <ChangeView bounds={bounds} />
      </MapContainer>
    </div>
  );
}