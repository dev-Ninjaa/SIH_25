import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { ConnectionStatus, PlantTelemetry, AlertNotification, SystemHealth } from '@/types/api';

// Hook for connection status
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(apiClient.getConnectionStatus());

  useEffect(() => {
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
    };

    apiClient.on('connection_status', handleStatusChange);
    
    return () => {
      apiClient.off('connection_status', handleStatusChange);
    };
  }, []);

  return status;
}

// Hook for real-time plant telemetry
export function usePlantTelemetry(plantId?: string, enabled = true) {
  const [data, setData] = useState<PlantTelemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!plantId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getPlantTelemetry(plantId);
      if (response.success && response.data) {
        setData(response.data);
        setLastUpdated(response.timestamp || new Date().toISOString());
      } else {
        setError(response.error || 'Failed to fetch plant data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [plantId, enabled]);

  useEffect(() => {
    fetchData();
    
    // Set up real-time updates via WebSocket
    const handleTelemetryUpdate = (update: PlantTelemetry) => {
      if (update.id === plantId) {
        setData(update);
        setLastUpdated(update.timestamp);
      }
    };

    apiClient.on('telemetry', handleTelemetryUpdate);
    
    return () => {
      apiClient.off('telemetry', handleTelemetryUpdate);
    };
  }, [fetchData, plantId]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}

// Hook for system health monitoring
export function useSystemHealth(refreshInterval = 30000) {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.getSystemHealth();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch system health');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    
    // Set up periodic refresh
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchHealth, refreshInterval);
    }
    
    // Set up real-time updates
    const handleSystemUpdate = (update: SystemHealth) => {
      setData(update);
    };

    apiClient.on('system_status', handleSystemUpdate);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      apiClient.off('system_status', handleSystemUpdate);
    };
  }, [fetchHealth, refreshInterval]);

  return { data, loading, error, refetch: fetchHealth };
}

// Hook for alerts management
export function useAlerts(autoRefresh = true) {
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.getAlerts();
      
      if (response.success && response.data) {
        setAlerts(response.data);
      } else {
        setError(response.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const response = await apiClient.acknowledgeAlert(alertId);
      if (response.success) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true } 
            : alert
        ));
      }
      return response.success;
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    
    if (autoRefresh) {
      // Set up real-time alert updates
      const handleNewAlert = (alert: AlertNotification) => {
        setAlerts(prev => [alert, ...prev]);
      };

      apiClient.on('alert', handleNewAlert);
      
      return () => {
        apiClient.off('alert', handleNewAlert);
      };
    }
  }, [fetchAlerts, autoRefresh]);

  return { 
    alerts, 
    loading, 
    error, 
    refetch: fetchAlerts, 
    acknowledgeAlert 
  };
}

// Hook for WebSocket connection
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);
    
    apiClient.on('ws_connected', handleConnected);
    apiClient.on('ws_disconnected', handleDisconnected);
    
    // Connect on mount
    apiClient.connectWebSocket();
    
    return () => {
      apiClient.off('ws_connected', handleConnected);
      apiClient.off('ws_disconnected', handleDisconnected);
    };
  }, []);

  return { 
    isConnected,
    connect: () => apiClient.connectWebSocket(),
    disconnect: () => apiClient.disconnectWebSocket()
  };
}
