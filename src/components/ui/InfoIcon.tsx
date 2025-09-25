'use client';

import { Info } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { cn } from '@/lib/utils';

interface InfoIconProps {
  content: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoIcon({ 
  content, 
  className,
  size = 'sm',
  position = 'top'
}: InfoIconProps) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  return (
    <Tooltip content={content} position={position}>
      <div className={cn(
        'inline-flex items-center justify-center rounded-full bg-gray-400 hover:bg-gray-500 transition-colors cursor-help',
        'text-white',
        size === 'sm' && 'h-4 w-4',
        size === 'md' && 'h-5 w-5',
        size === 'lg' && 'h-6 w-6',
        className
      )}>
        <Info className={cn(sizeClasses[size])} />
      </div>
    </Tooltip>
  );
}
