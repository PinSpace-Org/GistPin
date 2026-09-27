'use client';

import { forwardRef } from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(({ children, className = '' }, ref) => (
  <div className="overflow-x-auto">
    <table ref={ref} className={`w-full text-sm ${className}`}>
      {children}
    </table>
  </div>
));
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, TableProps>(({ children, className = '' }, ref) => (
  <thead ref={ref} className={`[&_tr]:border-b [&_tr]:border-neutral-200 dark:[&_tr]:border-neutral-800 ${className}`}>
    {children}
  </thead>
));
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, TableProps>(({ children, className = '' }, ref) => (
  <tbody ref={ref} className={`[&_tr:last-child]:border-0 ${className}`}>
    {children}
  </tbody>
));
TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, React.ThHTMLAttributes<HTMLTableRowElement>>(
  ({ children, className = '', ...props }, ref) => (
    <tr ref={ref} className={`border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${className}`} {...props}>
      {children}
    </tr>
  ),
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ children, className = '', ...props }, ref) => (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    >
      {children}
    </th>
  ),
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ children, className = '', ...props }, ref) => (
    <td ref={ref} className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props}>
      {children}
    </td>
  ),
);
TableCell.displayName = 'TableCell';

export const TableCaption = forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ children, className = '', ...props }, ref) => (
    <caption ref={ref} className={`mt-4 text-sm text-neutral-500 dark:text-neutral-400 ${className}`} {...props}>
      {children}
    </caption>
  ),
);
TableCaption.displayName = 'TableCaption';