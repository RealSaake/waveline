'use client';

import { useState, useEffect } from 'react';
import { SmartLightController, AudioReactiveLights } from '@/lib/smartLights';

interface SmartLightsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  audioData: any;
  visualDNA: any;
}

export default function SmartLightsSettings({ isOpen, onClose, audioData, visualDNA }: SmartLightsSettingsProps) {
  const [lightType, setLightType] = useState<'philips_hue' | 'govee'>('philips_hue');
  const [bridgeIP, setBridgeIP] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lightController, setLightController] = useState<SmartLightController | null>(null);
  const [audioLights, setAudioLights] = useState<AudioReactiveLights | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (lightController && audioLights && isActive && audioData) {
      audioLights.updateFromAudio(audioData);
    }
  }, [audioData, lightController, audioLights, isActive]);

  useEffect(() => {
    if (audioLights && visualDNA) {
      const colors = [
        visualDNA.primaryColor,
        visualDNA.secondaryColor,
        visualDNA.accentColor
      ];
      audioLights.setBaseColors(colors);
    }
  }, [visualDNA, audioLights]);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const config = {
        type: lightType,
        ...(lightType === 'philips_hue' ? { bridgeIP, apiKey } : { apiKey, deviceId })
      };

      const controller = new SmartLightController(config);
      const connected = await controller.connect();
      
      if (connected) {
        setLightController(controller);
        setAudioLights(new AudioReactiveLights(controller));
        setIsConnected(true);
      } else {
        alert('Failed to connect to smart lights. Please check your settings.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Connection failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (lightController) {
      lightController.disconnect();
      setLightController(null);
      setAudioLights(null);
      setIsConnected(false);
      setIsActive(false);
    }
  };

  const toggleLights = () => {
    if (audioLights) {
      if (isActive) {
        audioLights.stop();
        setIsActive(false);
      } else {
        audioLights.start();
        setIsActive(true);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Smart Lights</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {!isConnected ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Light System
              </label>
              <select
                value={lightType}
                onChange={(e) => setLightType(e.target.value as 'philips_hue' | 'govee')}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="philips_hue">Philips Hue</option>
                <option value="govee">Govee</option>
              </select>
            </div>

            {lightType === 'philips_hue' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bridge IP Address
                  </label>
                  <input
                    type="text"
                    value={bridgeIP}
                    onChange={(e) => setBridgeIP(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty for auto-discovery
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Press bridge button and click Connect"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Govee API Key
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Get from Govee Home app"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Device ID
                  </label>
                  <input
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="Device MAC address"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Connecting...
                </>
              ) : (
                'Connect Lights'
              )}
            </button>

            <div className="text-xs text-gray-400 space-y-1">
              <p><strong>Philips Hue:</strong> Press the bridge button before connecting</p>
              <p><strong>Govee:</strong> Get API key from Govee Home app settings</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 font-medium">Connected to {lightType}</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Disconnect
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Audio Reactive Lights</span>
              <button
                onClick={toggleLights}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isActive && (
              <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <p className="text-purple-300 text-sm">
                  🎵 Your lights are now synced to the music! Colors will change based on the song's Visual DNA and audio frequencies.
                </p>
              </div>
            )}

            <div className="text-xs text-gray-400">
              <p>Lights will react to:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Bass frequencies → Brightness</li>
                <li>Mid frequencies → Color intensity</li>
                <li>Treble frequencies → Color shifts</li>
                <li>Song's Visual DNA → Base colors</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}