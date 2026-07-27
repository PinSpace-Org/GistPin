import React from "react";
import { useInteee } from "./useInteee";
import { InteeeData } from "./InteeeTypes";

export const InteeeComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useInteee();

  return (
    <div className="p-4 border rounded">
      <h2>Inteee Feature</h2>
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      <button onClick={toggleActive} className="btn">
        Toggle
      </button>
      <button onClick={refresh} className="btn">
        Refresh Data
      </button>
      <ul>
        {data.map((item: InteeeData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
