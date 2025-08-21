import React from 'react';

interface CircleProps {
  className?: string;
  children?: React.ReactNode;
  x: number;
  y: number;
}

export const Circle: React.FC<CircleProps> = ({ className, children, x, y }) => {
  return (
    <div
      className={`absolute w-14 h-14 rounded-full bg-neutral-900 shadow-lg flex border-[2px] items-center justify-center ${className}`}
      style={{ left: x - 32, top: y - 32 }}
    >
      {children}
    </div>
  );
};