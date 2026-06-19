"use client";
import React, { useState } from "react";
import { Phone, X } from "lucide-react";

export default function CustomerTable({ list, onEdit, liveCallingStates = {}, hideResponses = false, users = [] }: any) {
  const [popupCustomer, setPopupCustomer] = useState<any>(null);

  const getResponseBadge = (response: string) => {
    switch (response?.toLowerCase()) {
      case "comes to youth class":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-full">
            Comes to class
          </span>
        );
      case "try to come":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 rounded-full">
            Try to come
          </span>
        );
      case "out of station":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 rounded-full">
            Out of station
          </span>
        );
      case "excuse":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-300 border border-slate-100 dark:border-zinc-700/50 rounded-full">
            Excuse
          </span>
        );
      case "no":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-full">
            No
          </span>
        );
      case "not picked up":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-full">
            No Answer
          </span>
        );
      default:
        return null;
    }
  };

  const handleBadgeClick = (e: React.MouseEvent, customer: any) => {
    e.stopPropagation();
    setPopupCustomer(customer);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-neutral-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-premium">
        <table className="min-w-full text-sm premium-table">
          <thead>
            <tr className="bg-neutral-50/50 dark:bg-zinc-950/40 border-b border-neutral-100 dark:border-zinc-800/80">
              <th className="text-left font-semibold text-neutral-500 dark:text-zinc-400">Name</th>
              {!hideResponses && (
                <th className="text-left font-semibold text-neutral-500 dark:text-zinc-400">Status / Response</th>
              )}
              <th className="text-right font-semibold text-neutral-500 dark:text-zinc-400">Action</th>
            </tr>
          </thead>

          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={hideResponses ? 2 : 3} className="text-center text-neutral-400 dark:text-zinc-500 py-12 italic">
                  No customers found.
                </td>
              </tr>
            ) : (
              list.map((c: any) => {
                // Check global live states or fallback to customer DB states
                const isCallingLocally = liveCallingStates[c._id]?.status === "calling" || c.callingStatus === "calling";
                const callingUser = liveCallingStates[c._id]?.callingBy || c.callingBy;

                // Map assigned doer names from users list
                const assignedDoers = c.whoCanFollowUp
                  ? c.whoCanFollowUp
                      .map((uid: string) => users.find((u: any) => u._id === uid))
                      .filter(Boolean)
                  : [];

                return (
                  <tr
                    key={c._id}
                    onClick={() => onEdit(c)}
                    className="hover:bg-neutral-50/30 dark:hover:bg-zinc-800/30 border-b border-neutral-100 dark:border-zinc-800/50 last:border-none transition-colors cursor-pointer group"
                  >
                    <td className="font-medium text-neutral-805 dark:text-zinc-100">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {c.name}
                          </span>

                          {/* Assigned Doer Initials Badges */}
                          {assignedDoers.length > 0 && (
                            <div
                              onClick={(e) => handleBadgeClick(e, c)}
                              className="flex items-center -space-x-1 ml-1 cursor-pointer hover:opacity-80 transition shrink-0"
                            >
                              {assignedDoers.slice(0, 2).map((doer: any) => (
                                <span
                                  key={doer._id}
                                  title={doer.name}
                                  className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200/50 dark:border-indigo-900/50 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-[9px] font-bold uppercase shrink-0 shadow-sm"
                                >
                                  {doer.name.charAt(0)}
                                </span>
                              ))}
                              {assignedDoers.length > 2 && (
                                <span
                                  title="More doers"
                                  className="w-5 h-5 rounded-full bg-zinc-105 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 flex items-center justify-center text-[8px] font-extrabold shrink-0"
                                >
                                  ...
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-neutral-450 dark:text-zinc-500 font-normal mt-0.5">{c.phoneNumber}</span>
                      </div>
                    </td>
                    {!hideResponses && (
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isCallingLocally ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-full animate-pulse flex items-center gap-1">
                              <Phone size={10} className="animate-bounce" />
                              <span>{callingUser} is calling...</span>
                            </span>
                          ) : (
                            c.lastCallResponse && c.lastCallResponse !== "pending" && getResponseBadge(c.lastCallResponse)
                          )}
                          
                          {!isCallingLocally && (!c.lastCallResponse || c.lastCallResponse === "pending") && (
                            <span className="text-[10px] font-medium px-2 py-0.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-500 rounded-full">
                              Pending Call
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(c);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 duration-200"
                      >
                        View Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Doer details Popover Modal */}
      {popupCustomer && (
        <div
          onClick={() => setPopupCustomer(null)}
          className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 w-full max-w-sm p-6 rounded-2xl shadow-xl overflow-hidden animate-slideUp"
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-100 dark:border-zinc-800/80">
              <div>
                <h3 className="font-semibold text-neutral-805 dark:text-zinc-100 text-base">Assigned Doers</h3>
                <p className="text-xs text-neutral-450 dark:text-zinc-500 mt-0.5">Volunteers tracking {popupCustomer.name}</p>
              </div>
              <button
                onClick={() => setPopupCustomer(null)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition text-neutral-400 dark:text-zinc-550 hover:text-neutral-600 dark:hover:text-zinc-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[240px] overflow-y-auto scrollable-content py-1">
              {(popupCustomer.whoCanFollowUp || [])
                .map((uid: string) => users.find((u: any) => u._id === uid))
                .filter(Boolean)
                .map((doer: any) => (
                  <div
                    key={doer._id}
                    className="flex items-center gap-3 p-2.5 border border-neutral-100 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/20 rounded-xl"
                  >
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold uppercase shrink-0">
                      {doer.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-800 dark:text-zinc-200 text-xs truncate">{doer.name}</p>
                      <p className="text-[10px] text-neutral-450 dark:text-zinc-500 font-medium font-sans mt-0.5">{doer.phoneNumber}</p>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-6 border-t border-neutral-100 dark:border-zinc-800 pt-4 flex justify-end">
              <button
                onClick={() => setPopupCustomer(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-semibold transition active:scale-95 duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
