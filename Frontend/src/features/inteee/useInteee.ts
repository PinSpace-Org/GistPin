import { useState } from "react";
import { InteeeData } from "./InteeeTypes";

export const useInteee = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<InteeeData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
