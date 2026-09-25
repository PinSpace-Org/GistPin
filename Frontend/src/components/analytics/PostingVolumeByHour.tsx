import React from 'react';

export interface HourlyVolume {
  hour: number;
  volume: number;
}

export interface PostingVolumeByHourProps {
  hourlyData?: HourlyVolume[];
}

export const PostingVolumeByHour: React.FC<PostingVolumeByHourProps> = ({
  hourlyData = [],
}) => {
  const maxVolume = Math.max(...hourlyData.map(d => d.volume), 1);

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
        Posting Volume by Hour of Day
      </h3>
      <div className="flex items-end h-40 gap-1 pt-4">
        {Array.from({ length: 24 }).map((_, hour) => {
          const item = hourlyData.find(d => d.hour === hour);
          const vol = item ? item.volume : 0;
          const heightPercent = (vol / maxVolume) * 100;
          return (
            <div key={hour} className="flex-1 flex flex-col items-center group">
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-full flex items-end rounded-t overflow-hidden">
                <div
                  className="w-full bg-indigo-500 group-hover:bg-indigo-400 transition-all rounded-t"
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-1 font-mono">{hour}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PostingVolumeByHour;
