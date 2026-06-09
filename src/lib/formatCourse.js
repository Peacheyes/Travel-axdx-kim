import { applyCoordsToDays } from './placeGeocoding';

export function isAiGeneratedCourse(courseId) {
  return String(courseId).startsWith('ai-course-');
}

export function buildDaysDraft(itinerary = []) {
  return itinerary.map((dayPlan) => ({
    day: `Day ${dayPlan.day}`,
    schedules: (dayPlan.places || []).map((place) => ({
      place: place.placeName || '장소명 없음',
      category: place.category || '관광',
      transit: place.transitInfo || '',
      cost: Number(place.estimatedCost) || 0,
      tourApiImg: null,
      mapx: null,
      mapy: null,
    })),
  }));
}

export function collectUniquePlaceNames(aiData = []) {
  return [...new Set(
    aiData.flatMap((item) =>
      (item.itinerary || []).flatMap((dayPlan) =>
        (dayPlan.places || []).map((place) => place.placeName).filter(Boolean),
      ),
    ),
  )];
}

export async function formatAiCourse(item, index, destination) {
  const safeBudget = Number(item.totalBudget) || 0;
  const daysDraft = buildDaysDraft(item.itinerary);
  const daysWithCoords = await applyCoordsToDays(daysDraft, destination);
  const headerImage = daysWithCoords
    .flatMap((day) => day.schedules)
    .find((schedule) => schedule.tourApiImg)?.tourApiImg || null;

  return {
    id: `ai-course-${Date.now()}-${index}`,
    influencerCourse: false,
    estimatedTime: `예상 총 경비: ${safeBudget.toLocaleString()}원`,
    theme: item.themeName || '맞춤 테마',
    description: item.themeDescription || '',
    headerImg: headerImage,
    days: daysWithCoords,
  };
}
