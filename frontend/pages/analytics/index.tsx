"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { BarChart3, Users, Calendar, Award, ArrowUpRight, TrendingUp, CheckCircle, Percent, AlertCircle } from "lucide-react";
import API from "@/components/apiClient";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Customer {
  _id: string;
  name: string;
  lastCallResponse: string;
}

interface EventInvite {
  _id: string;
  customerId: any;
  status: string;
  response: string;
  attended: boolean;
}

interface Program {
  _id: string;
  title: string;
  date: string;
  invitedCustomers: EventInvite[];
}

export default function AnalyticsPage() {
  const auth = useSelector((s: any) => s.auth);
  
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [custRes, userRes, progRes] = await Promise.all([
          API.getAllCustomers(),
          API.getAllUsers(auth.token),
          API.getPrograms()
        ]);
        
        setCustomers(custRes.data.data || []);
        setUsers(userRes.data.data || []);
        setPrograms(progRes.data.data || []);
      } catch (err) {
        toast.error("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [auth.token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Calculations
  const totalYouth = customers.length;
  const totalVolunteers = users.filter(u => u.role !== "superAdmin").length || 1;
  const ratio = (totalYouth / totalVolunteers).toFixed(1);

  // Response distribution from all customers
  const responseCounts: Record<string, number> = {
    "yes, coming": 0,
    "try to come": 0,
    "out of station": 0,
    "excuse": 0,
    "no": 0,
    "not picked up": 0,
    "pending": 0
  };

  customers.forEach(c => {
    const resp = c.lastCallResponse?.toLowerCase() || "pending";
    if (resp in responseCounts) {
      responseCounts[resp]++;
    } else {
      responseCounts["pending"]++;
    }
  });

  const totalResponded = Object.entries(responseCounts)
    .filter(([k]) => k !== "pending")
    .reduce((sum, [_, val]) => sum + val, 0);

  // Attendance metrics
  let totalInvited = 0;
  let totalAttended = 0;
  programs.forEach(p => {
    if (p.invitedCustomers) {
      totalInvited += p.invitedCustomers.length;
      totalAttended += p.invitedCustomers.filter(ic => ic.attended).length;
    }
  });

  const avgAttendanceRate = totalInvited > 0 ? Math.round((totalAttended / totalInvited) * 100) : 0;

  // Clean Labels
  const responseLabels: Record<string, string> = {
    "yes, coming": "yes, coming",
    "try to come": "Try to come",
    "out of station": "Out of station",
    "excuse": "Excuse / Busy",
    "no": "No",
    "not picked up": "No Answer",
    "pending": "Pending Feedback"
  };

  const responseColors: Record<string, string> = {
    "yes, coming": "bg-emerald-500",
    "try to come": "bg-sky-500",
    "out of station": "bg-amber-500",
    "excuse": "bg-slate-400",
    "no": "bg-rose-500",
    "not picked up": "bg-indigo-500",
    "pending": "bg-neutral-400"
  };

  return (
    <div className="p-5 sm:p-6 space-y-6 animate-fadeIn pb-12">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-zinc-800/80">
        <div>
          <h1 className="text-lg font-bold text-neutral-800 dark:text-zinc-100 font-display uppercase tracking-tight flex items-center gap-2">
            <BarChart3 className="text-indigo-500" size={20} /> Analytics Dashboard
          </h1>
          <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">Real-time statistics & engagement metrics</p>
        </div>
      </div>

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* STAT 1: YOUTH */}
        <div className="p-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-neutral-100 dark:border-zinc-800/80 rounded-2xl shadow-premium flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-zinc-550">Total Youth</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Users size={14} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-neutral-850 dark:text-zinc-100">{totalYouth}</h3>
            <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
              <TrendingUp size={10} className="text-emerald-500" /> Managed community members
            </p>
          </div>
        </div>

        {/* STAT 2: VOLUNTEERS */}
        <div className="p-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-neutral-100 dark:border-zinc-800/80 rounded-2xl shadow-premium flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-zinc-550">Volunteers</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Award size={14} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-neutral-850 dark:text-zinc-100">{totalVolunteers}</h3>
            <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1">Active follow-up doers</p>
          </div>
        </div>

        {/* STAT 3: RATIO */}
        <div className="p-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-neutral-100 dark:border-zinc-800/80 rounded-2xl shadow-premium flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-zinc-550">Youth per Doer</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Percent size={14} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-neutral-850 dark:text-zinc-100">{ratio}</h3>
            <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1">Volunteers assignment ratio</p>
          </div>
        </div>

        {/* STAT 4: ATTENDANCE */}
        <div className="p-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-neutral-100 dark:border-zinc-800/80 rounded-2xl shadow-premium flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-zinc-550">Avg Attendance</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={14} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-neutral-850 dark:text-zinc-100">{avgAttendanceRate}%</h3>
            <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1">Across all scheduled programs</p>
          </div>
        </div>
      </div>

      {/* GRAPHIC CHARTS & DETAILS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CHART: CALL RESPONSES (CUSTOM SVG VISUALS) */}
        <div className="p-5 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-lg border border-neutral-100 dark:border-zinc-800/80 rounded-2xl shadow-premium space-y-4">
          <div>
            <h3 className="text-xs font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
              Call Responses Distribution
            </h3>
            <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-0.5">Based on latest feedback updates</p>
          </div>

          <div className="space-y-3.5 pt-2">
            {Object.entries(responseCounts).map(([key, count]) => {
              const percentage = totalYouth > 0 ? Math.round((count / totalYouth) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-700 dark:text-zinc-300">{responseLabels[key]}</span>
                    <span className="text-neutral-500 dark:text-zinc-400 font-sans">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  {/* Glass progress bar */}
                  <div className="h-2 w-full bg-neutral-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${responseColors[key]}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LIST: LATEST EVENTS ENGAGEMENT */}
        <div className="p-5 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-lg border border-neutral-100 dark:border-zinc-800/80 rounded-2xl shadow-premium space-y-4 flex flex-col">
          <div>
            <h3 className="text-xs font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
              Recent Event Metrics
            </h3>
            <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-0.5">Performance of past 5 scheduled events</p>
          </div>

          <div className="space-y-3 pt-2 overflow-y-auto max-h-[300px] grow scrollable-content">
            {programs.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-zinc-550 italic text-center py-12">
                No events found to display metrics.
              </p>
            ) : (
              [...programs]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map(prog => {
                  const invited = prog.invitedCustomers?.length || 0;
                  const attended = prog.invitedCustomers?.filter(c => c.attended).length || 0;
                  const rate = invited > 0 ? Math.round((attended / invited) * 100) : 0;

                  return (
                    <div
                      key={prog._id}
                      className="p-3 bg-neutral-50/50 dark:bg-zinc-950/20 border border-neutral-100 dark:border-zinc-800/50 rounded-xl flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-semibold text-neutral-800 dark:text-zinc-200 text-xs truncate">
                          {prog.title}
                        </p>
                        <p className="text-[10px] text-neutral-400 dark:text-zinc-500 font-sans mt-0.5">
                          {new Date(prog.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="text-right font-sans">
                          <p className="text-[10px] text-neutral-400 dark:text-zinc-550">Checked In</p>
                          <p className="text-xs font-bold text-neutral-700 dark:text-zinc-300">
                            {attended} / {invited}
                          </p>
                        </div>
                        {/* Circular ring style check */}
                        <div className="w-10 h-10 rounded-full border border-neutral-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-zinc-900 shadow-sm shrink-0">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            {rate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      <ToastContainer position="bottom-left" autoClose={3000} />
    </div>
  );
}
