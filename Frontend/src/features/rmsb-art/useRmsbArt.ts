
import { useState } from 'react';
import { RmsbArtData } from './RmsbArtTypes';

export const useRmsbArt = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<RmsbArtData[]>([]);
  
  const toggleActive = () => setIsActive(prev => !prev);
  const refresh = () => {
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
