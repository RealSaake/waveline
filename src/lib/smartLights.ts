interface SmartLightConfig {
  type: 'philips_hue' | 'govee';
  bridgeIP?: string; // For Philips Hue
  apiKey?: string;   // For Govee
  deviceId?: string; // For Govee
}

interface LightState {
  brightness: number; // 0-1
  color: {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
  };
  transition?: number; // milliseconds
}

export class SmartLightController {
  private config: SmartLightConfig;
  private isConnected = false;
  private lastUpdate = 0;
  private updateThrottle = 100; // ms

  constructor(config: SmartLightConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      if (this.config.type === 'philips_hue') {
        return await this.connectPhilipsHue();
      } else if (this.config.type === 'govee') {
        return await this.connectGovee();
      }
      return false;
    } catch (error) {
      console.error('Smart light connection failed:', error);
      return false;
    }
  }

  private async connectPhilipsHue(): Promise<boolean> {
    if (!this.config.bridgeIP) {
      // Try to discover bridge
      const bridges = await this.discoverHueBridges();
      if (bridges.length === 0) return false;
      this.config.bridgeIP = bridges[0].internalipaddress;
    }

    // Test connection
    try {
      const response = await fetch(`http://${this.config.bridgeIP}/api/config`);
      if (response.ok) {
        this.isConnected = true;
        return true;
      }
    } catch (error) {
      console.error('Hue bridge connection failed:', error);
    }
    
    return false;
  }

  private async discoverHueBridges(): Promise<any[]> {
    try {
      const response = await fetch('https://discovery.meethue.com/');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Hue bridge discovery failed:', error);
    }
    return [];
  }

  private async connectGovee(): Promise<boolean> {
    if (!this.config.apiKey || !this.config.deviceId) return false;

    try {
      const response = await fetch('https://developer-api.govee.com/v1/devices', {
        headers: {
          'Govee-API-Key': this.config.apiKey
        }
      });
      
      if (response.ok) {
        this.isConnected = true;
        return true;
      }
    } catch (error) {
      console.error('Govee connection failed:', error);
    }
    
    return false;
  }

  async updateLights(state: LightState): Promise<boolean> {
    if (!this.isConnected) return false;

    // Throttle updates to prevent overwhelming the lights
    const now = Date.now();
    if (now - this.lastUpdate < this.updateThrottle) return true;
    this.lastUpdate = now;

    try {
      if (this.config.type === 'philips_hue') {
        return await this.updatePhilipsHue(state);
      } else if (this.config.type === 'govee') {
        return await this.updateGovee(state);
      }
    } catch (error) {
      console.error('Light update failed:', error);
    }
    
    return false;
  }

  private async updatePhilipsHue(state: LightState): Promise<boolean> {
    if (!this.config.bridgeIP || !this.config.apiKey) return false;

    // Convert RGB to XY color space for Hue
    const xy = this.rgbToXY(state.color.r, state.color.g, state.color.b);
    
    const hueState = {
      on: true,
      bri: Math.round(state.brightness * 254),
      xy: xy,
      transitiontime: Math.round((state.transition || 100) / 100) // Hue uses deciseconds
    };

    try {
      // Update all lights in group 0 (all lights)
      const response = await fetch(
        `http://${this.config.bridgeIP}/api/${this.config.apiKey}/groups/0/action`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hueState)
        }
      );
      
      return response.ok;
    } catch (error) {
      console.error('Hue update failed:', error);
      return false;
    }
  }

  private async updateGovee(state: LightState): Promise<boolean> {
    if (!this.config.apiKey || !this.config.deviceId) return false;

    const goveeState = {
      device: this.config.deviceId,
      model: 'H6160', // Generic model, should be configurable
      cmd: {
        name: 'color',
        value: {
          r: state.color.r,
          g: state.color.g,
          b: state.color.b
        }
      }
    };

    try {
      const response = await fetch('https://developer-api.govee.com/v1/devices/control', {
        method: 'PUT',
        headers: {
          'Govee-API-Key': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(goveeState)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Govee update failed:', error);
      return false;
    }
  }

  private rgbToXY(r: number, g: number, b: number): [number, number] {
    // Convert RGB to XY color space for Philips Hue
    // Normalize RGB values
    r = r / 255;
    g = g / 255;
    b = b / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ
    const X = r * 0.649926 + g * 0.103455 + b * 0.197109;
    const Y = r * 0.234327 + g * 0.743075 + b * 0.022598;
    const Z = r * 0.0000000 + g * 0.053077 + b * 1.035763;

    // Convert to xy
    const x = X / (X + Y + Z);
    const y = Y / (X + Y + Z);

    return [x || 0, y || 0];
  }

  disconnect(): void {
    this.isConnected = false;
  }

  isConnectedToLights(): boolean {
    return this.isConnected;
  }
}

export class AudioReactiveLights {
  private lightController: SmartLightController;
  private baseColors: { r: number; g: number; b: number }[] = [];
  private isActive = false;

  constructor(lightController: SmartLightController) {
    this.lightController = lightController;
  }

  setBaseColors(colors: string[]) {
    this.baseColors = colors.map(color => this.hexToRgb(color));
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  start() {
    this.isActive = true;
  }

  stop() {
    this.isActive = false;
  }

  updateFromAudio(audioData: {
    frequencies: Uint8Array;
    volume: number;
    bassLevel: number;
    midLevel: number;
    trebleLevel: number;
  }) {
    if (!this.isActive || this.baseColors.length === 0) return;

    // Select color based on frequency dominance
    let dominantColorIndex = 0;
    if (audioData.bassLevel > audioData.midLevel && audioData.bassLevel > audioData.trebleLevel) {
      dominantColorIndex = 0; // Bass = first color
    } else if (audioData.midLevel > audioData.trebleLevel) {
      dominantColorIndex = 1 % this.baseColors.length; // Mid = second color
    } else {
      dominantColorIndex = 2 % this.baseColors.length; // Treble = third color
    }

    const baseColor = this.baseColors[dominantColorIndex];
    
    // Modulate brightness based on volume
    const brightness = Math.max(0.1, Math.min(1.0, audioData.volume * 1.5));
    
    // Add color intensity based on frequency levels
    const color = {
      r: Math.min(255, baseColor.r + (audioData.bassLevel * 50)),
      g: Math.min(255, baseColor.g + (audioData.midLevel * 50)),
      b: Math.min(255, baseColor.b + (audioData.trebleLevel * 50))
    };

    this.lightController.updateLights({
      brightness,
      color,
      transition: 50 // Quick transitions for responsiveness
    });
  }
}

// Default export for easy importing
export default {
  SmartLightController,
  AudioReactiveLights
};