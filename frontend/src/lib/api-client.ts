import { ApiResponse, ApiConfig, PlantTelemetry, AlertNotification, SystemHealth } from '@/types/api';

class ApiClient {
  private config: ApiConfig;
  private connectionStatus = { connected: false, lastUpdated: '', latency: 0, errorCount: 0 };
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Function[]>();

  constructor(config: ApiConfig) {
    this.config = config;
  }

  // Connection status management
  getConnectionStatus() {
    return { ...this.connectionStatus };
  }

  // Generic API request method with retry logic
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const startTime = Date.now();
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        const latency = Date.now() - startTime;
        this.updateConnectionStatus(true, latency);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        this.connectionStatus.errorCount++;
        
        if (attempt === this.config.retryAttempts) {
          this.updateConnectionStatus(false);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          };
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  private updateConnectionStatus(connected: boolean, latency?: number) {
    this.connectionStatus = {
      connected,
      lastUpdated: new Date().toISOString(),
      latency: latency || this.connectionStatus.latency,
      errorCount: connected ? 0 : this.connectionStatus.errorCount,
    };
    
    // Notify listeners
    this.emit('connection_status', this.connectionStatus);
  }

  // Event handling for real-time updates
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // WebSocket connection for real-time data
  connectWebSocket() {
    if (!this.config.wsUrl || this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.config.wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.emit('ws_connected', true);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.emit(message.type, message.data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('ws_disconnected', true);
        // Auto-reconnect after 5 seconds
        setTimeout(() => this.connectWebSocket(), 5000);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('ws_error', error);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // API Methods
  async getPlants(): Promise<ApiResponse<any[]>> {
    return this.request('/api/v1/plants');
  }

  async getPlantTelemetry(plantId: string): Promise<ApiResponse<PlantTelemetry>> {
    return this.request(`/api/v1/plants/${plantId}/telemetry`);
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.request('/api/v1/system/health');
  }

  async getAlerts(acknowledged = false): Promise<ApiResponse<AlertNotification[]>> {
    return this.request(`/api/v1/alerts?acknowledged=${acknowledged}`);
  }

  async acknowledgeAlert(alertId: string): Promise<ApiResponse> {
    return this.request(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'PATCH',
    });
  }

  async updatePlantSettings(plantId: string, settings: any): Promise<ApiResponse> {
    return this.request(`/api/v1/plants/${plantId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

// Default configuration
const defaultConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
  timeout: 10000,
  retryAttempts: 3,
};

// Export singleton instance
export const apiClient = new ApiClient(defaultConfig);
export default ApiClient;
