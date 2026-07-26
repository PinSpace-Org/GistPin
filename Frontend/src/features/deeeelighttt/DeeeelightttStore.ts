import { createContext } from "react";
import { DeeeelightttState, DeeeelightttData } from "./DeeeelightttTypes";

export interface DeeeelightttStore extends DeeeelightttState {
  toggleActive: () => void;
  setData: (data: DeeeelightttData[]) => void;
}

export const DeeeelightttStoreContext = createContext<
  DeeeelightttStore | undefined
>(undefined);
