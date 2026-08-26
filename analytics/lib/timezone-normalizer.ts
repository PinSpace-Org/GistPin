export interface TimezoneOffset {
  zone: string;
  utcOffset: number;
  label: string;
}

export interface TimezoneActivity {
  zone: string;
  utcOffset: number;
  hourly: number[];
  totalGists: number;
  peakHour: number;
}

export interface NormalizedActivity {
  localHour: number;
  utcHour: number;
  rawCount: number;
  normalizedCount: number;
}

export interface PeakHourComparison {
  zone: string;
  utcPeak: number;
  localPeak: number;
  utcCount: number;
  localCount: number;
}

const TIMEZONE_ZONES: TimezoneOffset[] = [
  { zone: 'Pacific/Auckland',   utcOffset: 12,  label: 'NZST' },
  { zone: 'Asia/Tokyo',         utcOffset: 9,   label: 'JST'  },
  { zone: 'Asia/Shanghai',      utcOffset: 8,   label: 'CST'  },
  { zone: 'Asia/Singapore',     utcOffset: 8,   label: 'SGT'  },
  { zone: 'Asia/Kolkata',       utcOffset: 5.5, label: 'IST'  },
  { zone: 'Asia/Dubai',         utcOffset: 4,   label: 'GST'  },
  { zone: 'Europe/Moscow',      utcOffset: 3,   label: 'MSK'  },
  { zone: 'Europe/Istanbul',    utcOffset: 3,   label: 'TRT'  },
  { zone: 'Europe/Berlin',      utcOffset: 1,   label: 'CET'  },
  { zone: 'Europe/London',      utcOffset: 0,   label: 'GMT'  },
  { zone: 'America/Sao_Paulo',  utcOffset: -3,  label: 'BRT'  },
  { zone: 'America/New_York',   utcOffset: -4,  label: 'EDT'  },
  { zone: 'America/Chicago',    utcOffset: -5,  label: 'CDT'  },
  { zone: 'America/Denver',     utcOffset: -6,  label: 'MDT'  },
  { zone: 'America/Los_Angeles', utcOffset: -7, label: 'PDT'  },
];

export function getOffsets(): TimezoneOffset[] {
  return TIMEZONE_ZONES;
}

export function detectTimezoneFromCoords(lat: number, lng: number): TimezoneOffset {
  const tzLookup: Record<string, number> = {
    'Pacific': 12,
    'Asia/Tokyo': 9,
    'Asia/Shanghai': 8,
    'Asia/Singapore': 8,
    'Asia/Kolkata': 5.5,
    'Asia/Dubai': 4,
    'Europe/Moscow': 3,
    'Europe/Istanbul': 3,
    'Europe/Berlin': 1,
    'Europe/London': 0,
    'America/Sao_Paulo': -3,
    'America/New_York': -4,
    'America/Chicago': -5,
    'America/Denver': -6,
    'America/Los_Angeles': -7,
  };

  if (lng >= 120 && lng <= 180 && lat >= -50 && lat <= 60) {
    return TIMEZONE_ZONES.find((z) => z.zone === 'Asia/Tokyo')!;
  }
  if (lng >= 73 && lng < 120 && lat >= 0 && lat <= 55) {
    return TIMEZONE_ZONES.find((z) => z.zone === 'Asia/Shanghai')!;
  }
  if (lng >= 68 && lng < 90 && lat >= 5 && lat <= 38) {
    return TIMEZONE_ZONES.find((z) => z.zone === 'Asia/Kolkata')!;
  }
  if (lng >= -10 && lng < 40 && lat >= 35 && lat <= 72) {
    return TIMEZONE_ZONES.find((z) => z.zone === 'Europe/Berlin')!;
  }
  if (lng >= -85 && lng < -60 && lat >= 25 && lat <= 50) {
    return TIMEZONE_ZONES.find((z) => z.zone === 'America/New_York')!;
  }
  if (lng >= -125 && lng < -100 && lat >= 25 && lat <= 55) {
    return TIMEZONE_ZONES.find((z) => z.zone === 'America/Los_Angeles')!;
  }

  const offset = Math.round((lng / 15 + Number.EPSILON) * 2) / 2;
  const closest = TIMEZONE_ZONES.reduce((best, z) =>
    Math.abs(z.utcOffset - offset) < Math.abs(best.utcOffset - offset) ? z : best
  );
  return closest;
}

export function normalizeActivityByLocalTime(
  activity: TimezoneActivity[]
): NormalizedActivity[] {
  const result: NormalizedActivity[] = [];
  for (let hour = 0; hour < 24; hour++) {
    let rawTotal = 0;
    let normTotal = 0;
    let count = 0;
    for (const tz of activity) {
      const localHour = (hour - tz.utcOffset + 24) % 24;
      const raw = tz.hourly[localHour] ?? 0;
      rawTotal += raw;
      normTotal += raw;
      count++;
    }
    result.push({
      localHour: hour,
      utcHour: hour,
      rawCount: rawTotal,
      normalizedCount: count > 0 ? Math.round(normTotal / count) : 0,
    });
  }
  return result;
}

export function computePeakHours(activity: TimezoneActivity[]): PeakHourComparison[] {
  return activity.map((tz) => {
    const utcPeakHour = tz.hourly.indexOf(Math.max(...tz.hourly));
    const localPeakHour = (utcPeakHour + tz.utcOffset + 24) % 24;
    return {
      zone: tz.zone,
      utcPeak: utcPeakHour,
      localPeak: localPeakHour,
      utcCount: Math.max(...tz.hourly),
      localCount: tz.hourly[utcPeakHour],
    };
  });
}

export function buildGlobalPeakChart(
  activity: TimezoneActivity[],
  mode: 'utc' | 'local'
): { labels: string[]; data: number[] } {
  const labels: string[] = [];
  const data: number[] = [];

  for (let hour = 0; hour < 24; hour++) {
    labels.push(`${String(hour).padStart(2, '0')}:00`);
    let total = 0;
    for (const tz of activity) {
      const idx = mode === 'local'
        ? (hour + tz.utcOffset + 24) % 24
        : hour;
      total += tz.hourly[idx] ?? 0;
    }
    data.push(Math.round(total / activity.length));
  }

  return { labels, data };
}

export function getTimezoneDistribution(activity: TimezoneActivity[]): { zone: string; count: number }[] {
  return activity
    .map((tz) => ({ zone: tz.zone, count: tz.totalGists }))
    .sort((a, b) => b.count - a.count);
}

export function generateMockTimezoneActivity(): TimezoneActivity[] {
  return TIMEZONE_ZONES.map((tz) => {
    const peakHour = (14 - tz.utcOffset + 24) % 24;
    const hourly = Array.from({ length: 24 }, (_, h) => {
      const dist = Math.min(
        Math.abs(h - peakHour),
        24 - Math.abs(h - peakHour)
      );
      const base = Math.max(0, 100 - dist * dist * 1.8);
      const jitter = Math.round(Math.random() * 15 - 7);
      return Math.max(0, Math.round(base + jitter));
    });
    const totalGists = hourly.reduce((s, v) => s + v, 0);
    return {
      zone: tz.zone,
      utcOffset: tz.utcOffset,
      hourly,
      totalGists,
      peakHour,
    };
  });
}
