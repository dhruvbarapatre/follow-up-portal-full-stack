import React from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function Custom404() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
      <div className="neumorphic-card p-8 sm:p-10 max-w-md w-full flex flex-col items-center space-y-6 bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-650 dark:text-indigo-400 shadow-sm">
          <AlertCircle size={32} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-neutral-800 dark:text-zinc-100 tracking-tight font-display">404</h1>
          <h2 className="text-base font-bold text-neutral-700 dark:text-zinc-300">Page Not Found</h2>
          <p className="text-xs text-neutral-450 dark:text-zinc-500 leading-relaxed font-sans max-w-xs mx-auto">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        <Link href="/" className="w-full">
          <button className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-md shadow-indigo-950/50 neumorphic-btn">
            Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
