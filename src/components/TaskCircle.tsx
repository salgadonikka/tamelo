import { CircleState } from '@/types/task';
import { cn } from '@/lib/utils';

interface TaskCircleProps {
  state: CircleState;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function TaskCircle({ state, onClick, disabled = false, size = 'md' }: TaskCircleProps) {
  const sizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  
  const baseClasses = cn(
    'rounded-full border-2 transition-all duration-200 flex items-center justify-center',
    sizeClasses,
    disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-110',
  );

  if (state === 'empty') {
    return (
      <button 
        onClick={onClick}
        disabled={disabled}
        className={cn(baseClasses, 'border-dashed border-border/50 bg-transparent')}
        aria-label="Add marker"
      />
    );
  }

  if (state === 'planned') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(baseClasses, 'border-circle-empty bg-transparent animate-fade-up')}
        aria-label="Planned"
      />
    );
  }

  if (state === 'started') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(baseClasses, 'border-circle-started bg-transparent relative animate-fade-up')}
        aria-label="Started"
      >
        <div className="w-0.5 h-3 bg-circle-started rounded-full" />
      </button>
    );
  }

  if (state === 'completed') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(baseClasses, 'border-circle-completed bg-circle-completed animate-fade-up')}
        aria-label="Completed"
      />
    );
  }

  return null;
}
