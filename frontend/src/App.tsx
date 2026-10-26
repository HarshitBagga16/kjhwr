import React, { useState, useEffect, useCallback, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { FarmBackground } from './components/FarmBackground';

// API Base configuration (strips trailing slash so //api/ never occurs)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// ==========================================
// 1. DATA MODELS & TYPES
// ==========================================
interface AlignedObservation {
  delivery_start: string;
  delivery_date: string;
  delivery_hour: number;
  forecast_mw: number | null;
  actual_mw: number | null;
  error_mw: number | null;
  absolute_error_mw: number | null;
  forecast_publish_time: string | null;
  decision_cutoff: string;
  status: 'matched' | 'missing_forecast' | 'missing_actual' | 'missing_both';
}

interface ForecastMetrics {
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  wape_pct: number | null;
  mape_pct: number | null;
  mape_note: string | null;
  sample_count: number;
  total_intervals: number;
  matched_count: number;
  missing_forecast_count: number;
  missing_actual_count: number;
  coverage_pct: number;
}

interface ForecastHistoryItem {
  publish_time: string;
  generation_mw: number;
  is_eligible: boolean;
  is_selected: boolean;
  lead_time_hours: number | null;
  cutoff_time: string;
}

interface HourlyProfile {
  hour: number;
  bias_mw?: number;
  mean_error_mw?: number;
  mae_mw?: number;
  mean_absolute_error_mw?: number;
  rmse_mw?: number;
  mean_forecast_mw?: number;
  mean_actual_mw?: number;
  sample_count: number;
}

interface ContactReceipt {
  status: string;
  receipt_id: string;
  recipient: string;
  timestamp: string;
  message: string;
}

// Route Helper
function parseRoute(pathname: string): { section: 'ledger' | 'inspector' | 'diagnostics' | 'raw'; is404: boolean } {
  const clean = pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (clean === '/' || clean === '/dashboard' || clean === '/ledger') {
    return { section: 'ledger', is404: false };
  }
  if (clean === '/forecasts' || clean === '/vintages' || clean === '/inspector') {
    return { section: 'inspector', is404: false };
  }
  if (clean === '/analytics' || clean === '/diurnal' || clean === '/diagnostics') {
    return { section: 'diagnostics', is404: false };
  }
  if (clean === '/data-explorer' || clean === '/raw' || clean === '/audit') {
    return { section: 'raw', is404: false };
  }
  return { section: 'ledger', is404: true };
}

// ==========================================
// 2. ERROR BOUNDARY COMPONENT
// ==========================================
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('WindSight ErrorBoundary caught an exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#DDE3E8] text-[#141217] flex items-center justify-center p-6 font-mono">
          <div className="max-w-2xl w-full bg-white border-2 border-[#3A0F34] p-8 brutal-shadow space-y-6">
            <div className="flex items-center justify-between border-b-2 border-[#3A0F34] pb-4">
              <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 border border-rose-800">
                [ TELETYPE EXCEPTION | RUNTIME HALT ]
              </span>
              <span className="text-xs font-bold text-[#3A0F34]">ERROR CODE 500-APP</span>
            </div>

            <div>
              <h1 className="font-display font-black text-2xl text-[#3A0F34]">
                DISPATCH TELETYPE ENCOUNTERED A RUNTIME FAULT
              </h1>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                An unexpected execution anomaly interrupted telemetry rendering. The application state has been safely isolated to prevent lookahead corruption.
              </p>
            </div>

            <div className="bg-[#DDE3E8] border border-[#3A0F34] p-4 text-xs font-mono overflow-x-auto text-[#3A0F34]">
              <div className="font-bold text-rose-900 mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown runtime error'}
              </div>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[11px] text-slate-600 overflow-x-auto mt-2 max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t-2 border-[#3A0F34]">
              <div className="text-xs text-slate-500">
                Lead Systems Engineer: <strong className="text-[#3A0F34]">Harshit Bagga</strong>
              </div>
              <div className="flex items-center space-x-3">
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=harshitbagga34@gmail.com&su=WindSight%20Telemetry%20Exception"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 border-2 border-[#3A0F34] bg-white text-[#3A0F34] text-xs font-bold brutal-btn"
                >
                  [ NOTIFY DESK ]
                </a>
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-[#3A0F34] text-white text-xs font-bold brutal-btn"
                >
                  [ REBOOT TELETYPE ]
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==========================================
// 3. MAIN APPLICATION COMPONENT
// ==========================================
export function App() {
  // Routing & 404 detection
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const routeInfo = useMemo(() => parseRoute(currentPath), [currentPath]);
  const [activeSection, setActiveSection] = useState<'ledger' | 'inspector' | 'diagnostics' | 'raw'>(routeInfo.section);
  const is404 = routeInfo.is404;

  // Operational state
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [selectedHour, setSelectedHour] = useState<number>(14);
  const [stampActive, setStampActive] = useState<boolean>(true);

  // Cool Interactive Wind Turbine & Gust Simulation State with Smooth Aerodynamic Deceleration
  const [gustActive, setGustActive] = useState<boolean>(false);
  const [gustColorActive, setGustColorActive] = useState<boolean>(false);
  const [spinSpeed, setSpinSpeed] = useState<number>(6.0); // duration in seconds
  const [gustCount, setGustCount] = useState<number>(0);
  const [windVelocity, setWindVelocity] = useState<number>(11.4);
  const [rotorRpm, setRotorRpm] = useState<number>(14.8);

  // Modals
  const [contactOpen, setContactOpen] = useState<boolean>(false);
  const [privacyOpen, setPrivacyOpen] = useState<boolean>(false);

  // Contact Form State
  const [contactName, setContactName] = useState<string>('');
  const [contactSenderEmail, setContactSenderEmail] = useState<string>('');
  const [contactOrg, setContactOrg] = useState<string>('');
  const [contactMsg, setContactMsg] = useState<string>('');
  const [contactSubmitting, setContactSubmitting] = useState<boolean>(false);
  const [contactReceipt, setContactReceipt] = useState<ContactReceipt | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // Live Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState<AlignedObservation[]>([]);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);
  const [historyItems, setHistoryItems] = useState<ForecastHistoryItem[]>([]);
  const [hourlyProfiles, setHourlyProfiles] = useState<HourlyProfile[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'delivery_hour' | 'error_mw' | 'absolute_error_mw'>('delivery_hour');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Handle URL history state & Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      const parsed = parseRoute(window.location.pathname);
      if (!parsed.is404) {
        setActiveSection(parsed.section);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToSection = (sec: 'ledger' | 'inspector' | 'diagnostics' | 'raw') => {
    setActiveSection(sec);
    const pathMap: Record<string, string> = {
      ledger: '/ledger',
      inspector: '/vintages',
      diagnostics: '/diurnal',
      raw: '/audit',
    };
    const target = pathMap[sec];
    window.history.pushState({}, '', target);
    setCurrentPath(target);
  };

  // Update dynamic page title
  useEffect(() => {
    if (is404) {
      document.title = 'WindSight — [ 404 ROUTE NOT FOUND ] | Harshit Bagga';
      return;
    }
    const titles: Record<string, string> = {
      ledger: 'DISPATCH LEDGER',
      inspector: 'VINTAGE DOCKET',
      diagnostics: 'FLEET DIURNAL',
      raw: 'RAW AUDIT LOG',
    };
    document.title = `WindSight — [ ${titles[activeSection]} ] | Harshit Bagga`;
  }, [activeSection, is404]);

  // Trigger Kinetic Offshore Wind Gust Animation with Smooth Deceleration & Gentle Color Fade
  const triggerOffshoreGust = () => {
    if (gustActive) return;
    setGustActive(true);
    setGustColorActive(true);
    setGustCount((c) => c + 1);

    // Gale Force Peak
    const peakSpeed = Number((21.2 + Math.random() * 4).toFixed(1));
    const peakRpm = Number((27.5 + Math.random() * 4).toFixed(1));
    setWindVelocity(peakSpeed);
    setRotorRpm(peakRpm);
    setSpinSpeed(0.35); // Rapid gale spin

    // After 2.0s of full gale, begin smooth physical deceleration in stages:
    setTimeout(() => {
      // Streamlines cease, card color begins its 3-second gentle fade
      setGustActive(false);
      setGustColorActive(false);

      // Deceleration Stage 1: 0.85s spin
      setSpinSpeed(0.85);
      setWindVelocity(18.5);
      setRotorRpm(22.8);

      setTimeout(() => {
        // Deceleration Stage 2: 1.6s spin
        setSpinSpeed(1.6);
        setWindVelocity(15.8);
        setRotorRpm(19.4);

        setTimeout(() => {
          // Deceleration Stage 3: 2.8s spin
          setSpinSpeed(2.8);
          setWindVelocity(13.6);
          setRotorRpm(17.0);

          setTimeout(() => {
            // Deceleration Stage 4: 4.4s spin
            setSpinSpeed(4.4);
            setWindVelocity(12.2);
            setRotorRpm(15.6);

            setTimeout(() => {
              // Back to smooth continuous idle cruising: 6.0s spin
              setSpinSpeed(6.0);
              setWindVelocity(11.4);
              setRotorRpm(14.8);
            }, 900);
          }, 800);
        }, 750);
      }, 700);
    }, 2000);
  };

  // Fetch Dashboard & Forecast observations
  const fetchDayData = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard?date=${dateStr}`);
      if (!res.ok) {
        throw new Error(`TELEMETRY DROP HTTP ${res.status}: Wire connection rejected.`);
      }
      const data = await res.json();
      const obsList: AlignedObservation[] = data.observations ?? [];
      setObservations(obsList);
      setMetrics(data.metrics ?? null);
      setStampActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TELEMETRY FAILURE: Wire connection silent.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Diurnal Fleet Profile for Analytics
  const fetchFleetProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/hourly-profile?from=2026-01-01&to=2026-01-31`);
      if (res.ok) {
        const data = await res.json();
        setHourlyProfiles(data.hourly ?? []);
      }
    } catch {
      // Quiet background fallback
    }
  }, []);

  // Fetch Historical Vintages for Selected Hour
  const fetchVintages = useCallback(async (dateStr: string, hour: number) => {
    setHistoryLoading(true);
    try {
      const padHour = String(hour).padStart(2, '0');
      const isoStart = `${dateStr}T${padHour}:00:00Z`;
      const res = await fetch(`${API_BASE}/api/forecasts/${encodeURIComponent(isoStart)}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.history ?? []);
      } else {
        setHistoryItems([]);
      }
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDayData(selectedDate);
    fetchFleetProfile();
  }, [selectedDate, fetchDayData, fetchFleetProfile]);

  useEffect(() => {
    fetchVintages(selectedDate, selectedHour);
  }, [selectedDate, selectedHour, fetchVintages]);

  // Calendar stepper
  const stepDate = (deltaDays: number) => {
    try {
      const parts = selectedDate.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${day}`);
    } catch {
      // ignore
    }
  };

  // Active observation for scrutiny
  const activeObs = useMemo(() => {
    return observations.find((o) => o.delivery_hour === selectedHour) ?? observations[0];
  }, [observations, selectedHour]);

  // Max generation for scaling SVG chart
  const maxGen = useMemo(() => {
    let maxVal = 20000;
    for (const o of observations) {
      if (o.forecast_mw && o.forecast_mw > maxVal) maxVal = o.forecast_mw;
      if (o.actual_mw && o.actual_mw > maxVal) maxVal = o.actual_mw;
    }
    return Math.ceil(maxVal / 2000) * 2000;
  }, [observations]);

  // Filtered & sorted observations for Raw Ledger
  const displayedObservations = useMemo(() => {
    let list = [...observations];
    if (statusFilter !== 'all') {
      list = list.filter((o) => o.status === statusFilter);
    }
    list.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [observations, statusFilter, sortField, sortAsc]);

  const triggerExport = () => {
    window.open(`${API_BASE}/api/analytics/export?from=${selectedDate}&to=${selectedDate}`, '_blank');
  };

  // Submit contact message directly via in-app API (no blank tabs)
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactError(null);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactSenderEmail,
          organization: contactOrg || 'Energy Utility Desk',
          message: contactMsg,
        }),
      });
      if (!res.ok) {
        throw new Error(`Wire delivery rejected with HTTP ${res.status}`);
      }
      const data = await res.json();
      setContactReceipt(data);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Transmission failure across telegraph bus.');
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#DDE3E8] text-[#141217] flex flex-col font-mono selection:bg-[#EAAA00] selection:text-[#3A0F34] relative">
      {/* CONTINUOUS ANIMATED FARM BACKGROUND (ANIMATED ANIMALS, BLINKING EYES, SWAYING GRASS, BARN, WINDMILL) */}
      <FarmBackground />

      {/* CONTENT LAYER */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* 1. TOP TELETYPE PROTOCOL HEADER */}
        <header className="border-b-2 border-[#3A0F34] bg-[#3A0F34] text-[#DDE3E8] px-4 py-3 select-none">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span
              onClick={() => navigateToSection('ledger')}
              className="font-display font-black text-base tracking-tight text-[#EAAA00] uppercase cursor-pointer hover:text-white transition-colors"
            >
              WINDSIGHT LEDGER
            </span>
            <span className="border border-[#EAAA00]/40 px-2 py-0.5 text-[10px] text-[#EAAA00] font-semibold tracking-wider">
              [ PROTOCOL: ELEXON BMRS LIVE ]
            </span>
            <span className="hidden sm:inline text-slate-300">
              CUTOFF: 09:00 EUROPE/LONDON
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <div className="flex items-center space-x-1.5">
              <span className={`inline-block w-2 h-2 ${loading ? 'bg-amber-400' : 'bg-[#EAAA00]'} animate-pulse`}></span>
              <span className="text-[#EAAA00] font-bold">
                {loading ? 'TELEMETRY SYNCING...' : 'GRID SYNC OK'}
              </span>
            </div>
            <span className="text-slate-400">|</span>
            <button
              type="button"
              onClick={() => {
                setContactReceipt(null);
                setContactError(null);
                setContactOpen(true);
              }}
              className="text-[#EAAA00] hover:text-white underline font-bold cursor-pointer transition-colors"
            >
              [ CONTACT DESK ]
            </button>
            <span className="text-slate-400 hidden lg:inline">|</span>
            <span className="hidden lg:inline text-slate-300">SYSTEM: 2026-10-26 UTC</span>
          </div>
        </div>
      </header>

      {/* 2. OPERATIONAL TELEGRAPH NAVIGATION & BREADCRUMBS */}
      <nav className="border-b-2 border-[#3A0F34] bg-[#DDE3E8] px-4 py-2 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Section Mode Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => navigateToSection('ledger')}
              className={`px-3 py-1.5 text-xs uppercase font-bold tracking-wider transition-all brutal-btn ${
                !is404 && activeSection === 'ledger'
                  ? 'bg-[#3A0F34] text-[#DDE3E8] shadow-[3px_3px_0px_#EAAA00]'
                  : 'bg-white text-[#3A0F34] hover:bg-[#DDE3E8]'
              }`}
            >
              [ 01 DISPATCH LEDGER ]
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('inspector')}
              className={`px-3 py-1.5 text-xs uppercase font-bold tracking-wider transition-all brutal-btn ${
                !is404 && activeSection === 'inspector'
                  ? 'bg-[#3A0F34] text-[#DDE3E8] shadow-[3px_3px_0px_#EAAA00]'
                  : 'bg-white text-[#3A0F34] hover:bg-[#DDE3E8]'
              }`}
            >
              [ 02 VINTAGE DOCKET ]
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('diagnostics')}
              className={`px-3 py-1.5 text-xs uppercase font-bold tracking-wider transition-all brutal-btn ${
                !is404 && activeSection === 'diagnostics'
                  ? 'bg-[#3A0F34] text-[#DDE3E8] shadow-[3px_3px_0px_#EAAA00]'
                  : 'bg-white text-[#3A0F34] hover:bg-[#DDE3E8]'
              }`}
            >
              [ 03 FLEET DIURNAL ]
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('raw')}
              className={`px-3 py-1.5 text-xs uppercase font-bold tracking-wider transition-all brutal-btn ${
                !is404 && activeSection === 'raw'
                  ? 'bg-[#3A0F34] text-[#DDE3E8] shadow-[3px_3px_0px_#EAAA00]'
                  : 'bg-white text-[#3A0F34] hover:bg-[#DDE3E8]'
              }`}
            >
              [ 04 RAW AUDIT LOG ]
            </button>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              className="px-2.5 py-1 text-xs font-bold bg-white text-[#3A0F34] border-2 border-[#3A0F34] brutal-btn"
              title="Previous delivery day"
            >
              [ PREV DAY ]
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-mono font-bold bg-white text-[#3A0F34] border-2 border-[#3A0F34] brutal-shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EAAA00]"
            />

            <button
              type="button"
              onClick={() => stepDate(1)}
              className="px-2.5 py-1 text-xs font-bold bg-white text-[#3A0F34] border-2 border-[#3A0F34] brutal-btn"
              title="Next delivery day"
            >
              [ NEXT DAY ]
            </button>
          </div>
        </div>

        {/* Breadcrumb Trail */}
        <div className="max-w-[1440px] mx-auto pt-1.5 pb-0.5 text-[10px] text-slate-600 flex items-center space-x-2">
          <span>PORTAL</span>
          <span>&gt;</span>
          <span>UK ELECTRICITY TRANSMISSION</span>
          <span>&gt;</span>
          <span className="font-bold text-[#3A0F34]">
            {is404
              ? `[ 404 ROUTE NOT FOUND : ${currentPath} ]`
              : activeSection === 'ledger'
              ? '01 DISPATCH LEDGER (HOURLY ALIGNMENT)'
              : activeSection === 'inspector'
              ? '02 VINTAGE DOCKET (GATE CLOSURE AUDIT)'
              : activeSection === 'diagnostics'
              ? '03 FLEET DIURNAL (24-HOUR ERROR BIAS)'
              : '04 RAW AUDIT LOG (RFC 4180 CSV)'}
          </span>
        </div>
      </nav>

      {/* 3. DEDICATED 404 ERROR PAGE VIEW */}
      {is404 ? (
        <main className="max-w-[1440px] mx-auto w-full px-4 py-12 flex-1 flex items-center justify-center">
          <div className="max-w-xl w-full bg-white border-4 border-[#3A0F34] p-8 brutal-shadow space-y-6">
            <div className="flex items-center justify-between border-b-2 border-[#3A0F34] pb-3">
              <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 border border-rose-800 uppercase">
                [ 404 | INVALID DISPATCH ROUTE ]
              </span>
              <span className="text-xs font-bold text-[#3A0F34]">ROUTING FAULT</span>
            </div>

            <div>
              <h1 className="font-display font-black text-3xl text-[#3A0F34]">
                TRANSMISSION CHANNEL NOT FOUND
              </h1>
              <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                The requested URL path <code className="bg-[#DDE3E8] px-2 py-0.5 border border-[#3A0F34] font-bold text-[#3A0F34]">{currentPath}</code> does not match any registered dispatch docket on the UK National Grid telemetry matrix.
              </p>
            </div>

            <div className="p-4 bg-[#DDE3E8] border border-[#3A0F34] text-xs space-y-3">
              <div className="font-bold text-[#3A0F34] uppercase tracking-wider">
                VALID REGISTERED DISPATCH DOCKETS:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => navigateToSection('ledger')}
                  className="text-left font-bold text-[#3A0F34] hover:text-[#EAAA00] p-1.5 bg-white border border-[#3A0F34] brutal-btn"
                >
                  → /ledger (01 Dispatch)
                </button>
                <button
                  type="button"
                  onClick={() => navigateToSection('inspector')}
                  className="text-left font-bold text-[#3A0F34] hover:text-[#EAAA00] p-1.5 bg-white border border-[#3A0F34] brutal-btn"
                >
                  → /vintages (02 Vintages)
                </button>
                <button
                  type="button"
                  onClick={() => navigateToSection('diagnostics')}
                  className="text-left font-bold text-[#3A0F34] hover:text-[#EAAA00] p-1.5 bg-white border border-[#3A0F34] brutal-btn"
                >
                  → /diurnal (03 Diurnal)
                </button>
                <button
                  type="button"
                  onClick={() => navigateToSection('raw')}
                  className="text-left font-bold text-[#3A0F34] hover:text-[#EAAA00] p-1.5 bg-white border border-[#3A0F34] brutal-btn"
                >
                  → /audit (04 Raw Log)
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t-2 border-[#3A0F34]">
              <div className="text-xs text-slate-500">
                Lead Systems Engineer: <strong>Harshit Bagga</strong>
              </div>
              <button
                type="button"
                onClick={() => navigateToSection('ledger')}
                className="px-4 py-2 bg-[#EAAA00] text-[#3A0F34] font-bold text-xs brutal-btn text-center"
              >
                [ RETURN TO 01 DISPATCH LEDGER ]
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* 4. MAIN WORKSPACE */
        <main className="max-w-[1440px] mx-auto w-full px-4 py-6 space-y-6 flex-1">
          {/* HERO MANIFESTO & INTERACTIVE WIND TURBINE WIDGET */}
          <section className="bg-white border-2 border-[#3A0F34] p-6 brutal-shadow relative overflow-hidden">
            {/* Animated Wind Gust Streamlines when Gust is Triggered */}
            {gustActive && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#EAAA00] to-transparent opacity-80 animate-wind-stream" />
                <div
                  className="absolute top-20 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#3A0F34] to-transparent opacity-70 animate-wind-stream"
                  style={{ animationDelay: '0.15s' }}
                />
                <div
                  className="absolute top-36 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#EAAA00] to-transparent opacity-90 animate-wind-stream"
                  style={{ animationDelay: '0.3s' }}
                />
                <div
                  className="absolute top-52 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-[#3A0F34] to-transparent opacity-60 animate-wind-stream"
                  style={{ animationDelay: '0.45s' }}
                />
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-3xl space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="bg-[#EAAA00] text-[#3A0F34] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    DAY-AHEAD PROCUREMENT INTELLIGENCE
                  </span>
                  <span className="text-xs text-slate-500">
                    WINDOW: JANUARY 2026 PILOT
                  </span>
                </div>
                <h1 className="font-display font-black text-3xl sm:text-4xl text-[#3A0F34] tracking-tight leading-none">
                  POINT-IN-TIME WIND GENERATION DISPATCH
                </h1>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans font-medium">
                  Auditing day-ahead wind power purchase decisions. Every forecast is matched at 09:00 Europe/London gate closure without lookahead bias. Evaluated strictly against settled Elexon BMRS physical outturn.
                </p>
              </div>

              {/* TACTILE KINETIC WIND TURBINE WIDGET (INTERACTIVE DELIGHT) */}
              <div className="shrink-0 flex items-center justify-end">
                <div
                  onClick={triggerOffshoreGust}
                  title="Click to inject an offshore wind gust!"
                  style={{
                    backgroundColor: gustColorActive ? '#EAAA00' : '#FFFFFF',
                    transition: 'background-color 3.2s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s ease',
                  }}
                  className={`cursor-pointer select-none border-4 border-[#3A0F34] p-4 text-center transition-all brutal-btn relative text-[#3A0F34] ${
                    gustActive ? 'scale-105' : 'hover:bg-[#DDE3E8]'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Interactive SVG Wind Turbine */}
                    <div className="relative w-16 h-20 flex items-center justify-center">
                      {/* Tower & Base */}
                      <svg viewBox="0 0 100 120" className="w-full h-full">
                        {/* Tower pole */}
                        <polygon points="46,45 54,45 57,115 43,115" fill="#3A0F34" />
                        <line x1="38" y1="115" x2="62" y2="115" stroke="#3A0F34" strokeWidth="4" />

                        {/* Nacelle hub center at (50, 45) */}
                        <rect x="44" y="40" width="12" height="10" rx="2" fill="#EAAA00" stroke="#3A0F34" strokeWidth="2" />

                        {/* Rotating 3-Blade Propeller with Smooth Aerodynamic Deceleration */}
                        <g
                          style={{
                            animation: `turbine-spin ${spinSpeed}s linear infinite`,
                            transformOrigin: '50px 45px',
                            transition: 'all 0.6s ease-out',
                          }}
                        >
                          {/* Blade 1 (Up) */}
                          <path d="M50,45 C48,25 45,5 50,0 C55,5 52,25 50,45 Z" fill="#3A0F34" />
                          {/* Blade 2 (120 deg) */}
                          <path
                            d="M50,45 C48,25 45,5 50,0 C55,5 52,25 50,45 Z"
                            fill="#3A0F34"
                            transform="rotate(120 50 45)"
                          />
                          {/* Blade 3 (240 deg) */}
                          <path
                            d="M50,45 C48,25 45,5 50,0 C55,5 52,25 50,45 Z"
                            fill="#3A0F34"
                            transform="rotate(240 50 45)"
                          />
                          {/* Rotor Center Cap */}
                          <circle cx="50" cy="45" r="4" fill="#EAAA00" stroke="#3A0F34" strokeWidth="1.5" />
                        </g>
                      </svg>
                    </div>

                    {/* Wind Readout Ticker */}
                    <div className="text-left font-mono">
                      <div className="text-[10px] font-black tracking-widest uppercase flex items-center space-x-1">
                        <span>[ {gustActive ? 'GALE FORCE ACTIVE' : 'TAP TURBINE: GUST'} ]</span>
                        <span className="text-xs">⚡</span>
                      </div>
                      <div className="font-display font-black text-xl text-[#3A0F34] mt-0.5 leading-none">
                        {windVelocity} <span className="text-xs font-mono font-normal">m/s</span>
                      </div>
                      <div className="text-[10px] text-slate-700 mt-1">
                        ROTOR: <strong>{rotorRpm} RPM</strong> | GUSTS: #{gustCount}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#3A0F34]/30 text-[9px] font-bold uppercase tracking-wider text-[#3A0F34] flex items-center justify-between">
                    <span>{gustActive ? 'SURGING +3,100 MW' : 'OFFSHORE SIMULATOR'}</span>
                    <span>{stampActive ? 'GATE LOCKED' : 'FREE SPIN'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Focal Point Cards: Asymmetrical Grid */}
            <div className="mt-6 pt-6 border-t-2 border-[#3A0F34] grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Metric 1: Fleet Bias */}
              <div className="md:col-span-5 bg-[#DDE3E8] border-2 border-[#3A0F34] p-5 brutal-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-[#3A0F34] uppercase">
                      [ MEAN SIGNED BIAS ]
                    </span>
                    <span className="text-[10px] font-bold bg-[#3A0F34] text-[#EAAA00] px-1.5 py-0.5">
                      OVERFORECAST RISK
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-display font-black text-4xl text-[#3A0F34]">
                      {metrics?.bias_mw !== null && metrics?.bias_mw !== undefined
                        ? `${metrics.bias_mw > 0 ? '+' : ''}${metrics.bias_mw.toFixed(1)}`
                        : '--'}
                      <span className="text-base font-normal ml-1">MW</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Positive bias indicates systematic overforecasting against physical outturn.
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#3A0F34]/30 flex justify-between text-xs text-slate-600">
                  <span>EVALUATED INTERVALS:</span>
                  <span className="font-bold text-[#3A0F34] font-mono">n={metrics?.sample_count ?? 0}</span>
                </div>
              </div>

              {/* Metric 2: Volumetric Deviation */}
              <div className="md:col-span-4 bg-[#3A0F34] text-[#DDE3E8] border-2 border-[#3A0F34] p-5 brutal-shadow">
                <span className="text-xs font-bold tracking-wider text-[#EAAA00] uppercase">
                  [ VOLUMETRIC DEVIATION ]
                </span>

                <div className="mt-3 grid grid-cols-2 gap-4 border-b-2 border-[#DDE3E8]/20 pb-4">
                  <div>
                    <div className="text-[10px] text-slate-300 font-bold uppercase">MAE (MEAN ABS)</div>
                    <div className="font-display font-bold text-2xl text-white mt-1">
                      {metrics?.mae_mw ? `${metrics.mae_mw.toFixed(1)}` : '--'}
                      <span className="text-xs font-normal text-slate-300 ml-1">MW</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-300 font-bold uppercase">RMSE (QUADRATIC)</div>
                    <div className="font-display font-bold text-2xl text-[#EAAA00] mt-1">
                      {metrics?.rmse_mw ? `${metrics.rmse_mw.toFixed(1)}` : '--'}
                      <span className="text-xs font-normal text-slate-300 ml-1">MW</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-300">WAPE (VOLUME WEIGHTED):</span>
                  <span className="font-bold text-white font-mono">
                    {metrics?.wape_pct !== null && metrics?.wape_pct !== undefined ? `${metrics.wape_pct.toFixed(1)}%` : '--'}
                  </span>
                </div>
              </div>

              {/* Metric 3: Data Integrity */}
              <div className="md:col-span-3 bg-white border-2 border-[#3A0F34] p-5 brutal-shadow flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold tracking-wider text-[#3A0F34] uppercase">
                    [ DATA INTEGRITY ]
                  </span>

                  <div className="mt-3">
                    <div className="font-display font-black text-3xl text-[#3A0F34]">
                      {metrics?.coverage_pct ? `${metrics.coverage_pct.toFixed(1)}%` : '0%'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                      MATCHED INTERVALS: {metrics?.matched_count ?? 0} / {metrics?.total_intervals ?? 24}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-[#3A0F34] space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>DROPPED ACTUALS:</span>
                    <span className="font-bold text-rose-700">{metrics?.missing_actual_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ORPHAN FORECASTS:</span>
                    <span className="font-bold text-amber-700">{metrics?.missing_forecast_count ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. TAB VIEW CONTAINER */}
          {error ? (
            <div className="bg-white border-2 border-[#3A0F34] p-8 brutal-shadow text-center space-y-4">
              <div className="text-sm font-bold text-rose-700 uppercase">[ WIRE INTERRUPTION RECORDED ]</div>
              <div className="font-display text-xl font-bold text-[#3A0F34]">{error}</div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Connection to Elexon BMRS endpoint timed out or failed handshake. Verify local backend process is running on port 8000.
              </p>
              <button
                type="button"
                onClick={() => fetchDayData(selectedDate)}
                className="px-4 py-2 bg-[#3A0F34] text-white font-bold text-xs brutal-btn"
              >
                [ RETRY HANDSHAKE ]
              </button>
            </div>
          ) : observations.length === 0 ? (
            <div className="bg-white border-2 border-[#3A0F34] p-8 brutal-shadow text-center space-y-4">
              <div className="text-xs font-bold text-amber-600 uppercase">[ NO INGESTED LEDGER FOR {selectedDate} ]</div>
              <h2 className="font-display text-2xl font-bold text-[#3A0F34]">
                NO RECORDINGS FOR THIS SETTLEMENT DATE
              </h2>
              <p className="text-xs text-slate-600 max-w-lg mx-auto">
                The primary demonstration window is seeded with January 2026 data. Select a date within January 2026 to see full Elexon outturn profiles.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-01-15')}
                  className="px-4 py-2 bg-[#EAAA00] text-[#3A0F34] font-bold text-xs brutal-btn"
                >
                  [ JUMP JAN 15 2026 ]
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-01-01')}
                  className="px-4 py-2 bg-white text-[#3A0F34] font-bold text-xs brutal-btn"
                >
                  [ JUMP JAN 01 2026 ]
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* VIEW 01: DISPATCH LEDGER TIME-SERIES */}
              {activeSection === 'ledger' && (
                <section className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#3A0F34] pb-2 gap-2">
                    <div>
                      <h2 className="font-display font-bold text-xl text-[#3A0F34]">
                        HALF-HOURLY GENERATION OUTTURN VS DAY-AHEAD FORECAST
                      </h2>
                      <p className="text-xs text-slate-600">
                        Settlement window for {selectedDate}. Forecast locked at 09:00 London gate closure.
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-bold">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 border-2 border-[#3A0F34] bg-[#3A0F34]"></span>
                        <span>OUTTURN ACTUAL (MW)</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 border-2 border-[#3A0F34] bg-[#EAAA00]"></span>
                        <span>FORECAST 09:00 (MW)</span>
                      </span>
                    </div>
                  </div>

                  {/* SVG Visualizer Canvas with 2px borders & brutal aesthetic */}
                  <div className="bg-white border-2 border-[#3A0F34] p-4 brutal-shadow teletype-table-container">
                    <div className="min-w-[700px]">
                      <svg viewBox="0 0 960 360" className="w-full h-80 overflow-visible" role="img" aria-label="UK Wind Generation Forecast vs Outturn Chart">
                        {/* Grid background lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                          const y = 30 + (1 - pct) * 280;
                          const mwLabel = Math.round(pct * maxGen);
                          return (
                            <g key={`grid-${idx}`}>
                              <line x1="50" y1={y} x2="940" y2={y} stroke="#DDE3E8" strokeWidth="1.5" strokeDasharray="3 3" />
                              <text x="42" y={y + 4} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
                                {mwLabel}
                              </text>
                            </g>
                          );
                        })}

                        {/* Hourly vertical guide lines & click targets */}
                        {observations.map((obs, idx) => {
                          const x = 60 + idx * 36.5;
                          const isSelected = obs.delivery_hour === selectedHour;
                          return (
                            <g
                              key={`col-${idx}`}
                              className="cursor-pointer group"
                              onClick={() => setSelectedHour(obs.delivery_hour)}
                            >
                              <rect
                                x={x - 18}
                                y="20"
                                width="36"
                                height="300"
                                fill={isSelected ? '#EAAA00' : 'transparent'}
                                opacity={isSelected ? 0.25 : 0}
                                className="group-hover:fill-slate-100 transition-colors"
                              />
                              <line
                                x1={x}
                                y1="25"
                                x2={x}
                                y2="310"
                                stroke={isSelected ? '#3A0F34' : '#e2e8f0'}
                                strokeWidth={isSelected ? '2' : '1'}
                              />
                              <text
                                x={x}
                                y="325"
                                fill={isSelected ? '#3A0F34' : '#64748b'}
                                fontSize="10"
                                fontWeight={isSelected ? 'bold' : 'normal'}
                                textAnchor="middle"
                              >
                                {String(obs.delivery_hour).padStart(2, '0')}:00
                              </text>
                            </g>
                          );
                        })}

                        {/* Actual generation step line */}
                        <path
                          d={observations
                            .map((obs, idx) => {
                              const x = 60 + idx * 36.5;
                              const y = 310 - ((obs.actual_mw ?? 0) / maxGen) * 280;
                              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke="#3A0F34"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Forecast line with yellow nodes */}
                        <path
                          d={observations
                            .map((obs, idx) => {
                              const x = 60 + idx * 36.5;
                              const y = 310 - ((obs.forecast_mw ?? 0) / maxGen) * 280;
                              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke="#EAAA00"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                        />

                        {/* Forecast dots */}
                        {observations.map((obs, idx) => {
                          const x = 60 + idx * 36.5;
                          const y = 310 - ((obs.forecast_mw ?? 0) / maxGen) * 280;
                          const isSelected = obs.delivery_hour === selectedHour;
                          return (
                            <circle
                              key={`fdot-${idx}`}
                              cx={x}
                              cy={y}
                              r={isSelected ? 6 : 3.5}
                              fill="#EAAA00"
                              stroke="#3A0F34"
                              strokeWidth="2"
                            />
                          );
                        })}

                        {/* Actual dots */}
                        {observations.map((obs, idx) => {
                          const x = 60 + idx * 36.5;
                          const y = 310 - ((obs.actual_mw ?? 0) / maxGen) * 280;
                          const isSelected = obs.delivery_hour === selectedHour;
                          return (
                            <circle
                              key={`adot-${idx}`}
                              cx={x}
                              cy={y}
                              r={isSelected ? 6 : 3.5}
                              fill="#3A0F34"
                              stroke="#DDE3E8"
                              strokeWidth="1.5"
                            />
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Interactive Hourly Scrub Inspector Dock */}
                  {activeObs && (
                    <div className="bg-[#3A0F34] text-[#DDE3E8] border-2 border-[#3A0F34] p-5 brutal-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b-2 border-[#DDE3E8]/20 gap-3">
                        <div>
                          <div className="text-[10px] text-[#EAAA00] uppercase font-bold tracking-widest">
                            [ ACTIVE INTERVAL SCRUBBER | HOUR {String(activeObs.delivery_hour).padStart(2, '0')}:00 UTC ]
                          </div>
                          <div className="font-display font-bold text-xl text-white mt-0.5">
                            DELIVERY INTERVAL {activeObs.delivery_date} @ {String(activeObs.delivery_hour).padStart(2, '0')}:00
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => navigateToSection('inspector')}
                            className="px-3 py-1.5 bg-[#EAAA00] text-[#3A0F34] text-xs font-bold brutal-btn"
                          >
                            [ INTERROGATE VINTAGES ]
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                        <div>
                          <span className="text-slate-300 block">FORECAST 09:00:</span>
                          <span className="font-display font-bold text-lg text-[#EAAA00]">
                            {activeObs.forecast_mw !== null ? `${activeObs.forecast_mw.toFixed(1)} MW` : 'MISSING'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-300 block">SETTLED OUTTURN:</span>
                          <span className="font-display font-bold text-lg text-white">
                            {activeObs.actual_mw !== null ? `${activeObs.actual_mw.toFixed(1)} MW` : 'MISSING'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-300 block">SIGNED ERROR (F - A):</span>
                          <span
                            className={`font-display font-bold text-lg ${
                              (activeObs.error_mw ?? 0) >= 0 ? 'text-[#EAAA00]' : 'text-purple-300'
                            }`}
                          >
                            {activeObs.error_mw !== null
                              ? `${activeObs.error_mw > 0 ? '+' : ''}${activeObs.error_mw.toFixed(1)} MW`
                              : '--'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-300 block">AUDIT STATUS:</span>
                          <span className="inline-block mt-1 font-bold px-2 py-0.5 bg-white text-[#3A0F34] uppercase text-[10px]">
                            [{activeObs.status.replace('_', ' ')}]
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* VIEW 02: VINTAGE INSPECTOR DOCKET */}
              {activeSection === 'inspector' && (
                <section className="space-y-6">
                  <div className="border-b-2 border-[#3A0F34] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display font-bold text-xl text-[#3A0F34]">
                        POINT-IN-TIME VINTAGE REVISION DOCKET
                      </h2>
                      <p className="text-xs text-slate-600">
                        Verifying all WINDFOR forecast revisions against the 09:00 London Gate Closure.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#3A0F34]">TARGET HOUR:</span>
                      <select
                        value={selectedHour}
                        onChange={(e) => setSelectedHour(Number(e.target.value))}
                        className="border-2 border-[#3A0F34] bg-white px-2 py-1 text-xs font-bold brutal-shadow-sm"
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={`hour-opt-${h}`} value={h}>
                            {String(h).padStart(2, '0')}:00 UTC
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Historical Vintages Table */}
                    <div className="lg:col-span-8 bg-white border-2 border-[#3A0F34] p-5 brutal-shadow teletype-table-container">
                      <div className="flex items-center justify-between border-b-2 border-[#3A0F34] pb-3 mb-4">
                        <span className="font-bold text-xs uppercase text-[#3A0F34]">
                          [ PUBLISHED VINTAGES CHRONOLOGY: {selectedDate} @ {String(selectedHour).padStart(2, '0')}:00 ]
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {historyItems.length} REVISIONS RECORDED
                        </span>
                      </div>

                      {historyLoading ? (
                        <div className="text-center py-8 text-xs font-bold text-[#3A0F34]">
                          [ LOADING VINTAGE AUDIT LOG... ]
                        </div>
                      ) : historyItems.length === 0 ? (
                        <div className="text-center py-8 text-xs font-bold text-slate-500">
                          No revisions recorded for this specific interval in database.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#DDE3E8] text-[#3A0F34] border-b-2 border-[#3A0F34]">
                            <tr>
                              <th className="py-2 px-3 font-bold">PUBLISH TIME (UTC)</th>
                              <th className="py-2 px-3 font-bold text-right">FORECAST (MW)</th>
                              <th className="py-2 px-3 font-bold text-right">LEAD TIME</th>
                              <th className="py-2 px-3 font-bold text-center">ELIGIBILITY</th>
                              <th className="py-2 px-3 font-bold text-center">DECISION STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-2 divide-slate-100">
                            {historyItems.map((item, idx) => (
                              <tr
                                key={`v-${idx}`}
                                className={`transition-colors ${
                                  item.is_selected
                                    ? 'bg-[#EAAA00]/25 font-bold text-[#3A0F34]'
                                    : 'hover:bg-slate-50 text-[#141217]'
                                }`}
                              >
                                <td className="py-2.5 px-3">
                                  {new Date(item.publish_time).toISOString().replace('.000Z', 'Z')}
                                </td>
                                <td className="py-2.5 px-3 text-right font-display font-bold">
                                  {item.generation_mw.toFixed(1)} MW
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {item.lead_time_hours ? `${item.lead_time_hours}h prior` : '--'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {item.is_eligible ? (
                                    <span className="px-1.5 py-0.5 border border-[#3A0F34] bg-white text-[10px] font-bold text-[#3A0F34]">
                                      [ELIGIBLE]
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 border border-rose-800 bg-rose-100 text-[10px] font-bold text-rose-800">
                                      [VOID POST GATE]
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {item.is_selected ? (
                                    <span className="px-2 py-0.5 bg-[#3A0F34] text-[#EAAA00] text-[10px] font-bold">
                                      [★ ACTIVE ORDER]
                                    </span>
                                  ) : item.is_eligible ? (
                                    <span className="text-slate-400 text-[10px]">SUPERSEDED</span>
                                  ) : (
                                    <span className="text-rose-700 text-[10px]">DISQUALIFIED</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Right 4 Cols: Desk Memo */}
                    <div className="lg:col-span-4 bg-[#3A0F34] text-[#DDE3E8] border-2 border-[#3A0F34] p-5 brutal-shadow space-y-4">
                      <span className="text-xs font-bold text-[#EAAA00] uppercase tracking-widest block">
                        [ GATE CLOSURE POLICY MEMO ]
                      </span>

                      <h3 className="font-display font-bold text-lg text-white">
                        WHY WAS THIS VINTAGE CHOSEN?
                      </h3>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        At 09:00 Europe/London, the trading desk submitted physical day-ahead notification orders. Under Elexon rules, any wind forecast published after 09:00 is unavailable at decision time.
                      </p>

                      <div className="border border-[#EAAA00]/40 p-3 bg-black/20 text-xs space-y-2">
                        <div className="text-[#EAAA00] font-bold uppercase text-[11px]">
                          RULE 1: NO LOOKAHEAD BIAS
                        </div>
                        <p className="text-slate-300 text-[11px]">
                          Revisions with publish time &gt; 09:00 London are purged from evaluation. Evaluating day-ahead decisions with afternoon forecasts is analytical negligence.
                        </p>
                      </div>

                      <div className="border border-[#EAAA00]/40 p-3 bg-black/20 text-xs space-y-2">
                        <div className="text-[#EAAA00] font-bold uppercase text-[11px]">
                          RULE 2: MAX ELIGIBLE TIMESTAMP
                        </div>
                        <p className="text-slate-300 text-[11px]">
                          From all forecasts published before 09:00, WindSight algorithmically isolates max(publish_time) as the single source of truth.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* VIEW 03: FLEET DIURNAL DIAGNOSTICS */}
              {activeSection === 'diagnostics' && (
                <section className="space-y-6">
                  <div className="border-b-2 border-[#3A0F34] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display font-bold text-xl text-[#3A0F34]">
                        DIURNAL FLEET PROFILE & ERROR SIGNATURE
                      </h2>
                      <p className="text-xs text-slate-600">
                        Systematic error patterns across the 24 hours of the day for the UK national wind fleet.
                      </p>
                    </div>
                    <div className="text-xs font-bold text-[#3A0F34]">
                      [ 744 HOURS ANALYZED | JAN 2026 ]
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Diurnal 24h Bar Chart */}
                    <div className="lg:col-span-7 bg-white border-2 border-[#3A0F34] p-5 brutal-shadow">
                      <div className="flex items-center justify-between border-b-2 border-[#3A0F34] pb-3 mb-4">
                        <span className="font-bold text-xs uppercase text-[#3A0F34]">
                          [ MEAN ERROR BY HOUR OF DAY (00:00 - 23:00 UTC) ]
                        </span>
                        <span className="text-[10px] font-bold bg-[#EAAA00] text-[#3A0F34] px-1.5 py-0.5">
                          DIURNAL SIGNATURE
                        </span>
                      </div>

                      {hourlyProfiles.length === 0 ? (
                        <div className="text-center py-12 text-xs font-bold text-slate-500">
                          [ COMPUTING 24-HOUR DIURNAL ERROR SIGNATURE... ]
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2">
                          {hourlyProfiles.map((hp) => {
                            const err = hp.mean_error_mw ?? hp.bias_mw ?? 0;
                            const isPos = err >= 0;
                            const maxAbs = 650;
                            const widthPct = Math.min(100, (Math.abs(err) / maxAbs) * 100);

                            return (
                              <div key={`hp-${hp.hour}`} className="flex items-center text-xs">
                                <span className="w-12 font-bold text-slate-600 shrink-0">
                                  {String(hp.hour).padStart(2, '0')}:00
                                </span>

                                <div className="flex-1 flex items-center bg-[#DDE3E8] h-5 border border-[#3A0F34] relative">
                                  {/* Center zero mark */}
                                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#3A0F34] z-10" />

                                  {/* Bar */}
                                  {isPos ? (
                                    <div
                                      style={{ left: '50%', width: `${widthPct / 2}%` }}
                                      className="absolute top-0 bottom-0 bg-[#EAAA00] border-r border-[#3A0F34]"
                                    />
                                  ) : (
                                    <div
                                      style={{ right: '50%', width: `${widthPct / 2}%` }}
                                      className="absolute top-0 bottom-0 bg-[#3A0F34] border-l border-[#3A0F34]"
                                    />
                                  )}
                                </div>

                                <span
                                  className={`w-24 text-right font-bold ml-2 shrink-0 ${
                                    isPos ? 'text-[#EAAA00]' : 'text-[#3A0F34]'
                                  }`}
                                >
                                  {isPos ? `+${err.toFixed(1)}` : err.toFixed(1)} MW
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Analytical Diagnosis */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="bg-[#3A0F34] text-[#DDE3E8] border-2 border-[#3A0F34] p-5 brutal-shadow">
                        <span className="text-xs font-bold text-[#EAAA00] uppercase tracking-widest block mb-2">
                          [ OPINIONATED DESK DIAGNOSIS ]
                        </span>
                        <h3 className="font-display font-bold text-base text-white">
                          THE EVENING OVERFORECAST TRAP
                        </h3>
                        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                          Numerical weather prediction consistently overforecasts wind outturn during peak evening demand hours (17:00 - 21:00 UTC). When evening wind drops faster than modeled, balancing margins compress and power prices spike.
                        </p>
                        <div className="mt-4 pt-3 border-t-2 border-[#DDE3E8]/20 flex justify-between text-xs">
                          <span className="text-slate-300">SYSTEMATIC SKEW:</span>
                          <span className="font-bold text-[#EAAA00]">+239.4 MW OVERESTIMATED</span>
                        </div>
                      </div>

                      <div className="bg-white border-2 border-[#3A0F34] p-5 brutal-shadow">
                        <span className="text-xs font-bold text-[#3A0F34] uppercase tracking-widest block mb-2">
                          [ RISK DISCLAIMER NOTICE ]
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          WindSight isolates physical wind outturn and day-ahead forecast feeds from Elexon BMRS. This platform does not incorporate imbalance cash-out prices, system demand curves, or financial trading losses because Elexon outturn feeds do not furnish procurement volumes.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* VIEW 04: RAW AUDIT LOG & CSV EXPORT */}
              {activeSection === 'raw' && (
                <section className="space-y-6">
                  <div className="border-b-2 border-[#3A0F34] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display font-bold text-xl text-[#3A0F34]">
                        RAW SETTLEMENT & FORECAST AUDIT LOG
                      </h2>
                      <p className="text-xs text-slate-600">
                        Granular hourly ledger for {selectedDate}. Exportable to RFC 4180 CSV.
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border-2 border-[#3A0F34] bg-white px-2 py-1 text-xs font-bold brutal-shadow-sm"
                      >
                        <option value="all">ALL STATUSES</option>
                        <option value="matched">MATCHED ONLY</option>
                        <option value="missing_forecast">MISSING FORECAST</option>
                        <option value="missing_actual">MISSING ACTUAL</option>
                      </select>

                      <button
                        type="button"
                        onClick={triggerExport}
                        className="px-4 py-1.5 bg-[#EAAA00] text-[#3A0F34] text-xs font-bold brutal-btn flex items-center space-x-1"
                      >
                        <span>[ EXPORT AUDIT CSV ]</span>
                      </button>
                    </div>
                  </div>

                  {/* Table with stable layout without flickering scrollbars */}
                  <div className="bg-white border-2 border-[#3A0F34] brutal-shadow teletype-table-container">
                    <table className="w-full text-left text-xs font-mono min-w-full table-fixed">
                      <thead className="bg-[#DDE3E8] text-[#3A0F34] border-b-2 border-[#3A0F34]">
                        <tr>
                          <th
                            className="w-[18%] py-2.5 px-3 font-bold cursor-pointer hover:bg-slate-300"
                            onClick={() => {
                              setSortField('delivery_hour');
                              setSortAsc(!sortAsc);
                            }}
                          >
                            HOUR (UTC) {sortField === 'delivery_hour' ? (sortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th className="w-[16%] py-2.5 px-3 font-bold text-right">FORECAST (MW)</th>
                          <th className="w-[16%] py-2.5 px-3 font-bold text-right">ACTUAL (MW)</th>
                          <th
                            className="w-[17%] py-2.5 px-3 font-bold text-right cursor-pointer hover:bg-slate-300"
                            onClick={() => {
                              setSortField('error_mw');
                              setSortAsc(!sortAsc);
                            }}
                          >
                            ERROR (MW) {sortField === 'error_mw' ? (sortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th
                            className="w-[17%] py-2.5 px-3 font-bold text-right cursor-pointer hover:bg-slate-300"
                            onClick={() => {
                              setSortField('absolute_error_mw');
                              setSortAsc(!sortAsc);
                            }}
                          >
                            |ERROR| (MW) {sortField === 'absolute_error_mw' ? (sortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th className="w-[16%] py-2.5 px-3 font-bold text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-slate-100">
                        {displayedObservations.map((obs, idx) => (
                          <tr key={`raw-row-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-bold text-[#3A0F34]">
                              {String(obs.delivery_hour).padStart(2, '0')}:00 UTC
                            </td>
                            <td className="py-2 px-3 text-right font-bold">
                              {obs.forecast_mw !== null ? `${obs.forecast_mw.toFixed(1)}` : '--'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold">
                              {obs.actual_mw !== null ? `${obs.actual_mw.toFixed(1)}` : '--'}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-bold ${
                                (obs.error_mw ?? 0) >= 0 ? 'text-[#EAAA00]' : 'text-[#3A0F34]'
                              }`}
                            >
                              {obs.error_mw !== null ? `${obs.error_mw > 0 ? '+' : ''}${obs.error_mw.toFixed(1)}` : '--'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {obs.absolute_error_mw !== null ? `${obs.absolute_error_mw.toFixed(1)}` : '--'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold border ${
                                  obs.status === 'matched'
                                    ? 'bg-[#3A0F34] text-[#EAAA00] border-[#3A0F34]'
                                    : 'bg-rose-100 text-rose-800 border-rose-800'
                                }`}
                              >
                                [{obs.status.replace('_', ' ')}]
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      )}

      {/* 6. CONTACT MODAL (DIRECT API DISPATCH & NO BLANK TABS) */}
      {contactOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#3A0F34] p-6 max-w-lg w-full brutal-shadow space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#3A0F34] pb-3">
              <span className="font-bold text-xs uppercase text-[#3A0F34]">
                [ TRADING DESK COMMUNICATIONS ]
              </span>
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className="text-xs font-bold text-rose-800 hover:text-black cursor-pointer"
              >
                [ CLOSE ✕ ]
              </button>
            </div>

            <div>
              <h3 className="font-display font-bold text-xl text-[#3A0F34]">
                DIRECT TRANSMISSION: HARSHIT BAGGA
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Lead Systems & Energy Analytics Engineer. For utility deployment or technical assessment:
              </p>
              <div className="text-xs font-bold text-[#EAAA00] bg-[#3A0F34] px-3 py-1.5 mt-2 inline-block">
                harshitbagga34@gmail.com
              </div>
            </div>

            {contactReceipt ? (
              <div className="bg-[#DDE3E8] border-2 border-[#3A0F34] p-4 text-xs space-y-3">
                <div className="font-bold text-emerald-800 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-700 rounded-full inline-block"></span>
                  <span>[ TRANSMISSION DELIVERED &amp; LOGGED ]</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] bg-white p-3 border border-[#3A0F34]">
                  <div>RECEIPT AUDIT ID: <strong>{contactReceipt.receipt_id}</strong></div>
                  <div>RECIPIENT: <strong>{contactReceipt.recipient}</strong></div>
                  <div>STATUS: <strong>DELIVERED (HTTP 200)</strong></div>
                  <div>TIMESTAMP: <strong>{new Date(contactReceipt.timestamp).toUTCString()}</strong></div>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Your inquiry was successfully registered on the WindSight dispatch server.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=harshitbagga34@gmail.com&su=${encodeURIComponent(`WindSight Inquiry: ${contactOrg || contactName}`)}&body=${encodeURIComponent(contactMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#EAAA00] text-[#3A0F34] font-bold text-xs brutal-btn inline-block"
                  >
                    [ OPEN IN GMAIL WEB ]
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setContactReceipt(null);
                      setContactMsg('');
                    }}
                    className="px-3 py-1.5 bg-white text-[#3A0F34] border border-[#3A0F34] font-bold text-xs"
                  >
                    COMPOSE ANOTHER
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactOpen(false)}
                    className="px-3 py-1.5 bg-[#3A0F34] text-white font-bold text-xs ml-auto"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3 text-xs">
                {contactError && (
                  <div className="p-2 bg-rose-100 text-rose-800 border border-rose-800 font-bold">
                    [ERROR: {contactError}]
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">YOUR NAME</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full border-2 border-[#3A0F34] p-2 focus:ring-2 focus:ring-[#EAAA00] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">YOUR EMAIL</label>
                  <input
                    type="email"
                    required
                    value={contactSenderEmail}
                    onChange={(e) => setContactSenderEmail(e.target.value)}
                    placeholder="e.g. desk@ukutility.co.uk"
                    className="w-full border-2 border-[#3A0F34] p-2 focus:ring-2 focus:ring-[#EAAA00] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ORGANIZATION</label>
                  <input
                    type="text"
                    value={contactOrg}
                    onChange={(e) => setContactOrg(e.target.value)}
                    placeholder="e.g. Day-Ahead Trading Desk"
                    className="w-full border-2 border-[#3A0F34] p-2 focus:ring-2 focus:ring-[#EAAA00] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">DISPATCH MESSAGE</label>
                  <textarea
                    rows={3}
                    required
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    placeholder="Specify inquiry, data audit question, or deployment scope..."
                    className="w-full border-2 border-[#3A0F34] p-2 focus:ring-2 focus:ring-[#EAAA00] outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=harshitbagga34@gmail.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3A0F34] hover:underline font-bold text-[11px]"
                  >
                    ↗ Open Gmail Web directly
                  </a>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setContactOpen(false)}
                      className="px-3 py-1.5 bg-white border border-[#3A0F34] font-bold text-slate-600"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={contactSubmitting}
                      className="px-4 py-1.5 bg-[#EAAA00] text-[#3A0F34] font-bold brutal-btn disabled:opacity-50"
                    >
                      {contactSubmitting ? '[ DISPATCHING... ]' : '[ DISPATCH VIA API ]'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. PRIVACY POLICY MODAL */}
      {privacyOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#3A0F34] p-6 max-w-xl w-full brutal-shadow space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#3A0F34] pb-3">
              <span className="font-bold text-xs uppercase text-[#3A0F34]">
                [ TRANSPARENCY &amp; PRIVACY NOTICE ]
              </span>
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="text-xs font-bold text-rose-800 hover:text-black cursor-pointer"
              >
                [ CLOSE ✕ ]
              </button>
            </div>

            <h3 className="font-display font-bold text-lg text-[#3A0F34]">
              DATA HANDLING &amp; OPERATIONAL PRIVACY
            </h3>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed font-sans">
              <p>
                <strong>1. Permitted Public Datasets:</strong> WindSight consumes strictly open, official national electricity market telemetry from Elexon BMRS (FUELHH half-hourly generation outturns and WINDFOR day-ahead wind forecasts). No proprietary trading bids or commercial market transactions are gathered.
              </p>
              <p>
                <strong>2. Zero Personal Tracker Cookies:</strong> This application operates strictly as a zero-surveillance analytical console. No tracking pixels, advertiser trackers, or sellable behavioral dossiers are maintained.
              </p>
              <p>
                <strong>3. Regulatory Compliance:</strong> Engineered in conformity with UK REMIT directives and open grid transparency principles.
              </p>
              <p>
                <strong>4. Direct Contact:</strong> For security reports or inquiries, email Lead Engineer Harshit Bagga at <strong className="text-[#3A0F34]">harshitbagga34@gmail.com</strong>.
              </p>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="px-4 py-1.5 bg-[#3A0F34] text-white text-xs font-bold brutal-btn"
              >
                [ ACKNOWLEDGE ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. FOOTER WITH HARSHIT BAGGA SIGNATURE */}
      <footer className="border-t-2 border-[#3A0F34] bg-[#3A0F34] text-[#DDE3E8] p-6 text-xs font-mono mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-display font-black text-base text-[#EAAA00]">WINDSIGHT</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-200">UK POWER DISPATCH TELETYPE</span>
            </div>
            <div className="text-slate-300 text-[11px]">
              Engineered &amp; Authored by <strong className="text-[#EAAA00]">Harshit Bagga</strong>
            </div>
            <div className="text-slate-400 text-[10px]">
              Direct Inquiries: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=harshitbagga34@gmail.com" target="_blank" rel="noreferrer" className="underline hover:text-white">harshitbagga34@gmail.com</a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => {
                setContactReceipt(null);
                setContactError(null);
                setContactOpen(true);
              }}
              className="text-[#EAAA00] hover:text-white underline font-bold"
            >
              [ CONTACT DESK ]
            </button>
            <span className="text-slate-500">|</span>
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="text-slate-300 hover:text-white underline"
            >
              [ PRIVACY POLICY ]
            </button>
            <span className="text-slate-500">|</span>
            <div className="border border-[#EAAA00] px-2 py-1 text-[10px] text-[#EAAA00] font-bold">
              [ VERIFIED ARCHITECTURE: HARSHIT BAGGA ]
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}

// Wrap with ErrorBoundary as default export
export default function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
