import React from 'react';

export interface WeekdayHourData {
  day: string; // Mon, Tue, etc.
  hour: number; // 0-23
  count: number;
}

export interface WeekdayHourHeatmapProps {
  data?: WeekdayHourData[];
  onCellClick?: (day: string, hour: number) => void;
}

export const WeekdayHourHeatmap: React.FC<WeekdayHourHeatmapProps> = ({
  data = [],
  onCellClick,
}) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getIntensity = (day: string, hour: number) => {
    const match = data.find(d => d.day === day && d.hour === hour);
    return match ? match.count : 0;
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Weekday by Hour Posting Heatmap
      </h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-25 gap-1 text-xs">
            <div className="font-medium text-gray-500">Day</div>
            {hours.map(h => (
              <div key={h} className="text-center font-mono text-gray-400">
                {h}
              </div>
            ))}
            {days.map(day => (
              <React.Fragment key={day}>
                <div className="font-medium text-gray-600 dark:text-gray-300 py-1">{day}</div>
                {hours.map(hour => {
                  const val = getIntensity(day, hour);
                  return (
                    <button
                      key={`${day}-${hour}`}
                      onClick={() => onCellClick?.(day, hour)}
                      className="w-full h-6 rounded transition-colors hover:ring-2 ring-indigo-500"
                      style={{
                        backgroundColor: val > 0 ? `rgba(99, 102, 241, ${Math.min(1, val / 50)})` : '#f3f4f6',
                      }}
                      title={`${day} ${hour}:00 - ${val} posts`}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekdayHourHeatmap;
