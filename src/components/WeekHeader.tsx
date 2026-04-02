import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekInfo } from '@/types/task';
import { cn } from '@/lib/utils';
import { useRef, TouchEvent } from 'react';

interface WeekHeaderProps {
  weekInfo: WeekInfo;
  currentWeekOffset: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
}

export function WeekHeader({ 
  weekInfo, 
  currentWeekOffset,
  onPreviousWeek, 
  onNextWeek,
  onCurrentWeek 
}: WeekHeaderProps) {
  const days = weekInfo.days;
  const monthYear = format(weekInfo.startDate, 'MMMM yyyy');
  const weekRange = `${format(weekInfo.startDate, 'MMM d')} – ${format(weekInfo.endDate, 'MMM d')}`;
  
  // Swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e: TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      onNextWeek();
    } else if (isRightSwipe) {
      onPreviousWeek();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div 
      className="border-b border-border pb-2 md:pb-4 mb-2 md:mb-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Month/Year and week range - centered */}
      <div className="text-center mb-2 md:mb-4">
        <button
          onClick={onCurrentWeek}
          className={cn(
            "transition-colors",
            currentWeekOffset === 0 ? "cursor-default" : "hover:text-primary"
          )}
          disabled={currentWeekOffset === 0}
        >
          <h2 className="font-display text-base md:text-xl font-semibold text-foreground">
            {monthYear}
          </h2>
        </button>
        <p className="text-xs md:text-sm text-muted-foreground">{weekRange}</p>
      </div>

      {/* Day columns with inline navigation arrows */}
      <div className="flex items-center justify-end">
        {/* Spacer for task title column */}
        <div className="flex-1 min-w-0" />
        
        {/* Previous week arrow */}
        <button 
          onClick={onPreviousWeek}
          className="week-nav-button w-5 h-5 md:w-auto md:h-auto p-0 md:p-1 flex items-center justify-center flex-shrink-0"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Day columns */}
        <div className="flex day-columns-grid">
          {days.map((day) => {
            const dayIsToday = isToday(day);
            const dayIsPast = isBefore(startOfDay(day), startOfDay(new Date())) && !dayIsToday;
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  'day-column w-8 md:w-10 text-center',
                  dayIsToday && 'day-column--today'
                )}
              >
                <span className={cn(
                  'text-xs font-medium uppercase',
                  dayIsToday ? 'text-primary' : dayIsPast ? 'text-muted-foreground/60' : 'text-muted-foreground'
                )}>
                  {format(day, 'EEEEE')}
                </span>
                <span className={cn(
                  'text-sm block mt-0.5',
                  dayIsToday ? 'text-primary font-semibold' : dayIsPast ? 'text-muted-foreground/60' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Next week arrow */}
        <button 
          onClick={onNextWeek}
          className="week-nav-button w-5 h-5 md:w-auto md:h-auto p-0 md:p-1 flex items-center justify-center flex-shrink-0"
          aria-label="Next week"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  );
}
