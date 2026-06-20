import Header from "@/components/Navbar";
import ReduxProvider from "@/components/Provider";
import RouteGuard from "@/components/RouteGuard";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import axios from "axios";

export default function App({ Component, pageProps }: AppProps) {
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth > 768); // tablet size max.
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;

    const checkHealth = async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const healthUrl = apiBase ? (apiBase.endsWith("/") ? `${apiBase}health` : `${apiBase}/health`) : "/api/health";

      try {
        const res = await axios.get(healthUrl, { timeout: 4000 });
        if (res.status === 200 && active) {
          setIsAwake(true);
          setIsWaking(false);
        }
      } catch (err) {
        if (!active) return;
        setIsWaking(true);
        timer = setTimeout(checkHealth, 2500);
      }
    };

    checkHealth();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (!isAwake) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center select-none relative overflow-hidden font-sans">
        {/* Glowing background shapes */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: "1s" }}></div>

        <div className="relative z-10 max-w-sm w-full bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/85 rounded-[32px] p-8 shadow-2xl flex flex-col items-center">
          {/* Animated Spinner with outer pulsing ring */}
          <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-zinc-850 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-emerald-400 border-r-emerald-400/30 border-b-emerald-400/10 border-l-emerald-400/50 rounded-full animate-spin"></div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
          </div>

          <h2 className="text-lg font-bold text-zinc-100 tracking-tight mb-2">
            {isWaking ? "Waking Up Server..." : "Connecting to Portal..."}
          </h2>

          <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
            <p>
              Establishing connection with the database & API gateway.
            </p>
            {isWaking && (
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 text-emerald-450 text-left space-y-1.5 animate-fadeIn">
                <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-400">💡 Free Tier Cold Start</span>
                On Render's free tier, servers sleep after 15 minutes of inactivity. Waking up the server takes about 30 to 50 seconds.
              </div>
            )}
            <p className="text-[10px] text-zinc-600 pt-2 border-t border-zinc-850 font-medium">
              The portal will load automatically once the server wakes up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLargeScreen) {
    return (
      <ReduxProvider>
        <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="mb-4 text-center">
            <h1 className="text-xl font-bold text-white font-display">Follow Up Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Mobile View Simulation</p>
          </div>

          <div className="relative w-full max-w-[400px] h-[85vh] rounded-[48px] border-[10px] border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col" style={{ transform: "translate3d(0, 0, 0)" }}>
            {/* Camera notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-b-2xl z-40 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-700 rounded-full mb-1"></div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden dark bg-zinc-950 text-zinc-100">
              <div className="nav shrink-0 h-[65px]">
                <Header />
              </div>
              <div className="body flex-1 overflow-auto bg-zinc-950/20 h-[calc(100%-65px)] overflow-auto">
                <RouteGuard>
                  <Component {...pageProps} />
                </RouteGuard>
              </div>
            </div>
          </div>
        </div>
      </ReduxProvider>
    );
  }

  return (
    <>
      <ReduxProvider>
        <div className="dark bg-zinc-950 text-zinc-100 min-h-screen flex flex-col">
          <div className="nav shrink-0 h-[65px]">
            <Header />
          </div>
          <div
            className="body flex-1 overflow-auto bg-zinc-950/20 h-[calc(100%-65px)] overflow-auto"
          >
            <RouteGuard>
              <Component {...pageProps} />
            </RouteGuard>
          </div>
        </div>
      </ReduxProvider>
    </>
  );
}
