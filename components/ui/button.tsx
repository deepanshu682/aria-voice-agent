import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'gradient' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      default:
        'bg-stone-900 text-stone-50 shadow-xs hover:bg-stone-800 focus-visible:ring-2 focus-visible:ring-orange-500/40',
      gradient:
        'bg-gradient-to-r from-orange-600 via-rose-600 to-fuchsia-600 text-white shadow-sm hover:from-orange-500 hover:via-rose-500 hover:to-fuchsia-500 focus-visible:ring-2 focus-visible:ring-orange-500/40',
      secondary:
        'bg-orange-50 text-orange-950 border border-orange-200/80 hover:bg-orange-100/80',
      outline:
        'border border-stone-200 bg-white text-stone-800 shadow-2xs hover:bg-orange-50/50 hover:border-orange-300 hover:text-stone-950',
      ghost: 'text-stone-600 hover:bg-orange-50/70 hover:text-stone-900',
      destructive: 'bg-red-600 text-white shadow-xs hover:bg-red-500',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      default: 'h-9 px-4 py-2 text-xs',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-lg px-5 text-sm',
      icon: 'h-9 w-9',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none shrink-0',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
