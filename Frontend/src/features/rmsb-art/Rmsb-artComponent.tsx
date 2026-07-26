
import React from 'react';
import { useRmsb-art } from './useRmsb-art';
import { Rmsb-artData } from './Rmsb-artTypes';

export const Rmsb-artComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useRmsb-art();

  return (
    <div className="p-4 border rounded">
      <h2>Rmsb-art Feature</h2>
      <p>Status: {isActive ? 'Active' : 'Inactive'}</p>
      <button onClick={toggleActive} className="btn">Toggle</button>
      <button onClick={refresh} className="btn">Refresh Data</button>
      <ul>
        {data.map((item: Rmsb-artData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
