import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Calendar, CheckCircle2, UserPlus, Heart, Search, ClipboardList, Check, AlertCircle, X, Save, Users } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import API from "@/components/apiClient";
import AssignModal from "../../components/my-list-com/AssignModal";
import { normalizePhone } from "@/lib/phoneUtils";
import { getSocket } from "@/lib/socket";
import "react-toastify/dist/ReactToastify.css";
import ModalWrapper from "@/components/ModalWrapper";

interface Customer {
  _id: string;
  name: string;
  phoneNumber: string;
}

interface EventInvite {
  _id?: string;
  customerId: Customer | null;
  status: string;
  response: string;
  callingBy: string;
  attended: boolean;
}

interface Program {
  _id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  invitedCustomers: EventInvite[];
}

export default function AttendanceManager() {
  const auth = useSelector((s: any) => s.auth);
  const currentUser = auth?.user;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  // All registered youth for adding to attendance
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  // Modal States
  const [selectedEvent, setSelectedEvent] = useState<Program | null>(null);
  const [localInvites, setLocalInvites] = useState<EventInvite[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Attendees Sub-Modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phoneNumber: "",
  });

  const fetchEventsAndAttendance = async () => {
    try {
      const res = await API.getPrograms();
      const list: Program[] = res.data.data || [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setPrograms(sorted);
    } catch (err) {
      toast.error("Failed to load attendance information");
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const res = await API.getAllCustomers();
      setAllCustomers(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch all customers", err);
    }
  };

  useEffect(() => {
    if (!auth?.token) return;
    setLoading(true);
    const promises = [fetchEventsAndAttendance(), fetchAllCustomers()];
    Promise.all(promises).finally(() => {
      setLoading(false);
    });
  }, [auth?.token]);

  // Sync selectedEvent updates seamlessly via sockets if no local changes
  useEffect(() => {
    if (selectedEvent && !hasChanges) {
      const updatedEvent = programs.find(p => p._id === selectedEvent._id);
      if (updatedEvent) {
        setSelectedEvent(updatedEvent);
        setLocalInvites(JSON.parse(JSON.stringify(updatedEvent.invitedCustomers)));
      }
    }
  }, [programs]);

  // WebSockets sync
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleUpdate = () => {
      fetchEventsAndAttendance();
      fetchAllCustomers();
    };

    socket.on("attendance-update", handleUpdate);
    socket.on("customer-update", handleUpdate);
    socket.on("event-update", handleUpdate);

    return () => {
      socket.off("attendance-update", handleUpdate);
      socket.off("customer-update", handleUpdate);
      socket.off("event-update", handleUpdate);
    };
  }, []);

  const handleOpenEventModal = (program: Program) => {
    setSelectedEvent(program);
    setLocalInvites(JSON.parse(JSON.stringify(program.invitedCustomers)));
    setHasChanges(false);
    setSearchQuery("");
  };

  const handleCloseEventModal = () => {
    if (hasChanges) {
      if (!window.confirm("You have unsaved check-ins. Are you sure you want to discard them?")) {
        return;
      }
    }
    setSelectedEvent(null);
    setLocalInvites([]);
    setHasChanges(false);
  };

  const handleToggleAttendance = (customerId: string, currentStatus: boolean) => {
    if (!selectedEvent) return;

    const wasInvitedOriginally = selectedEvent.invitedCustomers.some(
      (ic) => ic.customerId && (ic.customerId?._id || (ic as any).customerId) === customerId
    );

    const existsInLocal = localInvites.some(
      (ic) => ic.customerId && (ic.customerId?._id || (ic as any).customerId) === customerId
    );

    let updated: EventInvite[];
    if (currentStatus) {
      // Checking out
      if (wasInvitedOriginally) {
        updated = localInvites.map((ic) => {
          const cid = ic.customerId && (ic.customerId?._id || (ic as any).customerId);
          if (cid === customerId) {
            return { ...ic, attended: false };
          }
          return ic;
        });
      } else {
        updated = localInvites.filter((ic) => {
          const cid = ic.customerId && (ic.customerId?._id || (ic as any).customerId);
          return cid !== customerId;
        });
      }
    } else {
      // Checking in
      if (existsInLocal) {
        updated = localInvites.map((ic) => {
          const cid = ic.customerId && (ic.customerId?._id || (ic as any).customerId);
          if (cid === customerId) {
            return { ...ic, attended: true };
          }
          return ic;
        });
      } else {
        const custObj = allCustomers.find((c) => c._id === customerId);
        updated = [
          ...localInvites,
          {
            customerId: custObj || null,
            status: "called",
            response: "yes, coming",
            callingBy: currentUser?.name || "Admin",
            attended: true,
          },
        ];
      }
    }

    setLocalInvites(updated);
    setHasChanges(true);
  };

  const isCustomerInLocalInvites = (customerId: string) => {
    return localInvites.some(ic => {
      const cid = ic.customerId?._id || (ic as any).customerId;
      return cid?.toString() === customerId.toString();
    });
  };

  const handleConfirmModalAdditions = () => {
    if (selectedExistingIds.length === 0) {
      setShowAddForm(false);
      return;
    }

    let newlyAdded: EventInvite[] = [];

    selectedExistingIds.forEach(id => {
      const cust = allCustomers.find(c => c._id === id);
      if (cust && !isCustomerInLocalInvites(id)) {
        newlyAdded.push({
          customerId: cust,
          status: "called",
          response: "yes, coming",
          callingBy: currentUser?.name || "Admin",
          attended: true, // Auto check-in if added from attendance sheet
        });
      }
    });

    if (newlyAdded.length > 0) {
      setLocalInvites([...localInvites, ...newlyAdded]);
      setHasChanges(true);
    }

    setSelectedExistingIds([]);
    setModalSearchQuery("");
    setShowAddForm(false);
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizePhone(newCustomerForm.phoneNumber);
    if (!newCustomerForm.name || !normalizedPhone || !selectedEvent) {
      toast.error("Please enter a valid name and phone number");
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const payload = {
        ...newCustomerForm,
        phoneNumber: normalizedPhone,
        adderId: currentUser?.id,
        typeOfCustomer: "Youth",
        status: "new"
      };
      await API.addCustomer(payload);

      // Emit socket notification
      try {
        const socket = getSocket();
        socket.connect();
        socket.emit("customer-update", { name: payload.name });
        socket.emit("new-notification", {
          type: "new-youth",
          message: `🆕 New youth registered: '${payload.name}' by ${currentUser?.name || "Admin"}`,
          createdAt: new Date(),
          customerName: payload.name,
        });
      } catch (sockErr) {
        console.error("Socket emit failed", sockErr);
      }

      // Refresh customers to get the new ID
      const allCustRes = await API.getAllCustomers();
      const latestList = allCustRes.data.data || [];
      setAllCustomers(latestList);

      const newCust = latestList.find((c: Customer) => c.phoneNumber === payload.phoneNumber && c.name === payload.name);

      if (newCust && !isCustomerInLocalInvites(newCust._id)) {
        const newInvite: EventInvite = {
          customerId: newCust,
          status: "called",
          response: "yes, coming",
          callingBy: currentUser?.name || "Admin",
          attended: true
        };
        setLocalInvites(prev => [...prev, newInvite]);
        setHasChanges(true);
      }

      setNewCustomerForm({ name: "", phoneNumber: "" });
      toast.success("New youth registered & checked in!");
      setShowNewForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to register youth");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleSaveAllChanges = async () => {
    if (!selectedEvent) return;
    setAddLoading(true);

    try {
      const apiInvites = localInvites.map(ic => ({
        ...ic,
        customerId: ic.customerId?._id || ic.customerId,
      }));

      await API.updateProgram({
        id: selectedEvent._id,
        invitedCustomers: apiInvites,
      });

      const socket = getSocket();
      socket.emit("attendance-update", { eventId: selectedEvent._id });
      socket.emit("event-update", { type: "update", id: selectedEvent._id });

      toast.success("Attendance saved successfully!");
      setHasChanges(false);

      // Update local state smoothly
      fetchEventsAndAttendance();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save attendance.");
    } finally {
      setAddLoading(false);
    }
  };

  // Map all customers in the database to their attendance state for the current selected event
  const displayItems = allCustomers.map((c) => {
    const invite = localInvites.find(
      (ic) => ic.customerId && (ic.customerId?._id || (ic as any).customerId) === c._id
    );
    return {
      customerId: c,
      status: invite ? invite.status : "invited",
      response: invite ? invite.response : "pending",
      callingBy: invite ? invite.callingBy : "",
      attended: invite ? invite.attended : false,
      _id: invite?._id,
    };
  });

  const filteredDisplayItems = displayItems.filter((item) =>
    item.customerId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const attendedList = filteredDisplayItems.filter((item) => item.attended);
  const invitedPendingList = filteredDisplayItems.filter((item) => !item.attended);

  const availableYouth = allCustomers.filter(c =>
    !isCustomerInLocalInvites(c._id) &&
    c.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  const renderRow = (ic: EventInvite, isCheckedIn: boolean) => {
    const c = ic.customerId;
    if (!c) return null;
    const cid = c._id || (ic as any).customerId;

    const original = selectedEvent?.invitedCustomers.find(e => (e.customerId?._id || (e as any).customerId) === cid);
    const isPending = !original || original.attended !== ic.attended;

    return (
      <div
        key={cid}
        onClick={() => handleToggleAttendance(cid, ic.attended)}
        className={`p-3 bg-white dark:bg-zinc-900 border rounded-xl flex justify-between items-center cursor-pointer transition group ${isCheckedIn
          ? "border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700"
          : "border-neutral-100 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700"
          }`}
      >
        <div>
          <p className="font-bold text-neutral-800 dark:text-zinc-100 text-xs flex items-center gap-2">
            {c.name}
            {isPending && <span className="text-[8px] uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full font-black">Modified</span>}
          </p>
          <p className="text-[10px] text-neutral-400 dark:text-zinc-500 font-sans mt-0.5">{c.phoneNumber}</p>
        </div>

        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isCheckedIn
          ? "bg-emerald-500 text-white group-hover:bg-rose-500"
          : "bg-neutral-100 dark:bg-zinc-800 text-neutral-300 dark:text-zinc-600 group-hover:bg-indigo-500 group-hover:text-white"
          }`}>
          {isCheckedIn ? (
            <>
              <Check size={14} className="group-hover:hidden" strokeWidth={3} />
              <X size={14} className="hidden group-hover:block" strokeWidth={3} />
            </>
          ) : (
            <Check size={14} strokeWidth={3} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 sm:p-6 space-y-6 pb-24">
      <div className="animate-fadeIn space-y-6">
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-zinc-800/80">
          <div>
            <h1 className="text-lg font-bold text-neutral-800 dark:text-zinc-100 font-display uppercase tracking-tight">Attendance Check-in</h1>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">Select an event below to manage attendance</p>
          </div>
        </div>

        {loading && programs.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-100 dark:border-zinc-800/80 shadow-premium">
            <ClipboardList size={40} className="mx-auto mb-3 text-neutral-300 dark:text-zinc-700" />
            <p className="text-xs text-neutral-500 dark:text-zinc-400 font-semibold">No scheduled events found</p>
            <p className="text-[10px] text-neutral-400 dark:text-zinc-550 mt-1 max-w-[220px] mx-auto leading-relaxed">
              Please schedule an event inside the Event Manager before checking in attendees.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => {
              const checkedInCount = program.invitedCustomers.filter(c => c.attended).length;
              const totalCount = program.invitedCustomers.length;

              return (
                <div
                  key={program._id}
                  onClick={() => handleOpenEventModal(program)}
                  className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800/80 rounded-2xl p-5 shadow-premium hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-xl cursor-pointer transition-all duration-300 group transform active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-neutral-800 dark:text-zinc-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition pr-2">
                      {program.title}
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg whitespace-nowrap border border-indigo-100 dark:border-indigo-800">
                      {new Date(program.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <div className="flex-1 bg-neutral-50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-neutral-100/50 dark:border-zinc-800/40 text-center">
                      <p className="text-[9px] uppercase font-bold text-neutral-400 dark:text-zinc-550 mb-0.5 tracking-wider">
                        Invited
                      </p>
                      <p className="text-base font-black text-indigo-600 dark:text-indigo-400">{totalCount}</p>
                    </div>
                    <div className="flex-1 bg-neutral-50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-neutral-100/50 dark:border-zinc-800/40 text-center">
                      <p className="text-[9px] uppercase font-bold text-neutral-400 dark:text-zinc-550 mb-0.5 tracking-wider">
                        Present
                      </p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{checkedInCount}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MANAGE ATTENDANCE MODAL */}
      {selectedEvent && (
        <ModalWrapper>
          <div className="fixed inset-0 bg-neutral-950/60 dark:bg-neutral-950/80 flex justify-center items-end sm:items-center z-40 p-0 sm:p-4 backdrop-blur-sm transition-all">
          <div
            className="bg-neutral-50 dark:bg-zinc-950 w-full sm:max-w-2xl h-[92dvh] sm:h-auto sm:max-h-[85vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp border border-neutral-200/50 dark:border-zinc-800 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden absolute top-0 left-0 right-0 h-4 flex justify-center items-center z-20 bg-white dark:bg-zinc-900 rounded-t-[2rem]">
              <div className="w-10 h-1 bg-neutral-200 dark:bg-zinc-700 rounded-full mt-2"></div>
            </div>

            <div className="pt-6 sm:pt-5 p-5 border-b border-neutral-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 z-10 shrink-0">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-500 mb-1 block">Manage Attendance</span>
                <h2 className="text-lg font-bold text-neutral-800 dark:text-zinc-100 leading-tight">{selectedEvent.title}</h2>
                <p className="text-[11px] font-semibold text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1 font-sans">
                  <Calendar size={12} /> {new Date(selectedEvent.date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={handleCloseEventModal} className="p-2.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 text-neutral-500">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollable-content relative pb-8 sm:pb-6 pt-0">

              {/* Action Bar */}
              <div className="flex gap-2 sm:gap-3 justify-between sticky top-0 z-10 bg-neutral-50/95 dark:bg-zinc-950/95 backdrop-blur-md pb-3 pt-3 -mt-1">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full premium-input !pl-10 text-xs py-2.5 bg-white dark:bg-zinc-900 shadow-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddForm(true)} className="py-2.5 px-3 sm:px-4 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[11px] sm:text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm whitespace-nowrap border border-indigo-200/50 dark:border-indigo-800/50">
                    <Users size={14} /> Add Existing
                  </button>
                  <button onClick={() => setShowNewForm(true)} className="py-2.5 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-100 dark:shadow-none whitespace-nowrap">
                    <UserPlus size={14} /> Register New
                  </button>
                </div>
              </div>

              {/* Lists Container */}
              <div className="space-y-6">
                {/* Pending Invitees */}
                <div>
                  <h3 className="text-[10px] font-black text-neutral-400 dark:text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    Pending List <span className="bg-neutral-200 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">{invitedPendingList.length}</span>
                  </h3>
                  {invitedPendingList.length === 0 ? (
                    <p className="text-xs text-neutral-400 dark:text-zinc-500 italic p-4 text-center bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/80">
                      No pending attendees.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {invitedPendingList.map(ic => renderRow(ic, false))}
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-200/50 dark:border-zinc-800/50"></div>

                {/* Checked In */}
                <div>
                  <h3 className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    Checked In <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">{attendedList.length}</span>
                  </h3>
                  {attendedList.length === 0 ? (
                    <p className="text-xs text-neutral-400 dark:text-zinc-500 italic p-4 text-center bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/80">
                      Nobody is checked in yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attendedList.map(ic => renderRow(ic, true))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer (Save Button) */}
            {hasChanges && (
              <div className="p-4 sm:p-5 border-t border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-zinc-900 shrink-0 flex gap-3 animate-slideUp shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-6 sm:pb-5">
                <button onClick={() => handleSaveAllChanges()} disabled={addLoading} className="flex-1 py-3.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none">
                  {addLoading ? "Saving..." : <><Save size={18} /> Save Check-ins</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </ModalWrapper>
      )}

      {/* BATCH ADD ATTENDEE SUB-MODAL */}
      {showAddForm && selectedEvent && (
        <ModalWrapper>
          <div
            className="fixed inset-0 bg-neutral-950/60 dark:bg-neutral-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
            onClick={() => setShowAddForm(false)}
          >
          <div
            className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 w-full max-w-sm p-5 sm:p-6 rounded-3xl shadow-2xl overflow-hidden max-h-[85dvh] animate-slideUp flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-800 dark:text-zinc-100">Add Existing Youth</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-zinc-400">Select youth from database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-2 bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-neutral-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-2 space-y-4 scrollable-content">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search youth by name..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full premium-input !pl-10 py-2.5 text-xs bg-neutral-50 dark:bg-zinc-950/40"
                />
              </div>

              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-neutral-400 dark:text-zinc-500 uppercase tracking-widest">
                  Available Youth
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedExistingIds.length === availableYouth.length) {
                      setSelectedExistingIds([]);
                    } else {
                      setSelectedExistingIds(availableYouth.map(c => c._id));
                    }
                  }}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md"
                >
                  {selectedExistingIds.length === availableYouth.length && availableYouth.length > 0 ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="border border-neutral-200/50 dark:border-zinc-800 rounded-xl h-[250px] overflow-y-auto scrollable-content p-2 bg-neutral-50/50 dark:bg-zinc-950/40 space-y-1">
                {availableYouth.length === 0 ? (
                  <p className="text-[10px] text-neutral-400 dark:text-zinc-500 italic text-center py-6">No youth found matching name.</p>
                ) : (
                  availableYouth.map((c) => {
                    const isChecked = selectedExistingIds.includes(c._id);
                    return (
                      <label
                        key={c._id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg text-xs cursor-pointer transition ${isChecked
                          ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                          : "bg-white dark:bg-zinc-900 border border-transparent hover:border-neutral-200 dark:hover:border-zinc-700 text-neutral-700 dark:text-zinc-300 shadow-sm"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedExistingIds(selectedExistingIds.filter(id => id !== c._id));
                            } else {
                              setSelectedExistingIds([...selectedExistingIds, c._id]);
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-bold">{c.name}</p>
                          <p className="text-[10px] opacity-70 font-sans mt-0.5">{c.phoneNumber}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 mt-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirmModalAdditions}
                disabled={selectedExistingIds.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-indigo-50/50 disabled:opacity-50 disabled:active:scale-100"
              >
                <Check size={16} strokeWidth={3} />
                Add {selectedExistingIds.length} Youth
              </button>
            </div>
          </div>
        </div>
      </ModalWrapper>
      )}

      {/* NEW PROFILE SUB-MODAL */}
      {showNewForm && selectedEvent && (
        <ModalWrapper>
          <div
            className="fixed inset-0 bg-neutral-950/60 dark:bg-neutral-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
            onClick={() => setShowNewForm(false)}
          >
          <div
            className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 w-full max-w-sm p-5 sm:p-6 rounded-3xl shadow-2xl overflow-hidden max-h-[85dvh] animate-slideUp flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-800 dark:text-zinc-100">Register New Youth</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-zinc-400">Create profile and check in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="p-2 bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-neutral-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewCustomer} className="flex flex-col flex-1 h-full">
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 dark:text-zinc-550 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                    className="w-full premium-input text-xs py-2.5"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 dark:text-zinc-550 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCustomerForm.phoneNumber}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phoneNumber: e.target.value })}
                    className="w-full premium-input text-xs py-2.5"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="pt-4 mt-2 shrink-0">
                <button
                  type="submit"
                  disabled={isCreatingCustomer || !newCustomerForm.name || !newCustomerForm.phoneNumber}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-indigo-50/50 disabled:opacity-50 disabled:active:scale-100"
                >
                  {isCreatingCustomer ? "Registering..." : <><Check size={16} strokeWidth={3} /> Register & Check In</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalWrapper>
      )}

      {/* Footer Branding */}
      <div className="text-center py-4 shrink-0 mt-8">
        <p className="text-[10px] text-neutral-400 dark:text-zinc-550 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
          Made with <Heart size={10} className="fill-rose-400 stroke-rose-400" /> for community followups
        </p>
      </div>

      <ToastContainer position="bottom-left" autoClose={3000} />
    </div>
  );
}
