import type { ReactNode } from 'react';

interface DividerProps {
  children: ReactNode;
}

export default function Divider({ children }: DividerProps) {
  return (
    <div className="flex items-center justify-center w-full my-8">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-700/50 dark:to-slate-700/50"></div>

      <div className="mx-6 flex items-center justify-center">
        {children}
      </div>

      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-700/50 dark:to-slate-700/50"></div>
    </div>
  );
}