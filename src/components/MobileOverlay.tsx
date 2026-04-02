import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function MobileOverlay({ isOpen, onClose, title, children }: MobileOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={cn(
          'absolute inset-y-0 right-0 w-full max-w-sm bg-card shadow-xl',
          'animate-slide-in-right'
        )}
      >
        {children}
      </div>
    </div>
  );
}
