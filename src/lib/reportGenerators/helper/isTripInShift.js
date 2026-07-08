export function isTripInShift(rawStart, rawFinish, shift) {
  if (!shift || !shift.startTime || !shift.endTime) return true;
  if (!rawStart || !rawFinish) return false;

  try {
    const safeStart = rawStart.replace(' ', 'T') + (rawStart.includes('Z') ? '' : 'Z');
    const safeFinish = rawFinish.replace(' ', 'T') + (rawFinish.includes('Z') ? '' : 'Z');

    const startMs = new Date(safeStart).getTime();
    const finishMs = new Date(safeFinish).getTime();

    if (isNaN(startMs) || isNaN(finishMs)) return false;

    const durationHours = (finishMs - startMs) / (1000 * 60 * 60);
    if (durationHours >= 14) {
      return true;
    }

    const midpointMs = startMs + (finishMs - startMs) / 2;
    const midpointDate = new Date(midpointMs);

    const [sH, sM] = shift.startTime.split(':').map(Number);
    const [eH, eM] = shift.endTime.split(':').map(Number);

    const shiftStart = new Date(midpointDate);
    shiftStart.setUTCHours((sH || 0) - 7, sM || 0, 0, 0);

    const shiftEnd = new Date(midpointDate);
    shiftEnd.setUTCHours((eH || 0) - 7, eM || 0, 0, 0);

    if (shift.multiday >= 1 || shiftEnd <= shiftStart) {
      shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);
    }

    return midpointMs >= shiftStart.getTime() && midpointMs <= shiftEnd.getTime();
  } catch (e) {
    return true;
  }
}
