import Link from 'next/link';
import { getActiveCampaignEvent } from '@/lib/rakuten/calendar';

export function EventBanner() {
  const event = getActiveCampaignEvent();

  return (
    <div
      className={`event-strip ${event.isHighConversionDay ? 'event-strip-high' : ''}`}
      role="region"
      aria-label="本日のキャンペーン情報"
    >
      <div className="container event-strip-inner">
        <div className="event-meta">
          <span className="event-tag">{event.urgencyLabel}</span>
          <span className="event-title">{event.title}</span>
          <span className="event-subtitle">{event.subtitle}</span>
        </div>
        <Link href="/programs" className="section-link" style={{ fontSize: '0.82rem' }}>
          Amazon公式キャンペーンを見る →
        </Link>
      </div>
    </div>
  );
}
