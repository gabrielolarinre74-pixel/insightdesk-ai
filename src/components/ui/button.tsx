import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-ink-950 text-white hover:bg-ink-800',
        brand: 'bg-brand-500 text-white shadow-glow hover:bg-brand-600',
        outline: 'bg-white text-ink-800 shadow-card hover:bg-ink-50',
        ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
        subtle: 'bg-ink-100 text-ink-800 hover:bg-ink-200',
      },
      size: {
        default: 'h-10 rounded-xl px-4 text-sm',
        sm: 'h-8 rounded-lg px-3 text-[13px]',
        lg: 'h-12 rounded-xl px-5 text-[15px]',
        icon: 'size-9 rounded-xl',
        'icon-sm': 'size-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
