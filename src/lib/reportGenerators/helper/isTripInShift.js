import { calculateMinuteDifference } from '@/lib/utils';

export function isTripInShift(rawStart, rawFinish, shift) {
  if (!shift || !shift.startTime || !shift.endTime) return true;
  if (!rawStart || !rawFinish) return false;

  try {
    const start = new Date(rawStart.replace(' ', 'T'));
    const finish = new Date(rawFinish.replace(' ', 'T'));
    const startMs = new Date(start).getTime();
    const finishMs = new Date(finish).getTime();

    if (isNaN(startMs) || isNaN(finishMs)) return false;

    const durationMinutes = calculateMinuteDifference(start, finish);
    if (durationMinutes !== null && durationMinutes >= 840) return true;

    const [sH, sM] = shift.startTime.split(':').map(Number);
    const [eH, eM] = shift.endTime.split(':').map(Number);

    const wibStart = new Date(startMs);
    const y = wibStart.getFullYear();
    const m = wibStart.getMonth();
    const d = wibStart.getDate();

    const shiftStartMs = new Date(y, m, d, sH, sM, 0, 0).getTime();
    let shiftEndMs = new Date(y, m, d, eH, eM, 0, 0).getTime();

    if (shift.multiday >= 1 || shiftEndMs <= shiftStartMs) {
      shiftEndMs += 86400000;
    }

    return startMs <= shiftEndMs && finishMs >= shiftStartMs;
  } catch (e) {
    return true;
  }
}
