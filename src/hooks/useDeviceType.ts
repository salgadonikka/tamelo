import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < MOBILE_BREAKPOINT) setDeviceType('mobile');
      else if (w < TABLET_BREAKPOINT) setDeviceType('tablet');
      else setDeviceType('desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return deviceType;
}

/** Number of visible day columns per device */
export function getDayCount(device: DeviceType): number {
  switch (device) {
    case 'mobile': return 3;
    case 'tablet': return 5;
    case 'desktop': return 7;
  }
}

/** Navigation step size per device (same as day count) */
export function getNavStep(device: DeviceType): number {
  return getDayCount(device);
}
