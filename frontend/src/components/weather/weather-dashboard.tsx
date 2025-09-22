"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  Droplets, 
  Eye,
  Gauge,
  MapPin,
  RefreshCw,
  Navigation,
  Thermometer,
  Sunrise,
  Sunset,
  CloudDrizzle,
  AlertTriangle,
  Loader2,
  Activity,
  TrendingUp,
  Calendar,
  Clock,
  Zap
} from "lucide-react";
import { fetchWeatherApi } from "openmeteo";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart } from "recharts";

// Weather code mappings for Open-Meteo
const WEATHER_CONDITIONS: Record<number, { text: string; icon: string }> = {
  0: { text: 'Clear sky', icon: '☀️' },
  1: { text: 'Mainly clear', icon: '🌤️' },
  2: { text: 'Partly cloudy', icon: '⛅' },
  3: { text: 'Overcast', icon: '☁️' },
  45: { text: 'Fog', icon: '🌫️' },
  48: { text: 'Depositing rime fog', icon: '🌫️' },
  51: { text: 'Light drizzle', icon: '🌦️' },
  53: { text: 'Moderate drizzle', icon: '🌦️' },
  55: { text: 'Dense drizzle', icon: '🌦️' },
  61: { text: 'Slight rain', icon: '🌧️' },
  63: { text: 'Moderate rain', icon: '🌧️' },
  65: { text: 'Heavy rain', icon: '🌧️' },
  71: { text: 'Slight snow', icon: '🌨️' },
  73: { text: 'Moderate snow', icon: '🌨️' },
  75: { text: 'Heavy snow', icon: '❄️' },
  95: { text: 'Thunderstorm', icon: '⛈️' },
  96: { text: 'Thunderstorm with hail', icon: '⛈️' },
  99: { text: 'Thunderstorm with heavy hail', icon: '⛈️' }
};

interface WeatherData {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  };
  current: {
    time: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
    isDay: boolean;
  };
  hourly: {
    time: Date[];
    temperature: number[];
    humidity: number[];
    windSpeed: number[];
    weatherCode: number[];
  };
  daily: {
    time: Date[];
    weatherCode: number[];
    temperatureMax: number[];
    temperatureMin: number[];
    precipitationSum: number[];
    windSpeedMax: number[];
  };
}

