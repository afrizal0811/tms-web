export function isTripInShift(rawStart, rawFinish, shift) {
  if (!shift || !shift.startTime || !shift.endTime) return true;
  if (!rawStart || !rawFinish) return false;

  try {
    const safeStart = rawStart.replace(' ', 'T') + (rawStart.includes('Z') ? '' : 'Z');
    const safeFinish = rawFinish.replace(' ', 'T') + (rawFinish.includes('Z') ? '' : 'Z');

    const startMs = new Date(safeStart).getTime();
    const finishMs = new Date(safeFinish).getTime();

    if (isNaN(startMs) || isNaN(finishMs)) return false;

    const durationHours = (finishMs - startMs) / 3600000;
    if (durationHours >= 14) return true;

    const [sH, sM] = shift.startTime.split(':').map(Number);
    const [eH, eM] = shift.endTime.split(':').map(Number);

    const wibStart = new Date(startMs + 7 * 3600000);
    const y = wibStart.getUTCFullYear();
    const m = wibStart.getUTCMonth();
    const d = wibStart.getUTCDate();

    const shiftStartMs = Date.UTC(y, m, d, sH - 7, sM, 0, 0);
    let shiftEndMs = Date.UTC(y, m, d, eH - 7, eM, 0, 0);

    if (shift.multiday >= 1 || shiftEndMs <= shiftStartMs) {
      shiftEndMs += 86400000;
    }

    return startMs <= shiftEndMs && finishMs >= shiftStartMs;
  } catch (e) {
    return true;
  }
}
