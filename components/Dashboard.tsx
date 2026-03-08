'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, Activity, Sparkles, Calendar, CloudRain, Battery, Zap, Camera, Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import dynamic from 'next/dynamic';
import RadarView from './RadarView';

const MapView = dynamic(() => import('./MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-500">Loading Map...</div>
});

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState('Kuala Lumpur City Centre');
  const [destination, setDestination] = useState('Genting Highlands');
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [trafficStatus, setTrafficStatus] = useState('Moderate');
  const [dashcamConnected, setDashcamConnected] = useState(false);

  // Spotify State
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [spotifyTrack, setSpotifyTrack] = useState<{ name: string, artist: string, isPlaying: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Spotify Auth Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS') {
        setSpotifyToken(event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Spotify Track Polling
  useEffect(() => {
    if (!spotifyToken) return;
    
    const fetchTrack = async () => {
      try {
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${spotifyToken}` }
        });
        if (res.status === 200) {
          const data = await res.json();
          setSpotifyTrack({
            name: data.item?.name,
            artist: data.item?.artists?.[0]?.name,
            isPlaying: data.is_playing
          });
        } else if (res.status === 204) {
          setSpotifyTrack(null);
        }
      } catch (e) {
        console.error("Spotify fetch error:", e);
      }
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 5000);
    return () => clearInterval(interval);
  }, [spotifyToken]);

  const handleSpotifyConnect = async () => {
    try {
      const response = await fetch('/api/auth/spotify/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      window.open(url, 'spotify_auth', 'width=600,height=700');
    } catch (error) {
      console.error('Spotify Auth error:', error);
      alert('Failed to connect to Spotify. Please check your API keys.');
    }
  };

  const toggleSpotifyPlay = async () => {
    if (!spotifyToken) return;
    const endpoint = spotifyTrack?.isPlaying ? 'pause' : 'play';
    await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${spotifyToken}` }
    });
    setSpotifyTrack(prev => prev ? { ...prev, isPlaying: !prev.isPlaying } : null);
  };

  const skipSpotifyTrack = async (direction: 'next' | 'previous') => {
    if (!spotifyToken) return;
    await fetch(`https://api.spotify.com/v1/me/player/${direction}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${spotifyToken}` }
    });
  };

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

  if (!mounted) {
    return <div className="h-screen w-full bg-neutral-950" />;
  }

  return (
    <div className="h-screen w-full flex bg-neutral-950 text-neutral-200 overflow-hidden font-sans">
      {/* Left: Tesla FSD Visualization (RadarView) */}
      <div className="w-[400px] lg:w-[450px] h-full relative bg-neutral-900 border-r border-neutral-800 flex flex-col z-20 shadow-2xl">
         {/* Telemetry Header */}
         <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-neutral-900 to-transparent z-30 pointer-events-none flex justify-between items-start">
            <div className="flex flex-col">
               <div className="text-5xl font-bold text-white tracking-tighter">{currentSpeed}</div>
               <div className="text-sm text-neutral-400 font-bold uppercase tracking-widest">km/h</div>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl">
                  <Battery className="w-5 h-5" />
                  68%
               </div>
               <div className="text-xs text-neutral-400 uppercase tracking-widest">Battery</div>
            </div>
         </div>

         {/* Radar View */}
         <div className="flex-1 relative overflow-hidden">
            <RadarView isNavigating={isNavigating} currentSpeed={currentSpeed} dashcamConnected={dashcamConnected} />
         </div>

         {/* Bottom Controls / Status */}
         <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-neutral-900 to-transparent z-30">
            <div className="bg-neutral-950/80 backdrop-blur border border-neutral-800 rounded-xl p-4">
               <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">System Status</div>
               <div className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isNavigating ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-500'}`} />
                  {isNavigating ? 'Autopilot Simulation Active' : 'Manual Driving'}
               </div>
            </div>
         </div>
      </div>

      {/* Right: Map & Controls */}
      <div className="flex-1 h-full relative z-10">
         <MapView origin={origin} destination={destination} isNavigating={isNavigating} />

         {/* Floating Control Panel */}
         {isNavigating ? (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 rounded-full px-6 py-3 z-[400] shadow-2xl flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-400">Navigating to</span>
                  <span className="text-sm font-bold text-white">{destination}</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-neutral-800" />
              
              {/* Spotify Mini Player */}
              {spotifyToken ? (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col w-32">
                    <span className="text-xs font-bold text-white truncate">{spotifyTrack?.name || 'No track playing'}</span>
                    <span className="text-[10px] text-neutral-400 truncate">{spotifyTrack?.artist || 'Spotify'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => skipSpotifyTrack('previous')} className="p-2 hover:bg-neutral-800 rounded-full transition-colors"><SkipBack className="w-4 h-4 text-neutral-300" /></button>
                    <button onClick={toggleSpotifyPlay} className="p-2 bg-emerald-500 text-black hover:bg-emerald-400 rounded-full transition-colors">
                      {spotifyTrack?.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => skipSpotifyTrack('next')} className="p-2 hover:bg-neutral-800 rounded-full transition-colors"><SkipForward className="w-4 h-4 text-neutral-300" /></button>
                  </div>
                </div>
              ) : (
                <button onClick={handleSpotifyConnect} className="flex items-center gap-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Music className="w-4 h-4" />
                  Connect Spotify
                </button>
              )}

              <div className="w-px h-8 bg-neutral-800" />
              
              <button 
                onClick={toggleNavigation} 
                className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-full text-sm font-medium transition-colors"
              >
                Stop
              </button>
            </div>
         ) : (
          <div className="absolute top-6 left-6 w-[380px] bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 z-[400] shadow-2xl max-h-[calc(100vh-48px)] overflow-y-auto custom-scrollbar">
            <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mb-6">
              <Activity className="w-6 h-6" />
              AutoDrive MY
            </h1>

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
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
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
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
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
                {isNavigating ? 'Stop Autopilot Simulation' : 'Engage Autopilot Simulation'}
              </button>
            </div>

            {/* Dashcam Connection */}
            <div className="mt-6 space-y-4 pt-6 border-t border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                Wireless Dashcam Vision
              </h2>
              <button
                onClick={() => setDashcamConnected(!dashcamConnected)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                  dashcamConnected 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' 
                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${dashcamConnected ? 'bg-cyan-400 animate-pulse' : 'bg-neutral-500'}`} />
                {dashcamConnected ? 'Dashcam Connected (Live Feed)' : 'Connect Dashcam via Bluetooth'}
              </button>
              {dashcamConnected && (
                <p className="text-xs text-cyan-200/70 leading-relaxed">
                  Live video feed integrated. Autopilot accuracy increased by 45%.
                </p>
              )}
            </div>

            {/* Spotify Integration */}
            <div className="mt-6 space-y-4 pt-6 border-t border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-400" />
                Spotify Integration
              </h2>
              {!spotifyToken ? (
                <button
                  onClick={handleSpotifyConnect}
                  className="w-full py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  Connect Spotify Account
                </button>
              ) : (
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between">
                  <div className="flex flex-col w-48">
                    <span className="text-sm font-bold text-white truncate">{spotifyTrack?.name || 'No track playing'}</span>
                    <span className="text-xs text-neutral-400 truncate">{spotifyTrack?.artist || 'Spotify Connected'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => skipSpotifyTrack('previous')} className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors"><SkipBack className="w-4 h-4 text-neutral-300" /></button>
                    <button onClick={toggleSpotifyPlay} className="p-1.5 bg-emerald-500 text-black hover:bg-emerald-400 rounded-full transition-colors">
                      {spotifyTrack?.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => skipSpotifyTrack('next')} className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors"><SkipForward className="w-4 h-4 text-neutral-300" /></button>
                  </div>
                </div>
              )}
            </div>

            {/* EV Chargers Info */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
              <Zap className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-200/80 leading-relaxed">
                EV Charging Stations are marked on the map. Navigate to them if battery drops below 20%.
              </p>
            </div>

            {/* AI Festive Forecast */}
            <div className="space-y-4 pt-6 mt-6 border-t border-neutral-800">
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
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 transition-colors text-neutral-300"
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
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300 leading-relaxed">
                    {forecastResult}
                  </div>
                )}
              </div>
            </div>

            {/* Weather & Traffic Impact */}
            <div className="space-y-4 pt-6 mt-6 border-t border-neutral-800">
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
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-blue-500 transition-colors text-neutral-300"
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
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300 leading-relaxed">
                    {weatherResult}
                  </div>
                )}
              </div>
            </div>

         </div>
         )}
      </div>
    </div>
  );
}
