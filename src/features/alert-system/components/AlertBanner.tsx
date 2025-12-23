import React from 'react';
import type { Alert } from '../hooks';

interface AlertBannerProps {
  alerts: Alert[];
}

/**
 * Displays active alerts as a sliding banner
 * Shows the most critical alert prominently
 */
export function AlertBanner({ alerts }: AlertBannerProps): React.JSX.Element | null {
  if (alerts.length === 0) {
    return null;
  }

  // Show the most critical alert (danger > warning)
  const criticalAlert = alerts.find(a => a.type === 'danger') || alerts[0];
  const isDanger = criticalAlert.type === 'danger';

  const bannerClass = isDanger 
    ? 'bg-gradient-to-r from-red-500/95 to-red-700/95 animate-pulse'
    : 'bg-gradient-to-r from-yellow-400/90 to-amber-500/90';

  return (
    <div className={`fixed top-0 left-0 right-0 z-[1000] px-6 py-3 animate-slide-down ${bannerClass}`}>
      <div className="flex items-center justify-center gap-3 max-w-[1200px] mx-auto">
        <span className="text-xl">
          {isDanger ? '🚨' : '⚠️'}
        </span>
        <span className="font-semibold text-white drop-shadow-sm">
          {criticalAlert.message}
        </span>
        {alerts.length > 1 && (
          <span className="bg-black/20 px-2.5 py-1 rounded-full text-xs text-white">
            +{alerts.length - 1} 其他告警
          </span>
        )}
      </div>
    </div>
  );
}
