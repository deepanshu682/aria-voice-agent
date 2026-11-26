'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  id?: string;
}

export function Switch({ checked, onCheckedChange, label, className, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40',
        checked
          ? 'bg-gradient-to-r from-orange-600 to-rose-600'
          : 'bg-stone-200 hover:bg-stone-300',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  ariaLabel?: string;
}

export function Slider({ value, min, max, step = 1, onChange, className, ariaLabel }: SliderProps) {
  return (
    <input
      type="range"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'w-full h-1.5 rounded-lg appearance-none bg-stone-200 accent-orange-600 cursor-pointer',
        className
      )}
    />
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200/70', className)}>
      <div
        className="h-full bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
