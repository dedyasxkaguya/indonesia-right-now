'use client';
import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  variant?: 'line' | 'block' | 'avatar' | 'card';
  count?: number; // number of repeated lines (for line variant)
  className?: string;
}

export function Skeleton({ variant = 'line', count = 1, className }: SkeletonProps) {
  const base = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  const line = <div className={clsx(base, 'h-4 w-full rounded', className)} />;
  const block = <div className={clsx(base, 'h-48 w-full rounded', className)} />;
  const avatar = <div className={clsx(base, 'h-10 w-10 rounded-full', className)} />;
  const card = <div className={clsx(base, 'h-32 w-full rounded-md', className)} />;

  switch (variant) {
    case 'block':
      return block;
    case 'avatar':
      return avatar;
    case 'card':
      return card;
    case 'line':
    default:
      return (
        <>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={clsx(base, 'h-4 w-full rounded mb-2', className)} />
          ))}
        </>
      );
  }
}

export default Skeleton;
