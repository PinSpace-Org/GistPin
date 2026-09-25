export const HIDDEN_EVENT_TYPES = ['gist_hidden', 'gist_unhidden'] as const;
export type HiddenEventType = (typeof HIDDEN_EVENT_TYPES)[number];

export interface ModerationEvent {
  type: string;
  createdAt: string | null | undefined;
}

export interface HiddenRatePoint {
  start: string;
  hidden: number;
  unhidden: number;
  net: number;
  runningNet: number;
}

export interface HiddenRateSeries {
  points: HiddenRatePoint[];
  totalHidden: number;
  totalUnhidden: number;
  netHidden: number;
  isEmpty: boolean;
}

function timeOf(iso: string | null | undefined): number | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function isHiddenEventType(type: string): type is HiddenEventType {
  return (HIDDEN_EVENT_TYPES as readonly string[]).includes(type);
}

export function buildHiddenRateSeries(
  bucketStarts: ReadonlyArray<string>,
  events: ReadonlyArray<ModerationEvent>,
): HiddenRateSeries {
  const starts = bucketStarts.map((start) => timeOf(start));
  const points: HiddenRatePoint[] = bucketStarts.map((start) => ({
    start,
    hidden: 0,
    unhidden: 0,
    net: 0,
    runningNet: 0,
  }));

  let totalHidden = 0;
  let totalUnhidden = 0;
  let runningNet = 0;

  for (const event of events) {
    if (!isHiddenEventType(event?.type)) continue;
    const at = timeOf(event?.createdAt);
    if (at === null) continue;

    let index = -1;
    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      if (start === null) continue;
      if (at >= start) index = i;
      else break;
    }
    if (index === -1) continue;

    if (event.type === 'gist_hidden') {
      points[index].hidden += 1;
      totalHidden += 1;
      runningNet += 1;
    } else {
      points[index].unhidden += 1;
      totalUnhidden += 1;
      runningNet -= 1;
    }
    points[index].net = points[index].hidden - points[index].unhidden;
    points[index].runningNet = runningNet;
  }

  return {
    points,
    totalHidden,
    totalUnhidden,
    netHidden: totalHidden - totalUnhidden,
    isEmpty: totalHidden === 0 && totalUnhidden === 0,
  };
}
