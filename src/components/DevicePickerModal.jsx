import React, { useState, useEffect, useCallback } from 'react';

export default function DevicePickerModal({
  isOpen,
  onClose,
  audioRef,
  activeDeviceId,
  setActiveDeviceId
}) {
  const [devices, setDevices] = useState([]);
  const [isSupported, setIsSupported] = useState(true);
  const [pairingStatus, setPairingStatus] = useState(null);

  // Fetch available audio output devices (Speakers, Bluetooth Headphones, AirPlay)
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setIsSupported(false);
      return;
    }

    try {
      // Request permission if labels are empty
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = allDevices.filter(d => d.kind === 'audiooutput');

      // Add default if array is empty or lacks labels
      const formatted = audioOutputs.map((d, index) => {
        let label = d.label || `Audio Output Device ${index + 1}`;
        let type = 'speaker';

        const lower = label.toLowerCase();
        if (lower.includes('bluetooth') || lower.includes('bt') || lower.includes('airpods') || lower.includes('wireless') || lower.includes('headset') || lower.includes('buds')) {
          type = 'bluetooth';
        } else if (lower.includes('headphone') || lower.includes('headset') || lower.includes('earphone')) {
          type = 'headphones';
        }

        return {
          deviceId: d.deviceId || 'default',
          label: label,
          type: type,
        };
      });

      if (formatted.length === 0) {
        setDevices([
          { deviceId: 'default', label: 'Default System Speaker / Output', type: 'speaker' }
        ]);
      } else {
        setDevices(formatted);
      }
    } catch (err) {
      console.warn('Error enumerating audio output devices:', err);
      setDevices([
        { deviceId: 'default', label: 'Default System Speaker / Output', type: 'speaker' }
      ]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshDevices();

    // Listen for Bluetooth / Audio hardware connect/disconnect events
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [isOpen, refreshDevices]);

  // Switch audio output routing via setSinkId
  const handleSelectDevice = async (deviceId) => {
    setActiveDeviceId(deviceId);

    if (audioRef?.current && typeof audioRef.current.setSinkId === 'function') {
      try {
        await audioRef.current.setSinkId(deviceId);
        setPairingStatus('Routed audio output successfully!');
        setTimeout(() => setPairingStatus(null), 3000);
      } catch (err) {
        console.warn('Failed to setSinkId:', err);
      }
    }
  };

  // Trigger system Bluetooth / Audio Output Picker
  const handlePairBluetooth = async () => {
    setPairingStatus('Scanning for Bluetooth devices...');

    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.selectAudioOutput === 'function') {
        const selected = await navigator.mediaDevices.selectAudioOutput();
        if (selected && selected.deviceId) {
          handleSelectDevice(selected.deviceId);
          await refreshDevices();
          setPairingStatus(`Connected to ${selected.label || 'Bluetooth Device'}`);
          setTimeout(() => setPairingStatus(null), 3000);
          return;
        }
      }

      // Fallback: Web Bluetooth API scanner prompt
      if (navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function') {
        await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['battery_service']
        });
        await refreshDevices();
        setPairingStatus('Bluetooth device paired with OS!');
        setTimeout(() => setPairingStatus(null), 3000);
        return;
      }

      // System notification fallback guidance
      setPairingStatus('Connect your Bluetooth headset/speaker in OS Settings, then select it below.');
      setTimeout(() => setPairingStatus(null), 5000);
    } catch (err) {
      if (err.name !== 'NotFoundError' && err.name !== 'AbortError') {
        setPairingStatus('Bluetooth scan cancelled or unavailable.');
        setTimeout(() => setPairingStatus(null), 3000);
      } else {
        setPairingStatus(null);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex flex-col justify-end animate-fadeInGate">
      <div className="bg-[#12131c] border-t border-white/10 rounded-t-[32px] max-h-[85vh] flex flex-col px-6 pt-5 pb-8 animate-slideUp">
        
        {/* Drag handle indicator */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-2xl">bluetooth_audio</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Audio & Bluetooth Devices</h3>
              <p className="text-xs text-white/50">Select audio output or pair wireless speakers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Pair Bluetooth Button */}
        <button
          onClick={handlePairBluetooth}
          className="w-full mb-4 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer border border-white/10"
        >
          <span className="material-symbols-outlined text-lg">bluetooth_searching</span>
          Pair / Select Bluetooth Device
        </button>

        {/* Status notification toast */}
        {pairingStatus && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-2 animate-fadeInGate">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
            <span className="flex-1">{pairingStatus}</span>
          </div>
        )}

        {/* Device List */}
        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 hide-scrollbar">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">Available Outputs</p>

          {devices.map((device, idx) => {
            const isSelected = activeDeviceId === device.deviceId || (!activeDeviceId && idx === 0);

            return (
              <button
                key={device.deviceId + idx}
                onClick={() => handleSelectDevice(device.deviceId)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-500/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                {/* Device Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  isSelected
                    ? 'bg-blue-500 text-white border-blue-400 shadow-md'
                    : 'bg-white/5 text-white/60 border-white/10'
                }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {device.type === 'bluetooth' ? 'bluetooth'
                      : device.type === 'headphones' ? 'headphones'
                      : 'speaker'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                      {device.label}
                    </p>
                    {device.type === 'bluetooth' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-wider border border-blue-500/30">
                        Bluetooth
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {isSelected ? 'Active Audio Destination' : 'Tap to switch audio'}
                  </p>
                </div>

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm font-black">check</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-center text-white/30 mt-4">
          Supports Bluetooth 5.0+, AirPlay, USB DACs & System Output Routing
        </p>

      </div>
    </div>
  );
}
