
import React from 'react';
import { useRmsbArt } from './useRmsbArt';
import { RmsbArtData } from './RmsbArtTypes';

export const RmsbArtComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useRmsbArt();

  return (
    <div className="p-4 border rounded">
      <h2>RmsbArt Feature</h2>
      <p>Status: {isActive ? 'Active' : 'Inactive'}</p>
      <button onClick={toggleActive} className="btn">Toggle</button>
      <button onClick={refresh} className="btn">Refresh Data</button>
      <ul>
        {data.map((item: RmsbArtData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
