import { useDeviceType, getDayCount } from './useDeviceType';

/**
 * Returns the visible days for the current device.
 * Now that useTaskStore generates the correct number of days,
 * this hook simply returns all provided days.
 */
export function useVisibleDays(days: Date[]): Date[] {
  return days;
}
