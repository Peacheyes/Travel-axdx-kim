export default function RecommendationList({
  recommendations,
  addedCourseIds,
  onAddCourse,
}) {
  if (recommendations.length === 0) {
    return (
      <section className="empty-state">
        <h2>추천 결과</h2>
        <p>여행 조건을 입력하면 3가지 테마별 맞춤 일정이 표시됩니다.</p>
      </section>
    )
  }

  return (
    <section className="recommendation-section">
      <div className="section-heading">
        <p className="eyebrow dark">AI Recommendation</p>
        <h2>3가지 테마별 맞춤 여행 코스</h2>
        <p>
          입력한 조건을 바탕으로 일정표, 주요 장소, 추천 이유, 지도 동선을
          비교할 수 있습니다.
        </p>
      </div>

      <div className="map-placeholder" aria-label="추천 코스 지도 동선 영역">
        <strong>지도 기반 동선 영역</strong>
        <div className="route-line">
          <span>1</span>
          <i />
          <span>2</span>
          <i />
          <span>3</span>
        </div>
        <p>실제 지도 API 없이 MVP용으로 장소 마커와 이동 순서를 표시합니다.</p>
      </div>

      <div className="recommendation-grid">
        {recommendations.map((course) => {
          const isAdded = addedCourseIds.includes(course.id)

          return (
            <article className="recommendation-card" key={course.id}>
              <div className="card-header">
                <div>
                  <h3>{course.theme}</h3>
                  <span>{course.estimatedTime}</span>
                </div>

                {course.influencerCourse && (
                  <span className="badge">인플루언서 추천</span>
                )}
              </div>

              <p>{course.description}</p>

              <div className="reason-box">
                <strong>추천 이유</strong>
                <p>{course.reason}</p>
              </div>

              <div>
                <strong>주요 장소</strong>
                <ul>
                  {course.places.map((place) => (
                    <li key={place}>{place}</li>
                  ))}
                </ul>
              </div>

              <div className="day-list">
                {course.days.map((day) => (
                  <div className="day-card" key={day.day}>
                    <h4>{day.day}</h4>
                    {day.schedules.map((schedule) => (
                      <div className="schedule-row" key={`${day.day}-${schedule.time}`}>
                        <span>{schedule.time}</span>
                        <div>
                          <strong>{schedule.place}</strong>
                          <p>{schedule.memo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onAddCourse(course.id)}
                disabled={isAdded}
              >
                {isAdded ? '내 일정에 추가됨' : '내 일정에 추가'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}