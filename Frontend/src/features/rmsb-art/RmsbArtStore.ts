
import { createContext } from 'react';
import { RmsbArtState, RmsbArtData } from './RmsbArtTypes';

export interface RmsbArtStore extends RmsbArtState {
  toggleActive: () => void;
  setData: (data: RmsbArtData[]) => void;
}

export const RmsbArtStoreContext = createContext<RmsbArtStore | undefined>(undefined);
