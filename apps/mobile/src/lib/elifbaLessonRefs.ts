type ElifbaLessonRef = { id: number };

export function isValidElifbaLessonNumber(dersId: number): boolean {
  return Number.isFinite(dersId) && Number.isInteger(dersId) && dersId > 0;
}

export function isValidElifbaLessonId(
  dersId: number,
  lessons: readonly ElifbaLessonRef[],
): boolean {
  return isValidElifbaLessonNumber(dersId) && lessons.some((lesson) => lesson.id === dersId);
}
