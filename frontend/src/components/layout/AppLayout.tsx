import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#1e3a5f] text-white shadow-md border-b border-[#14273e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-6">
              <NavLink to="/dashboard" className="flex items-center space-x-3 group">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-bold tracking-tight text-white font-mono">
                      Wind<span className="text-blue-400">Sight</span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-300 border border-blue-400/30">
                      BMRS v1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 tracking-wide font-normal -mt-0.5">
                    UK Day-Ahead Wind Forecast Intelligence
                  </p>
                </div>
              </NavLink>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-700/60">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/30 text-white border border-blue-400/30 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`
                  }
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/forecasts"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/30 text-white border border-blue-400/30 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`
                  }
                >
                  Forecasts
                </NavLink>

                <NavLink
                  to="/analytics"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/30 text-white border border-blue-400/30 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`
                  }
                >
                  Analytics
                </NavLink>

                <NavLink
                  to="/data-explorer"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/30 text-white border border-blue-400/30 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`
                  }
                >
                  Data Explorer
                </NavLink>
              </nav>
            </div>

            {/* Trading Desk Status Metadata */}
            <div className="flex items-center space-x-4">
              <div className="hidden lg:flex items-center space-x-3 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-300">Elexon API:</span>
                  <span className="font-semibold text-emerald-400">Connected</span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="text-slate-400">
                  Cutoff: <span className="font-mono text-slate-200 font-medium">09:00 London</span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="text-blue-300 font-mono font-medium">Jan 2026</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700">WindSight Intelligence</span>
              <span>•</span>
              <span>Sign Convention: Error = Forecast - Actual (Positive = Overforecast)</span>
            </div>
            <div>
              <span>Source: Elexon BMRS (WINDFOR & FUELHH) • Europe/London</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
