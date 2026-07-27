import { useState } from "react";
import { DeeeelightttData } from "./DeeeelightttTypes";

export const useDeeeelighttt = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<DeeeelightttData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