interface CityLocation {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

// Popular cities for quick selection
const POPULAR_CITIES: CityLocation[] = [
  { name: "New Delhi", latitude: 28.6139, longitude: 77.2090, country: "India" },
  { name: "Mumbai", latitude: 19.0760, longitude: 72.8777, country: "India" },
  { name: "Bangalore", latitude: 12.9716, longitude: 77.5946, country: "India" },
  { name: "Chennai", latitude: 13.0827, longitude: 80.2707, country: "India" },
  { name: "Kolkata", latitude: 22.5726, longitude: 88.3639, country: "India" },
  { name: "Hyderabad", latitude: 17.3850, longitude: 78.4867, country: "India" },
];

export default function WeatherDashboard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CityLocation[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState("current");

  // Get weather condition from code
  const getWeatherCondition = useCallback((code: number) => {
    return WEATHER_CONDITIONS[code] || { text: 'Unknown', icon: '❓' };
  }, []);

  // Get weather icon component
  const getWeatherIcon = useCallback((weatherCode: number, size: "sm" | "md" | "lg" = "md") => {
    const condition = getWeatherCondition(weatherCode);
    const sizeClass = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-12 w-12" : "h-8 w-8";
    
    const iconMap: Record<string, React.ReactElement> = {
      '☀️': <Sun className={`${sizeClass} text-yellow-500`} />,
      '🌤️': <Sun className={`${sizeClass} text-yellow-400`} />,
      '⛅': <Cloud className={`${sizeClass} text-gray-400`} />,
      '☁️': <Cloud className={`${sizeClass} text-gray-500`} />,
      '🌫️': <Cloud className={`${sizeClass} text-gray-400`} />,
      '🌦️': <CloudDrizzle className={`${sizeClass} text-blue-400`} />,
      '🌧️': <CloudRain className={`${sizeClass} text-blue-500`} />,
      '🌨️': <CloudSnow className={`${sizeClass} text-blue-200`} />,
      '❄️': <CloudSnow className={`${sizeClass} text-white`} />,
      '⛈️': <CloudRain className={`${sizeClass} text-purple-500`} />,
      '❓': <Cloud className={`${sizeClass} text-gray-500`} />
    };
    
    return iconMap[condition.icon] || <Cloud className={`${sizeClass} text-gray-500`} />;
  }, [getWeatherCondition]);

  // Fetch weather data
  const fetchWeatherData = useCallback(async (latitude: number, longitude: number, locationName: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        latitude,
        longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'wind_speed_10m',
          'wind_direction_10m',
          'weather_code',
          'is_day'
        ],
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_sum',
          'wind_speed_10m_max'
        ],
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'wind_speed_10m',
          'weather_code'
        ],
        timezone: 'auto',
        forecast_days: 7
      };

      const responses = await fetchWeatherApi("https://api.open-meteo.com/v1/forecast", params);
      const response = responses[0];

      // Get attributes for timezone and location
      const latitude_result = response.latitude();
      const longitude_result = response.longitude();
      const elevation = response.elevation();
      const utcOffsetSeconds = response.utcOffsetSeconds();
      const timezone = response.timezone();

      // Get current weather
      const current = response.current()!;
      const currentTime = new Date((Number(current.time()) + utcOffsetSeconds) * 1000);

      // Get daily forecast
      const daily = response.daily()!;
      const dailyTime = [...Array((Number(daily.timeEnd()) - Number(daily.time())) / daily.interval())].map(
        (_, i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
      );

      // Get hourly data
      const hourly = response.hourly()!;
      const hourlyTime = [...Array((Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval())].map(
        (_, i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
      );

      const weatherData: WeatherData = {
        location: {
          name: locationName,
          latitude: latitude_result,
          longitude: longitude_result,
          elevation,
          timezone
        },
        current: {
          time: currentTime.toISOString(),
          temperature: Math.round(current.variables(0)!.value()),
          humidity: Math.round(current.variables(1)!.value()),
          windSpeed: Math.round(current.variables(2)!.value()),
          windDirection: Math.round(current.variables(3)!.value()),
          weatherCode: current.variables(4)!.value(),
          isDay: current.variables(5)!.value() === 1
        },
        daily: {
          time: dailyTime,
          weatherCode: Array.from({length: dailyTime.length}, (_, i) => daily.variables(0)!.valuesArray()![i]),
          temperatureMax: Array.from({length: dailyTime.length}, (_, i) => Math.round(daily.variables(1)!.valuesArray()![i])),
          temperatureMin: Array.from({length: dailyTime.length}, (_, i) => Math.round(daily.variables(2)!.valuesArray()![i])),
          precipitationSum: Array.from({length: dailyTime.length}, (_, i) => daily.variables(3)!.valuesArray()![i]),
          windSpeedMax: Array.from({length: dailyTime.length}, (_, i) => Math.round(daily.variables(4)!.valuesArray()![i]))
        },
        hourly: {
          time: hourlyTime,
          temperature: Array.from(hourly.variables(0)!.valuesArray()!).map(temp => Math.round(temp as number)),
          humidity: Array.from(hourly.variables(1)!.valuesArray()!).map(hum => Math.round(hum as number)),
          windSpeed: Array.from(hourly.variables(2)!.valuesArray()!).map(wind => Math.round(wind as number)),
          weatherCode: Array.from(hourly.variables(3)!.valuesArray()!)
        }
      };

      setWeather(weatherData);
    } catch (err) {
      setError(`Failed to fetch weather data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search for cities
  const searchCity = useCallback(async (query: string): Promise<CityLocation[]> => {
    if (!query.trim()) return [];

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      
      if (!data.results) return [];

      return data.results.map((result: any) => ({
        name: result.name,
        latitude: result.latitude,
        longitude: result.longitude,
        country: result.country || 'Unknown',
        admin1: result.admin1
      }));
    } catch (error) {
      console.error('City search error:', error);
      return [];
    }
  }, []);

  // Handle search
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const results = await searchCity(searchQuery.trim());
      setSearchResults(results);
      setShowSearchResults(true);
      
      if (results.length === 1) {
        await handleCitySelect(results[0]);
      }
    }
  }, [searchQuery, searchCity]);

  // Handle city selection
  const handleCitySelect = useCallback(async (city: CityLocation) => {
    const displayName = city.admin1 
      ? `${city.name}, ${city.admin1}, ${city.country}`
      : `${city.name}, ${city.country}`;
    
    // Update search query to show selected city
    setSearchQuery(displayName);
    
    await fetchWeatherData(city.latitude, city.longitude, displayName);
    setShowSearchResults(false);
  }, [fetchWeatherData]);

  // Enhanced location detection with multiple fallback methods
  const detectLocation = useCallback(async (): Promise<{ latitude: number; longitude: number; city: string }> => {
    // Method 1: High accuracy geolocation
    const tryGeolocation = (): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        const options: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 15000, // 15 seconds
          maximumAge: 300000 // 5 minutes
        };

        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    };

    // Method 2: IP-based geolocation using ipapi.co (free service)
    const tryIPGeolocation = async (): Promise<{ latitude: number; longitude: number; city: string }> => {
      try {
        const response = await fetch('https://ipapi.co/json/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) throw new Error('IP geolocation failed');
        
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
          return {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            city: data.city || data.region || 'Unknown Location'
          };
        }
        
        throw new Error('Invalid IP geolocation data');
      } catch (error) {
        console.warn('IP geolocation failed:', error);
        throw error;
      }
    };

    // Method 3: Alternative IP service using ipgeolocation.io (free tier)
    const tryAlternativeIP = async (): Promise<{ latitude: number; longitude: number; city: string }> => {
      try {
        const response = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=free', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) throw new Error('Alternative IP geolocation failed');
        
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
          return {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            city: data.city || data.state_prov || 'Unknown Location'
          };
        }
        
        throw new Error('Invalid alternative IP data');
      } catch (error) {
        console.warn('Alternative IP geolocation failed:', error);
        throw error;
      }
    };

    // Try methods in order of preference
    try {
      // First try browser geolocation
      const position = await tryGeolocation();
      
      // Reverse geocode to get city name
      try {
        // Use a different reverse geocoding service since Open-Meteo doesn't have reverse geocoding
        const reverseGeoResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
        );
        
        if (reverseGeoResponse.ok) {
          const reverseGeoData = await reverseGeoResponse.json();
          const cityName = reverseGeoData.city || reverseGeoData.locality || reverseGeoData.principalSubdivision || 'Detected Location';
          
          return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: cityName
          };
        }
      } catch (reverseGeoError) {
        console.warn('Reverse geocoding failed:', reverseGeoError);
      }
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: 'Detected Location'
      };
      
    } catch (geoError) {
      console.warn('Browser geolocation failed, trying IP-based methods:', geoError);
      
      try {
        // Try primary IP geolocation service
        return await tryIPGeolocation();
      } catch (ipError) {
        console.warn('Primary IP geolocation failed, trying alternative:', ipError);
        
        try {
          // Try alternative IP geolocation service
          return await tryAlternativeIP();
        } catch (altError) {
          console.warn('All location detection methods failed:', altError);
          
          // Final fallback - default to a major city
          return {
            latitude: 28.6139,
            longitude: 77.2090,
            city: 'New Delhi (Default)'
          };
        }
      }
    }
  }, []);

  // Get current location weather with enhanced detection
  const getCurrentLocationWeather = useCallback(async () => {
    setLocationStatus('requesting');
    
    try {
      const location = await detectLocation();
      setLocationStatus('granted');
      
      // Update the search query to show the detected city name
      setSearchQuery(location.city);
      
      await fetchWeatherData(location.latitude, location.longitude, location.city);
    } catch (err) {
      setLocationStatus('error');
      setError('Failed to detect location. Using default location.');
      
      // Fallback to default city and update search query
      const fallbackCity = POPULAR_CITIES[0];
      setSearchQuery(fallbackCity.name);
      await fetchWeatherData(fallbackCity.latitude, fallbackCity.longitude, fallbackCity.name);
    }
  }, [detectLocation, fetchWeatherData]);

  // Load default city on mount
  useEffect(() => {
    fetchWeatherData(POPULAR_CITIES[0].latitude, POPULAR_CITIES[0].longitude, POPULAR_CITIES[0].name);
  }, [fetchWeatherData]);

  // Format hourly data for charts
  const hourlyChartData = weather?.hourly.time.slice(0, 24).map((time, index) => ({
    time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    temperature: weather.hourly.temperature[index],
    humidity: weather.hourly.humidity[index],
    windSpeed: weather.hourly.windSpeed[index]
  })) || [];

  // Solar energy efficiency based on weather
  const getSolarEfficiency = useCallback((weatherCode: number, cloudCover: number = 50) => {
    const condition = getWeatherCondition(weatherCode);
    if (condition.text.includes('Clear')) return 95;
    if (condition.text.includes('Mainly clear')) return 85;
    if (condition.text.includes('Partly cloudy')) return 70;
    if (condition.text.includes('Overcast')) return 40;
    if (condition.text.includes('rain') || condition.text.includes('storm')) return 25;
    if (condition.text.includes('snow')) return 15;
    return 60;
  }, [getWeatherCondition]);

  if (loading && !weather) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Loading weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Search for a city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchResults(searchResults.length > 0)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                disabled={loading}
                className="transition-all"
                aria-label="Search for a city"
                autoComplete="off"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((city, index) => (
                    <button
                      key={`${city.name}-${city.latitude}-${city.longitude}`}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center transition-colors first:rounded-t-md last:rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => handleCitySelect(city)}
                      aria-label={`Select ${city.name}, ${city.country}`}
                    >
                      <span className="font-medium truncate">{city.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">{city.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={getCurrentLocationWeather} 
              disabled={loading || locationStatus === 'requesting'}
              title={locationStatus === 'requesting' ? 'Detecting location...' : 'Use current location'}
              className="min-w-[44px]"
            >
              {locationStatus === 'requesting' ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Navigation className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
              )}
            </Button>
          </form>
          
          {/* Location Status */}
          {locationStatus !== 'idle' && (
            <div className="text-sm flex items-center gap-2 mb-4">
              <Navigation className="h-4 w-4" />
              <span className={
                locationStatus === 'granted' ? 'text-green-600' :
                locationStatus === 'denied' || locationStatus === 'error' ? 'text-red-600' :
                'text-blue-600'
              }>
                {locationStatus === 'requesting' ? 'Requesting location access...' :
                 locationStatus === 'granted' ? 'Location found successfully!' :
                 locationStatus === 'denied' ? 'Location access denied' :
                 'Failed to get location'}
              </span>
            </div>
          )}
          
          {/* Popular Cities */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Popular Cities:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CITIES.map((city) => (
                <Button
                  key={city.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCitySelect(city)}
                  disabled={loading}
                  className="transition-colors"
                >
                  {city.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">Weather Data Unavailable</h3>
              <p className="text-red-500 mb-4">{error}</p>
              <Button 
                onClick={getCurrentLocationWeather} 
                variant="outline" 
                disabled={loading || locationStatus === 'requesting'}
                className="min-w-[140px]"
              >
                {locationStatus === 'requesting' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                    Detecting...
                  </>
                ) : (
                  <>
                    <Navigation className={`h-4 w-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
                    {locationStatus === 'error' ? 'Retry Location' : 'Use Location'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weather Data */}
      {weather && (
        <>
          {/* Current Weather Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{weather.location.name}</span>
                <Badge variant="outline">{getWeatherCondition(weather.current.weatherCode).text}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Main Weather Info */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-16 w-16">
                    {getWeatherIcon(weather.current.weatherCode, "lg")}
                  </div>
                  <div>
                    <div className="text-4xl font-bold">{weather.current.temperature}°C</div>
                    <div className="text-muted-foreground">
                      {getWeatherCondition(weather.current.weatherCode).text}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      H: {weather.daily.temperatureMax[0]}° L: {weather.daily.temperatureMin[0]}°
                    </div>
                  </div>
                </div>

                {/* Solar Efficiency */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg">
                  <Zap className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Solar Efficiency</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {getSolarEfficiency(weather.current.weatherCode)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Current conditions</div>
                  </div>
                </div>

                {/* Weather Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-sm text-muted-foreground">Humidity</div>
                      <div className="font-medium">{weather.current.humidity}%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm text-muted-foreground">Wind</div>
                      <div className="font-medium">
                        {weather.current.windSpeed} km/h
                        <span className="text-xs text-muted-foreground ml-1">
                          {weather.current.windDirection}°
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Weather Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="hourly">24 Hour</TabsTrigger>
              <TabsTrigger value="weekly">7 Day</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{weather.current.temperature}°C</div>
                    <p className="text-xs text-muted-foreground">
                      Range: {weather.daily.temperatureMin[0]}° to {weather.daily.temperatureMax[0]}°
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Humidity</CardTitle>
                    <Droplets className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{weather.current.humidity}%</div>
                    <p className="text-xs text-muted-foreground">
                      {weather.current.humidity > 60 ? 'High humidity' : 'Normal humidity'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
                    <Wind className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{weather.current.windSpeed} km/h</div>
                    <p className="text-xs text-muted-foreground">
                      Direction: {weather.current.windDirection}°
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="hourly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>24-Hour Temperature Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={hourlyChartData}>
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => `Time: ${value}`}
                        formatter={(value, name) => [`${value}${name === 'temperature' ? '°C' : name === 'humidity' ? '%' : 'km/h'}`, name]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#8884d8" 
                        fill="url(#temperatureGradient)" 
                        strokeWidth={2}
                      />
                      <defs>
                        <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Humidity Levels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={hourlyChartData}>
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}%`, 'Humidity']} />
                        <Line type="monotone" dataKey="humidity" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Wind Speed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={hourlyChartData}>
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} km/h`, 'Wind Speed']} />
                        <Line type="monotone" dataKey="windSpeed" stroke="#ffc658" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="weekly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>7-Day Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                    {weather.daily.time.map((day, index) => {
                      const isToday = index === 0;
                      const date = new Date(day);
                      const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const weatherCode = weather.daily.weatherCode[index];
                      const condition = getWeatherCondition(weatherCode);
                      const efficiency = getSolarEfficiency(weatherCode);
                      
                      return (
                        <div 
                          key={index} 
                          className={`text-center p-4 rounded-lg border transition-all hover:shadow-md ${
                            isToday ? 'bg-primary/10 border-primary/20' : 'bg-card/50 hover:bg-card/80'
                          }`}
                        >
                          <div className="text-sm font-medium mb-1">{dayName}</div>
                          <div className="text-xs text-muted-foreground mb-3">{dateStr}</div>
                          <div className="flex justify-center mb-3 h-10 w-10 mx-auto">
                            {getWeatherIcon(weatherCode)}
                          </div>
                          <div className="text-lg font-bold mb-1">
                            {Math.round((weather.daily.temperatureMax[index] + weather.daily.temperatureMin[index]) / 2)}°C
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            <span className="text-red-400">{weather.daily.temperatureMax[index]}°</span> / <span className="text-blue-400">{weather.daily.temperatureMin[index]}°</span>
                          </div>
                          <div className="text-xs text-muted-foreground capitalize mb-2 line-clamp-2">
                            {condition.text}
                          </div>
                          
                          {/* Solar efficiency for each day */}
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            <span className="text-yellow-600 font-medium">{efficiency}%</span>
                          </div>

                          {/* Additional forecast info */}
                          <div className="space-y-1 text-xs text-muted-foreground mt-2">
                            {weather.daily.precipitationSum[index] > 0 && (
                              <div className="flex items-center justify-center gap-1">
                                <CloudRain className="h-3 w-3 text-blue-600" />
                                <span>{weather.daily.precipitationSum[index].toFixed(1)}mm</span>
                              </div>
                            )}
                            <div className="flex items-center justify-center gap-1">
                              <Wind className="h-3 w-3 text-green-500" />
                              <span>{weather.daily.windSpeedMax[index]}km/h</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Solar Efficiency Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Weekly Solar Energy Outlook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-sm text-muted-foreground">Optimal Days</div>
                      <div className="text-2xl font-bold text-green-600">
                        {weather.daily.weatherCode.filter(code => getSolarEfficiency(code) > 80).length}
                      </div>
                      <div className="text-xs text-muted-foreground">High efficiency days</div>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-sm text-muted-foreground">Moderate Days</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {weather.daily.weatherCode.filter(code => {
                          const eff = getSolarEfficiency(code);
                          return eff >= 50 && eff <= 80;
                        }).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Medium efficiency days</div>
                    </div>
                    
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-sm text-muted-foreground">Low Efficiency Days</div>
                      <div className="text-2xl font-bold text-red-600">
                        {weather.daily.weatherCode.filter(code => getSolarEfficiency(code) < 50).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Consider backup power</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}