"use client";

import React from "react";
import WeatherDashboard from "@/components/weather/weather-dashboard";

export default function WeatherPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Weather Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time weather data and forecasts for optimal solar energy management
          </p>
        </div>
        
        <WeatherDashboard />
      </div>
    </div>
  );
}