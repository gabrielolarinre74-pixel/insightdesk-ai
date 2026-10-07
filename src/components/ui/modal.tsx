'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({ open, onOpenChange, title, description, children, footer, className }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-950/45 backdrop-blur-[2px]" />
        <Dialog.Content className={cn('fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 animate-rise overflow-hidden rounded-2xl bg-white shadow-lift outline-none', className)}>
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
            <div>
              <Dialog.Title className="text-[17px] font-semibold tracking-tight">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-0.5 text-[13px] text-ink-500">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-950" aria-label="Close"><X className="size-4" /></Dialog.Close>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-ink-100 bg-ink-50 px-6 py-3.5">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
