import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { SettingsProvider } from './state/SettingsContext.jsx';
import { startAutoSync, refreshStatus } from './data/sync.js';

import Home from './routes/Home.jsx';
import Day from './routes/Day.jsx';
import Workout from './routes/Workout.jsx';
import Nutrition from './routes/Nutrition.jsx';
import Water from './routes/Water.jsx';
import Settings from './routes/Settings.jsx';

export default function App() {
  // Kick off background sync. If .env has no Supabase keys this returns
  // immediately and does nothing — the app is fully usable either way.
  useEffect(() => {
    refreshStatus();
    return startAutoSync();
  }, []);

  return (
    <SettingsProvider>
      <BrowserRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/day/:date" element={<Day />} />
            <Route path="/day/:date/workout" element={<Workout />} />
            <Route path="/day/:date/nutrition" element={<Nutrition />} />
            <Route path="/day/:date/water" element={<Water />} />
            <Route path="/settings" element={<Settings />} />
            {/* Anything unrecognised goes home rather than showing a blank screen. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </SettingsProvider>
  );
}
