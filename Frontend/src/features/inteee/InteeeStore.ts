import { createContext } from "react";
import { InteeeState, InteeeData } from "./InteeeTypes";

export interface InteeeStore extends InteeeState {
  toggleActive: () => void;
  setData: (data: InteeeData[]) => void;
}

export const InteeeStoreContext = createContext<InteeeStore | undefined>(
  undefined,
);
