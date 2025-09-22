// API Types for Backend Connectivity
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  lastUpdated: string;
  latency?: number;
  errorCount: number;
}

export interface PlantTelemetry {
  id: string;
  timestamp: string;
  currentPowerKw: number;
  dailyEnergyKwh: number;
  efficiency: number;
  status: 'online' | 'offline' | 'maintenance' | 'warning';
  temperature?: number;
  irradiance?: number;
  gridVoltage?: number;
}

export interface AlertNotification {
  id: string;
  plantId: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  acknowledged: boolean;
  resolvedAt?: string;
}

export interface SystemHealth {
  timestamp: string;
  totalPlants: number;
  onlineCount: number;
  totalCapacityMW: number;
  currentGenerationMW: number;
  systemEfficiency: number;
  alerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  wsUrl?: string;
}

// WebSocket Message Types
export interface WSMessage<T = any> {
  type: 'telemetry' | 'alert' | 'system_status' | 'connection_status';
  data: T;
  timestamp: string;
}
