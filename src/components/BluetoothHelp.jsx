import { useState } from 'react';
import './BluetoothHelp.css';

// Deliberately NOT a "Connect Bluetooth" button. Browsers cannot pair with or
// stream audio to a Bluetooth speaker via Web Bluetooth (it exposes GATT
// services, not the A2DP audio profile) — routing audio is entirely up to the
// OS's currently selected output device. So this is a help disclosure only:
// standard <audio> playback already goes wherever the OS is currently routing
// sound, Bluetooth speaker included.
export function BluetoothHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bt-help">
      <button
        type="button"
        className="bt-help-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        🔊 Audio {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="bt-help-body">
          <p>Play audio through your device's selected speaker.</p>
          <p className="bt-help-question">Bluetooth speaker?</p>
          <p>Connect it from your device's Bluetooth settings, then press Play.</p>
        </div>
      )}
    </div>
  );
}
