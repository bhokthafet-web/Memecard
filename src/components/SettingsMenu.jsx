import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import './CardForm.css';
import './SettingsMenu.css';

// A persistent, always-spinning gear in the header — opens a panel
// consolidating the app's auxiliary info: audio/Bluetooth routing,
// connectivity, and account status. Distinct from AuthPanel's Sign in
// button, which stays as the primary action.
export function SettingsMenu({ auth }) {
  const [isOpen, setIsOpen] = useState(false);
  const isOnline = useOnlineStatus();

  return (
    <>
      <button
        type="button"
        className="settings-gear-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Settings"
        title="Settings"
      >
        <span className="settings-gear-icon" aria-hidden="true">⚙️</span>
      </button>

      {isOpen && (
        <div className="card-form-overlay" role="dialog" aria-modal="true">
          <div className="card-form settings-panel">
            <button
              type="button"
              className="card-form-close pop-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close settings"
            >
              ✕
            </button>

            <h2 className="card-form-heading">Settings</h2>

            <section className="settings-section">
              <h3>🔊 Audio output</h3>
              <p>Play audio through your device's currently selected speaker.</p>
              <p className="settings-strong">Bluetooth speaker?</p>
              <p>
                Connect it from your device's Bluetooth settings (not from inside this
                app — a website can't pair Bluetooth audio devices itself), then press
                Play as usual.
              </p>
            </section>

            <section className="settings-section">
              <h3>📶 Connection</h3>
              <p>
                Status:{' '}
                <span className={isOnline ? 'settings-status-ok' : 'settings-status-bad'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </p>
              <p>Works over Wi-Fi or a mobile hotspot — either connects the same way.</p>
            </section>

            <section className="settings-section">
              <h3>👤 Account</h3>
              {auth.enabled ? (
                auth.user ? (
                  <p>
                    Signed in as <strong>{auth.profile?.email || auth.user.email}</strong>
                    {auth.isAdmin ? ' — admin' : ''}. Your wall syncs across devices.
                  </p>
                ) : (
                  <p>Not signed in. Your wall stays on this device only until you sign in.</p>
                )
              ) : (
                <p>Accounts aren't set up for this deployment — everything stays on this device.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
