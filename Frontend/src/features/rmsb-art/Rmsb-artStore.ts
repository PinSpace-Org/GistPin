
import { createContext } from 'react';
import { Rmsb-artState, Rmsb-artData } from './Rmsb-artTypes';

export interface Rmsb-artStore extends Rmsb-artState {
  toggleActive: () => void;
  setData: (data: Rmsb-artData[]) => void;
}

export const Rmsb-artStoreContext = createContext<Rmsb-artStore | undefined>(undefined);
