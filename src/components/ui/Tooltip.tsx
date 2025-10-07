'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top',
  className,
  delay = 300
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + scrollLeft + triggerRect.width / 2;
        y = triggerRect.top + scrollTop - 8;
        break;
      case 'bottom':
        x = triggerRect.left + scrollLeft + triggerRect.width / 2;
        y = triggerRect.bottom + scrollTop + 8;
        break;
      case 'left':
        x = triggerRect.left + scrollLeft - 8;
        y = triggerRect.top + scrollTop + triggerRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + scrollLeft + 8;
        y = triggerRect.top + scrollTop + triggerRect.height / 2;
        break;
    }

    setTooltipPosition({ x, y });
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    const handleScroll = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, updatePosition]);

  const tooltipElement = isVisible && content ? (
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg pointer-events-none',
        'max-w-xs break-words',
        position === 'top' && 'transform -translate-x-1/2 -translate-y-full',
        position === 'bottom' && 'transform -translate-x-1/2',
        position === 'left' && 'transform -translate-x-full -translate-y-1/2',
        position === 'right' && 'transform -translate-y-1/2',
        className
      )}
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
      }}
    >
      {content}
      
      {/* Arrow */}
      <div
        className={cn(
          'absolute w-2 h-2 bg-gray-900 transform rotate-45',
          position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
          position === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
          position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
          position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
        )}
      />
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      {typeof window !== 'undefined' && tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
}
