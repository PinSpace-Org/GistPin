import React from 'react';

export interface GistPopupData {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  geohash: string;
}

export interface GistDetailsPopupProps {
  gist?: GistPopupData | null;
  onClose?: () => void;
}

export const GistDetailsPopup: React.FC<GistDetailsPopupProps> = ({
  gist,
  onClose,
}) => {
  if (!gist) return null;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-w-sm">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{gist.title}</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>
      <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
        <p><strong>Author:</strong> {gist.author}</p>
        <p><strong>Geohash:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{gist.geohash}</code></p>
        <p><strong>Created:</strong> {gist.createdAt}</p>
      </div>
    </div>
  );
};

export default GistDetailsPopup;
