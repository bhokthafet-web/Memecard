import './OfflineBanner.css';

export function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      <span className="offline-banner-icon" aria-hidden="true">📡</span>
      <div>
        <p className="offline-banner-title">You're offline.</p>
        <p className="offline-banner-body">
          Please check your Wi-Fi or mobile hotspot connection and try again.
        </p>
      </div>
    </div>
  );
}
