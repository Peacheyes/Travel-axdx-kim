import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DAY_THEMES } from '../lib/dayThemes';
import { courseHasMapCoords, toLatLng } from '../lib/placeGeocoding';

delete L.Icon.Default.prototype._getIconUrl;

const DEFAULT_CENTER = [36.5, 127.8];

function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

function createNumberedIcon(order, color) {
  return L.divIcon({
    className: 'course-map-marker',
    html: `<div style="
      background:${color};
      color:#fff;
      width:30px;
      height:30px;
      border-radius:50%;
      border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.28);
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:13px;
      line-height:1;
    ">${order}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function schedulesToPositions(schedules, dayIndex, dayLabel, color) {
  return schedules
    .map((schedule, scheduleIndex) => {
      const coords = toLatLng(schedule.mapx, schedule.mapy);
      if (!coords) return null;

      return {
        lat: coords.lat,
        lng: coords.lng,
        name: schedule.place,
        category: schedule.category,
        dayIndex,
        dayLabel,
        color,
        order: scheduleIndex + 1,
      };
    })
    .filter(Boolean);
}

function buildDayGroups(days, dayThemes) {
  return days.map((day, dayIndex) => {
    const theme = dayThemes[dayIndex % dayThemes.length];
    const positions = schedulesToPositions(day.schedules, dayIndex, day.day, theme.main);

    return {
      dayLabel: day.day,
      color: theme.main,
      bg: theme.bg,
      positions,
    };
  });
}

export default function CourseMap({ days, dayThemes = DAY_THEMES }) {
  const dayGroups = useMemo(
    () => buildDayGroups(days, dayThemes),
    [days, dayThemes],
  );

  const allPositions = dayGroups.flatMap((group) => group.positions);
  const allBounds = allPositions.map((pos) => [pos.lat, pos.lng]);
  const mapCenter = allBounds[0] || DEFAULT_CENTER;

  const totalPlaces = days.reduce((count, day) => count + day.schedules.length, 0);

  if (allPositions.length === 0) {
    return (
      <div style={{ height: '320px', width: '100%', background: '#e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '16px', color: '#718096', fontWeight: 'bold', gap: '8px', padding: '0 20px', textAlign: 'center' }}>
        <span>🗺️ 표시할 동선이 없습니다.</span>
        <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
          {courseHasMapCoords(days)
            ? '좌표 형식을 확인할 수 없습니다.'
            : `등록된 장소 ${totalPlaces}곳의 좌표를 찾지 못했습니다. Tour API 키와 장소명을 확인해 주세요.`}
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        {dayGroups.filter((group) => group.positions.length > 0).map((group) => (
          <span
            key={group.dayLabel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: group.bg,
              color: group.color,
              padding: '6px 10px',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: '700',
            }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: group.color, display: 'inline-block' }} />
            {group.dayLabel}
          </span>
        ))}
      </div>

      <div style={{ height: '320px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <MapContainer
          center={mapCenter}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {dayGroups.map((group) => (
            group.positions.length > 1 && (
              <Polyline
                key={`line-${group.dayLabel}`}
                positions={group.positions.map((pos) => [pos.lat, pos.lng])}
                pathOptions={{ color: group.color, weight: 4, dashArray: '6, 8', opacity: 0.9 }}
              />
            )
          ))}

          {dayGroups.flatMap((group) =>
            group.positions.map((pos) => (
              <Marker
                key={`${group.dayLabel}-${pos.order}-${pos.name}`}
                position={[pos.lat, pos.lng]}
                icon={createNumberedIcon(pos.order, pos.color)}
              >
                <Popup>
                  <strong>{pos.dayLabel} · {pos.order}번째</strong><br />
                  {pos.name}<br />
                  <span style={{ color: '#718096' }}>{pos.category}</span>
                </Popup>
              </Marker>
            )),
          )}

          <ChangeView bounds={allBounds} />
        </MapContainer>
      </div>
    </div>
  );
}
