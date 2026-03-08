'use client';

import { useState } from 'react';
import { MapPin, Navigation, AlertTriangle, Activity, Sparkles, Calendar, CloudRain } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import dynamic from 'next/dynamic';
import RadarView from './RadarView';

const MapView = dynamic(() => import('./MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-500">Loading Map...</div>
});

export default function Dashboard() {
  const [origin, setOrigin] = useState('Kuala Lumpur City Centre');
  const [destination, setDestination] = useState('Genting Highlands');
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [trafficStatus, setTrafficStatus] = useState('Moderate');

  // Forecast state
  const [forecastDate, setForecastDate] = useState('2026-02-17'); // Example: CNY 2026
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastResult, setForecastResult] = useState<string | null>(null);

  // Weather state
  const [weatherTime, setWeatherTime] = useState('18:00');
  const [isWeatherPredicting, setIsWeatherPredicting] = useState(false);
  const [weatherResult, setWeatherResult] = useState<string | null>(null);

  const toggleNavigation = () => {
    if (isNavigating) {
      setIsNavigating(false);
      setCurrentSpeed(0);
      setTrafficStatus('Moderate');
    } else {
      setIsNavigating(true);
      setCurrentSpeed(85);
      setTrafficStatus('Heavy (Festive Season)');
    }
  };

  const generateForecast = async () => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      setForecastResult("Error: Gemini API key is missing.");
      return;
    }

    setIsForecasting(true);
    setForecastResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `As an AI traffic analyst for Malaysia, predict the traffic conditions from ${origin} to ${destination} on ${forecastDate}. 
      Consider historical data, major Malaysian festivities (like Chinese New Year, Hari Raya, Deepavali), and typical highway bottlenecks (e.g., Karak Highway, PLUS Highway).
      Provide a concise, 2-3 sentence prediction focusing on expected congestion levels and best departure times.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setForecastResult(response.text || "No prediction available.");
    } catch (error) {
      console.error("Forecast error:", error);
      setForecastResult("Failed to generate forecast. Please try again.");
    } finally {
      setIsForecasting(false);
    }
  };

  const generateWeatherImpact = async () => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      setWeatherResult("Error: Gemini API key is missing.");
      return;
    }

    setIsWeatherPredicting(true);
    setWeatherResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `As an AI traffic and weather analyst for Malaysia, predict the weather for the route from ${origin} to ${destination} at ${weatherTime}. 
      Explain how this specific weather will affect traffic conditions, travel time, and driving safety. 
      For example, if it rains, state how much it will increase traffic and mention specific hazards like water ponding. Keep it to 3 concise sentences.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setWeatherResult(response.text || "No prediction available.");
    } catch (error) {
      console.error("Weather error:", error);
      setWeatherResult("Failed to generate weather impact. Please try again.");
    } finally {
      setIsWeatherPredicting(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-neutral-950 text-neutral-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[400px] bg-neutral-900 border-r border-neutral-800 flex flex-col z-10 overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900/95 backdrop-blur z-20">
          <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            AutonoDrive MY
          </h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Openpilot Vision + AI</p>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-8">
          {/* Route Planning */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Route Planning</h2>
            
            <div className="space-y-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Origin"
                  suppressHydrationWarning
                />
              </div>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Destination"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <button
              onClick={toggleNavigation}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                isNavigating 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                  : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
              }`}
              suppressHydrationWarning
            >
              {isNavigating ? 'Stop Autopilot' : 'Engage Autopilot'}
            </button>
          </div>

          {/* AI Festive Forecast */}
          <div className="space-y-4 pt-6 border-t border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Festive Forecast
            </h2>
            
            <div className="space-y-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="date"
                  value={forecastDate}
                  onChange={(e) => setForecastDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 transition-colors text-neutral-300"
                  style={{ colorScheme: 'dark' }}
                  suppressHydrationWarning
                />
              </div>
              
              <button
                onClick={generateForecast}
                disabled={isForecasting}
                className="w-full py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-sm font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                suppressHydrationWarning
              >
                {isForecasting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Analyzing Data...
                  </>
                ) : (
                  'Predict Traffic'
                )}
              </button>

              {forecastResult && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 leading-relaxed">
                  {forecastResult}
                </div>
              )}
            </div>
          </div>

          {/* Weather & Traffic Impact */}
          <div className="space-y-4 pt-6 border-t border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-blue-400" />
              Weather Predictor
            </h2>
            
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="time"
                  value={weatherTime}
                  onChange={(e) => setWeatherTime(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-blue-500 transition-colors text-neutral-300"
                  style={{ colorScheme: 'dark' }}
                  suppressHydrationWarning
                />
              </div>
              
              <button
                onClick={generateWeatherImpact}
                disabled={isWeatherPredicting}
                className="w-full py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                suppressHydrationWarning
              >
                {isWeatherPredicting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Analyzing Weather...
                  </>
                ) : (
                  'Predict Weather Impact'
                )}
              </button>

              {weatherResult && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 leading-relaxed">
                  {weatherResult}
                </div>
              )}
            </div>
          </div>

          {/* Telemetry */}
          <div className="space-y-4 pt-6 border-t border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Telemetry</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                <div className="text-xs text-neutral-500 mb-1">SPEED</div>
                <div className="text-2xl font-mono text-white">{currentSpeed} <span className="text-sm text-neutral-500">km/h</span></div>
              </div>
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                <div className="text-xs text-neutral-500 mb-1">TRAFFIC</div>
                <div className="text-sm font-medium text-amber-400">{trafficStatus}</div>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-4 pt-6 border-t border-neutral-800">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                CNY traffic detected on Karak Highway. Autopilot routing via alternative scenic route.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Top: Map View */}
        <div className="h-[55%] relative border-b border-neutral-800 z-0">
          <MapView origin={origin} destination={destination} isNavigating={isNavigating} />
          
          {/* Overlay Stats */}
          <div className="absolute top-6 right-6 flex gap-4 z-[400]">
            <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 px-4 py-2 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium">GPS Active</span>
            </div>
          </div>
        </div>

        {/* Bottom: Radar / Sensor View */}
        <div className="h-[45%] bg-neutral-950 relative overflow-hidden z-10">
          <RadarView isNavigating={isNavigating} currentSpeed={currentSpeed} />
        </div>
      </main>
    </div>
  );
}
