import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Calendar, Clock, Plus, Trash2, Edit2, Check, X, Users, Search, Phone, FileText, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { normalizePhone } from "@/lib/phoneUtils";
import API from "@/components/apiClient";
import { useCallingTracker } from "../../components/my-list-com/useCallingTracker";
import CallResponseModal from "../../components/my-list-com/CallResponseModal";
import EditCustomerModal from "../../components/my-list-com/EditCustomerModal";
import { getSocket } from "@/lib/socket";
import "react-toastify/dist/ReactToastify.css";
import ModalWrapper from "@/components/ModalWrapper";

const AssignedUserAvatar = ({ user, getInitials }: { user: any, getInitials: (name: string) => string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showTooltip) {
      timer = setTimeout(() => setShowTooltip(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showTooltip]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  return (
    <div className="relative flex items-center justify-center" ref={containerRef}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        className="w-5 h-5 ml-0.5 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold cursor-pointer border border-indigo-200 dark:border-indigo-800 hover:scale-110 transition shadow-sm"
      >
        {getInitials(user.name)}
      </span>
      {showTooltip && (
        <div className="absolute bottom-full mb-1.5 z-50 whitespace-nowrap bg-neutral-800 dark:bg-zinc-700 text-white text-[10px] px-2.5 py-1 rounded shadow-lg animate-fadeIn flex flex-col items-center">
          {user.name}
          <div className="absolute top-full w-2 h-2 bg-neutral-800 dark:bg-zinc-700 rotate-45 -mt-1"></div>
        </div>
      )}
    </div>
  );
};

interface Program {
  _id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  invitedCustomers: any[];
}

export default function ProgramScheduler() {
  const auth = useSelector((s: any) => s.auth);
  const currentUser = auth?.user;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // States for collapsing sections in event list details
  const [collapsedMyInvites, setCollapsedMyInvites] = useState<Record<string, boolean>>({});
  const [collapsedOtherInvites, setCollapsedOtherInvites] = useState<Record<string, boolean>>({});

  // New profile state
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phoneNumber: "",
  });

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    description: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null); // selected program ID to view invite list

  // Hook for handling phone calls and websocket status in real-time
  const {
    activeCallCustomer,
    liveCallingStates,
    initiateCall,
    handleModalClose,
    activeCallProgramId,
  } = useCallingTracker(currentUser, () => {
    // When a call response is submitted, refresh the program invites list
    fetchPrograms();
  });

  // State for direct response editing
  const [activeEditCustomer, setActiveEditCustomer] = useState<any>(null);
  const [activeEditProgramId, setActiveEditProgramId] = useState<string | null>(null);

  const fetchPrograms = async () => {
    try {
      console.log("EventPage: Fetching programs...");
      const res = await API.getPrograms();
      setPrograms(res.data.data || []);
      console.log("EventPage: Programs fetched successfully:", res.data.data);
    } catch (err) {
      toast.error("Failed to load scheduled programs");
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log("EventPage: Fetching customers...");
      const res = await API.getAllCustomers();
      setCustomers(res.data.data || []);
      console.log("EventPage: Customers fetched successfully");
    } catch (err) {
      toast.error("Failed to load customer list");
    }
  };

  const fetchVolunteers = async () => {
    try {
      const res = await API.getAllUsers(auth.token);
      setVolunteers(res.data.data || []);
    } catch {
      // Volunteers are display-only (Assigned To column). If the token is
      // expired or the endpoint is unavailable, just show "Unassigned".
      setVolunteers([]);
    }
  };

  useEffect(() => {
    if (!auth?.token) return;
    setLoading(true);
    const promises = [fetchPrograms(), fetchCustomers(), fetchVolunteers()];
    Promise.all(promises).finally(() => {
      setLoading(false);
    });
  }, [auth?.token]);

  // Real-time synchronization for responses and details via WebSockets
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleUpdate = (data: any) => {
      console.log("EventPage: Received update event (customer-update/attendance-update/etc):", data);
      fetchPrograms();
      fetchCustomers();
    };

    socket.on("customer-update", handleUpdate);
    socket.on("attendance-update", handleUpdate);
    socket.on("event-update", handleUpdate);

    return () => {
      socket.off("customer-update", handleUpdate);
      socket.off("attendance-update", handleUpdate);
      socket.off("event-update", handleUpdate);
    };
  }, []);

  const handleInviteToggle = (id: string) => {
    if (selectedInviteIds.includes(id)) {
      setSelectedInviteIds(selectedInviteIds.filter((x) => x !== id));
    } else {
      setSelectedInviteIds([...selectedInviteIds, id]);
    }
  };

  const handleSelectAllInvites = () => {
    const filtered = customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredIds = filtered.map(c => c._id);

    // Check if all filtered are already selected
    const allSelected = filteredIds.every(id => selectedInviteIds.includes(id));
    if (allSelected) {
      // Unselect all filtered
      setSelectedInviteIds(selectedInviteIds.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered (keeping other selections)
      setSelectedInviteIds(Array.from(new Set([...selectedInviteIds, ...filteredIds])));
    }
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizePhone(newCustomerForm.phoneNumber);
    if (!newCustomerForm.name || !normalizedPhone) {
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
      setCustomers(latestList);

      const newCust = latestList.find((c: any) => c.phoneNumber === payload.phoneNumber && c.name === payload.name);

      if (newCust) {
        setSelectedInviteIds(prev => [...prev, newCust._id]);
      }

      setNewCustomerForm({ name: "", phoneNumber: "" });
      toast.success("New youth registered & selected for invite!");
      setShowNewForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to register youth");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.time) {
      return toast.error("Please fill in title, date, and time.");
    }

    try {
      setLoading(true);
      if (editingId) {
        // Edit program
        await API.updateProgram({
          id: editingId,
          title: formData.title,
          date: formData.date,
          time: formData.time,
          description: formData.description,
          invitedCustomerIds: selectedInviteIds,
        });
        toast.success("Program updated successfully!");

        const socket = getSocket();
        socket.emit("event-update", { type: "update", id: editingId });
      } else {
        // Create program
        await API.createProgram({
          title: formData.title,
          date: formData.date,
          time: formData.time,
          description: formData.description,
          invitedCustomerIds: selectedInviteIds,
        });
        toast.success("Program scheduled successfully!");

        // Notify others of newly created event
        const socket = getSocket();
        socket.emit("event-update", { type: "create" });
        socket.emit("new-notification", {
          type: "new-event",
          message: `New event scheduled: '${formData.title}'`,
          createdAt: new Date(),
          title: formData.title,
        });
      }

      setFormData({ title: "", date: "", time: "", description: "" });
      setSelectedInviteIds([]);
      setEditingId(null);
      setIsAdding(false);
      fetchPrograms();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save program.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (program: Program) => {
    // Format date string from DB (e.g. YYYY-MM-DD)
    const formattedDate = program.date ? new Date(program.date).toISOString().split("T")[0] : "";
    setFormData({
      title: program.title,
      date: formattedDate,
      time: program.time,
      description: program.description || "",
    });
    setSelectedInviteIds(program.invitedCustomers.map((ic: any) => ic.customerId?._id || ic.customerId));
    setEditingId(program._id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this program?")) return;

    try {
      setLoading(true);
      await API.deleteProgram(id);
      toast.success("Program deleted.");

      const socket = getSocket();
      socket.emit("event-update", { type: "delete", id });

      if (activeTab === id) setActiveTab(null);
      fetchPrograms();
    } catch (err) {
      toast.error("Failed to delete program.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ title: "", date: "", time: "", description: "" });
    setSelectedInviteIds([]);
    setIsAdding(false);
    setEditingId(null);
  };

  const formatTime12h = (timeStr: string) => {
    if (!timeStr) return "";
    if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) return timeStr;
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${hours}:${minutes} ${ampm}`;
  };

  const renderAssignedUsers = (whoCanFollowUp: string[]) => {
    if (!whoCanFollowUp || !Array.isArray(whoCanFollowUp) || whoCanFollowUp.length === 0) {
      return "Unassigned";
    }

    const assignedVolunteers = whoCanFollowUp
      .map((id) => volunteers.find((v: any) => v._id === id))
      .filter(Boolean);

    if (assignedVolunteers.length === 0) return "Unassigned";

    const firstUser = assignedVolunteers[0];
    const others = assignedVolunteers.slice(1);

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    };

    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span>{firstUser.name}</span>
        {others.map((u: any, idx: number) => (
          <AssignedUserAvatar key={u._id || idx} user={u} getInitials={getInitials} />
        ))}
      </div>
    );
  };

  const getResponseBadge = (response: string) => {
    if (!response || response.toLowerCase() === "pending") {
      return <span className="text-[9px] font-bold px-2 py-0.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-500 border border-neutral-200 dark:border-zinc-700 rounded-full">Pending</span>;
    }

    switch (response.toLowerCase()) {
      case "yes, coming":
        return <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-full">yes, coming</span>;
      case "try to come":
        return <span className="text-[9px] font-bold px-2 py-0.5 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 rounded-full">Try to come</span>;
      case "out of station":
        return <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 rounded-full">Out of station</span>;
      case "excuse":
        return <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-300 border border-slate-100 dark:border-zinc-700/50 rounded-full">Excuse</span>;
      case "no":
        return <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-full">No</span>;
      case "not picked up":
        return <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-full">No Answer</span>;
      default:
        // Render custom response
        return <span className="text-[9px] font-bold px-2 py-0.5 bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-700 dark:text-fuchsia-400 border border-fuchsia-100 dark:border-fuchsia-900/50 rounded-full max-w-[120px] truncate block text-center" title={response}>{response}</span>;
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <div className="animate-fadeIn space-y-6">
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-zinc-800/80">
          <div>
            <h1 className="text-lg font-bold text-neutral-800 dark:text-zinc-100 font-display uppercase tracking-tight">Event Manager</h1>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">Schedule events and track invitees</p>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-100 neumorphic-btn"
            >
              <Plus size={16} /> New Event
            </button>
          )}
        </div>

        {/* PROGRAM CARDS LISTING */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-100 dark:border-zinc-800/80 shadow-premium">
              <Calendar size={40} className="mx-auto mb-3 text-neutral-300 dark:text-zinc-700" />
              <p className="text-xs text-neutral-500 dark:text-zinc-400 font-semibold">No scheduled events yet</p>
              <p className="text-[10px] text-neutral-400 dark:text-zinc-550 mt-1 max-w-[200px] mx-auto leading-relaxed">
                Click the 'New Event' button above to create event schedules.
              </p>
            </div>
          ) : (
            programs.map((program) => {
              const isExpanded = activeTab === program._id;
              const programDate = new Date(program.date);

              return (
                <div
                  key={program._id}
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl shadow-premium overflow-hidden transition-all duration-200 ${isExpanded
                    ? "border-indigo-200 dark:border-indigo-800/80 ring-2 ring-indigo-50 dark:ring-indigo-950/40"
                    : "border-neutral-100 dark:border-zinc-800/80 hover:border-neutral-200 dark:hover:border-zinc-750"
                    }`}
                >
                  {/* Card Main Bar */}
                  <div
                    className="p-4 sm:p-5 flex justify-between items-start cursor-pointer hover:bg-neutral-50/20 dark:hover:bg-zinc-800/20"
                    onClick={() => setActiveTab(isExpanded ? null : program._id)}
                  >
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-neutral-800 dark:text-zinc-100 tracking-tight">
                        {program.title}
                      </h3>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-500 dark:text-zinc-400 font-sans">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-neutral-400 dark:text-zinc-550" />
                          {programDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-neutral-400 dark:text-zinc-550" />
                          {formatTime12h(program.time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={13} className="text-neutral-400 dark:text-zinc-550" />
                          {program.invitedCustomers?.length || 0} Invited
                        </span>
                      </div>

                      {program.description && (
                        <p className="text-xs text-neutral-400 dark:text-zinc-500 italic line-clamp-1 leading-relaxed">
                          {program.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1.5 self-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(program)}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-xl transition duration-150 active:scale-90"
                        title="Edit program"
                      >
                        <Edit2 size={14} />
                      </button>
                      {true && (
                        <button
                          onClick={() => handleDelete(program._id)}
                          className="p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition duration-150 active:scale-90"
                          title="Delete program"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Follow-up invite list */}
                  {isExpanded && (
                    <div className="bg-neutral-50/50 dark:bg-zinc-950/30 border-t border-neutral-100 dark:border-zinc-800/80 p-4 animate-fadeIn space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-bold text-neutral-700 dark:text-zinc-300 uppercase tracking-wider">
                          Invite Follow Up List
                        </h4>
                      </div>

                      {program.invitedCustomers?.length === 0 ? (
                        <p className="text-xs text-neutral-400 dark:text-zinc-550 italic py-2">
                          No youth invited to this program. Edit event to add invites.
                        </p>
                      ) : (() => {
                        const invitedList = program.invitedCustomers || [];
                        const myInvites = invitedList.filter((ic: any) => {
                          const c = ic.customerId;
                          if (!c) return false;
                          const assignedIds = c.whoCanFollowUp || [];
                          return assignedIds.includes(currentUser?.id);
                        });
                        const otherInvites = invitedList.filter((ic: any) => {
                          const c = ic.customerId;
                          if (!c) return false;
                          const assignedIds = c.whoCanFollowUp || [];
                          return !assignedIds.includes(currentUser?.id);
                        });

                        const sortPendingFirst = (a: any, b: any) => {
                          const aPending = !a.response || a.response.toLowerCase() === "pending";
                          const bPending = !b.response || b.response.toLowerCase() === "pending";
                          if (aPending && !bPending) return -1;
                          if (!aPending && bPending) return 1;
                          return 0;
                        };

                        const sortedMyInvites = [...myInvites].sort(sortPendingFirst);
                        const sortedOtherInvites = [...otherInvites].sort(sortPendingFirst);

                        const isSectionCollapsed = (isMyList: boolean) => isMyList
                          ? collapsedMyInvites[program._id]
                          : collapsedOtherInvites[program._id];

                        const toggleSection = (isMyList: boolean) => {
                          if (isMyList) {
                            setCollapsedMyInvites(prev => ({
                              ...prev,
                              [program._id]: !prev[program._id]
                            }));
                          } else {
                            setCollapsedOtherInvites(prev => ({
                              ...prev,
                              [program._id]: !prev[program._id]
                            }));
                          }
                        };

                        const renderInviteTable = (invitesList: any[], label: string, isMyList: boolean) => {
                          const collapsed = isSectionCollapsed(isMyList);
                          return (
                            <div className="space-y-2">
                              <h5 className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between cursor-pointer select-none hover:opacity-80 transition duration-200 ${isMyList ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-500 dark:text-zinc-400"
                                }`} onClick={() => toggleSection(isMyList)}>
                                <span className="flex items-center gap-1.5">
                                  <span>{label}</span>
                                  <span className="px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-[9px] font-bold text-neutral-500 dark:text-zinc-400">
                                    {invitesList.length}
                                  </span>
                                </span>
                                <span className="p-0.5 rounded text-neutral-450 dark:text-zinc-400 transition">
                                  {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </span>
                              </h5>
                              {!collapsed && (
                                invitesList.length === 0 ? (
                                  <p className="text-[10px] text-neutral-400 dark:text-zinc-555 italic py-2 pl-1">
                                    No invites in this section.
                                  </p>
                                ) : (
                                  <div className="overflow-hidden rounded-xl border border-neutral-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-900">
                                    <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1.5fr_auto] bg-neutral-50 dark:bg-zinc-950/40 border-b border-neutral-100 dark:border-zinc-800/80 p-2.5 gap-4">
                                      <div className="font-bold text-neutral-500 dark:text-zinc-400 text-xs uppercase tracking-wider pl-1">Name</div>
                                      <div className="font-bold text-neutral-500 dark:text-zinc-400 text-xs uppercase tracking-wider">Assigned To</div>
                                      <div className="font-bold text-neutral-500 dark:text-zinc-400 text-xs uppercase tracking-wider">Call Response</div>
                                      <div className="font-bold text-neutral-500 dark:text-zinc-400 text-xs uppercase tracking-wider text-right pr-1">Action</div>
                                    </div>
                                    <div className="flex flex-col">
                                      {invitesList.map((ic: any) => {
                                        const c = ic.customerId;
                                        if (!c) return null;

                                        const isCallingLocally = liveCallingStates[c._id]?.status === "calling" || c.callingStatus === "calling";
                                        const caller = liveCallingStates[c._id]?.callingBy || c.callingBy;

                                        return (
                                          <div key={ic._id || c._id} className="flex flex-col sm:grid sm:grid-cols-[2fr_1.5fr_1.5fr_auto] gap-3 sm:gap-4 p-3.5 sm:p-2.5 border-b border-neutral-100 dark:border-zinc-800/50 last:border-none hover:bg-neutral-50/30 dark:hover:bg-zinc-800/20 transition items-start sm:items-center">

                                            <div className="flex justify-between items-start w-full sm:w-auto sm:contents">
                                              <div
                                                className="flex flex-col cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                                                onClick={() => setSelectedCustomer(c)}
                                              >
                                                <span className="font-bold text-neutral-800 dark:text-zinc-100 text-sm sm:text-xs">{c.name}</span>
                                                <span className="text-[11px] sm:text-[10px] text-neutral-400 dark:text-zinc-550 font-normal mt-0.5">{c.phoneNumber}</span>
                                              </div>

                                              {/* Mobile Action */}
                                              <div className="sm:hidden shrink-0 ml-4">
                                                <button
                                                  onClick={() => initiateCall(c, program._id)}
                                                  disabled={isCallingLocally && caller !== currentUser?.name}
                                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${isCallingLocally && caller !== currentUser?.name
                                                    ? "bg-neutral-100 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-650 cursor-not-allowed shadow-none"
                                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                                                    }`}
                                                >
                                                  <Phone size={12} /> Call
                                                </button>
                                              </div>
                                            </div>

                                            {/* Additional Info Row (Assigned To + Call State) */}
                                            <div className="flex flex-wrap gap-x-6 gap-y-3 w-full sm:w-auto sm:contents mt-1 sm:mt-0">
                                              <div className="flex flex-col gap-0.5 text-neutral-600 dark:text-zinc-400">
                                                <span className="sm:hidden text-[9px] uppercase font-bold text-neutral-400 tracking-wider">Assigned To</span>
                                                <span className="text-[12px] sm:text-[10px] font-medium text-neutral-700 dark:text-zinc-300">{renderAssignedUsers(c.whoCanFollowUp)}</span>
                                              </div>

                                              <div className="flex flex-col gap-1 sm:gap-0.5">
                                                <span className="sm:hidden text-[9px] uppercase font-bold text-neutral-400 tracking-wider">Call Response</span>
                                                <div className="w-fit">
                                                  {isCallingLocally ? (
                                                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-full animate-pulse flex items-center gap-1">
                                                      <Phone size={9} className="animate-bounce" />
                                                      <span>{caller} calling...</span>
                                                    </span>
                                                  ) : (
                                                    (() => {
                                                      // Display priority:
                                                      //   1. Event-specific response (ic.response) if filled
                                                      //   2. Customer profile lastCallResponse (for old data / first-call fallback)
                                                      //   Note: SAVING is always event-specific only (never touches lastCallResponse)
                                                      const hasEventResponse = ic.response && ic.response !== "pending";
                                                      const displayResponse = hasEventResponse
                                                        ? ic.response
                                                        : (c.lastCallResponse || "pending");
                                                      const isProfileFallback = !hasEventResponse && c.lastCallResponse && c.lastCallResponse !== "pending";

                                                      return (
                                                        <div
                                                          className="flex items-center gap-1.5 group cursor-pointer hover:opacity-80 transition"
                                                          onClick={() => {
                                                            setActiveEditCustomer(c);
                                                            setActiveEditProgramId(program._id);
                                                          }}
                                                        >
                                                          {getResponseBadge(displayResponse)}
                                                          {isProfileFallback && (
                                                            <span className="text-[8px] text-zinc-500 px-1 py-0.5 rounded border border-zinc-700/50" title="Showing last known profile response — no event-specific response logged yet">
                                                              profile
                                                            </span>
                                                          )}
                                                          <div className="p-1 rounded-md bg-neutral-100 dark:bg-zinc-800 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                                                            <Edit2 size={10} />
                                                          </div>
                                                        </div>
                                                      );
                                                    })()
                                                  )}
                                                </div>
                                                {ic.callingBy && (
                                                  <span className="text-[10px] sm:text-[9px] text-neutral-400 dark:text-zinc-500 mt-0.5 font-sans">
                                                    Done by: {ic.callingBy}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Desktop Action */}
                                            <div className="hidden sm:flex justify-end">
                                              <button
                                                onClick={() => initiateCall(c, program._id)}
                                                disabled={isCallingLocally && caller !== currentUser?.name}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 active:scale-95 ${isCallingLocally && caller !== currentUser?.name
                                                  ? "bg-neutral-100 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-650 cursor-not-allowed shadow-none"
                                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                                  }`}
                                              >
                                                <Phone size={10} /> Call
                                              </button>
                                            </div>

                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        };

                        return (
                          <div className="space-y-4 w-full">
                            {renderInviteTable(sortedMyInvites, "Assigned to Me", true)}
                            <div className="border-t border-neutral-100 dark:border-zinc-800/80 my-2 pt-2"></div>
                            {renderInviteTable(sortedOtherInvites, "Others / Unassigned", false)}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FORM FOR ADDING/EDITING (MODAL) */}
      {isAdding && (
        <ModalWrapper>
          <div
            className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-xl"
            onClick={handleCancel}
          >
            <form
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 w-full max-w-md p-6 rounded-2xl shadow-xl overflow-y-auto max-h-[90%] animate-slideUp space-y-4 flex flex-col"
            >
              <div className="flex justify-between items-center mb-1 pb-3 border-b border-neutral-100 dark:border-zinc-800/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800 dark:text-zinc-100">
                      {editingId ? "Edit Scheduled Event" : "Schedule New Event"}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-zinc-400">Fill details for the program</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-neutral-400 dark:text-zinc-550 hover:text-neutral-600 dark:hover:text-zinc-300"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body (Scrollable container) */}
              <div className="space-y-4 overflow-y-auto flex-1 pr-1 py-1 scrollable-content">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 dark:text-zinc-550 uppercase tracking-wider mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full premium-input py-2 text-xs"
                    placeholder="e.g. Youth Awakening Class"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-400 dark:text-zinc-555 uppercase tracking-wider mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full premium-input py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-400 dark:text-zinc-555 uppercase tracking-wider mb-1">
                      Time (24h)
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full premium-input py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 dark:text-zinc-555 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full premium-input text-xs min-h-[60px]"
                    placeholder="Details about program syllabus, location, or preacher..."
                    rows={2}
                  />
                </div>

                {/* Invite checklist */}
                <div className="border-t border-neutral-100 dark:border-zinc-800/80 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-semibold text-neutral-400 dark:text-zinc-555 uppercase tracking-wider">
                      Invite Youth ({selectedInviteIds.length} Selected)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllInvites}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Select All Filtered
                    </button>
                  </div>

                  {/* Search checklist */}
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-555">
                        <Search size={12} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search youth by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full premium-input !pl-8 py-1 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewForm(true)}
                      className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition whitespace-nowrap"
                    >
                      <UserPlus size={12} /> New
                    </button>
                  </div>

                  {/* Youth checklist list wrapper */}
                  <div className="border border-neutral-100 dark:border-zinc-800/80 rounded-xl max-h-[150px] overflow-y-auto scrollable-content p-2 bg-neutral-50/50 dark:bg-zinc-950/40 space-y-1">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-[10px] text-neutral-400 dark:text-zinc-500 italic text-center py-4">No youth found matching name.</p>
                    ) : (
                      filteredCustomers.map((c) => {
                        const isChecked = selectedInviteIds.includes(c._id);
                        return (
                          <label
                            key={c._id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition ${isChecked
                              ? "bg-indigo-50/50 dark:bg-indigo-950/30 font-semibold text-indigo-700 dark:text-indigo-400"
                              : "hover:bg-neutral-100/50 dark:hover:bg-zinc-800/40 text-neutral-600 dark:text-zinc-400"
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleInviteToggle(c._id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{c.name}</span>
                            <span className="text-[10px] text-neutral-400 dark:text-zinc-500 font-normal">({c.phoneNumber})</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer (Action Buttons) */}
              <div className="flex gap-2 border-t border-neutral-100 dark:border-zinc-800/80 pt-4 mt-2 shrink-0">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-50"
                >
                  <Check size={14} />
                  {editingId ? "Update Event" : "Schedule Event"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-205 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <X size={14} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </ModalWrapper>
      )}

      {/* NEW PROFILE SUB-MODAL */}
      {showNewForm && (
        <ModalWrapper>
          <div
            className="fixed inset-0 bg-neutral-950/60 dark:bg-neutral-950/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm"
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
                    <p className="text-[10px] text-neutral-500 dark:text-zinc-400">Create profile and invite</p>
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
                    {isCreatingCustomer ? "Registering..." : <><Check size={16} strokeWidth={3} /> Register & Select</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* CALL FEEDBACK MODAL OVERLAY */}
      {activeCallCustomer && (
        <CallResponseModal
          customer={activeCallCustomer}
          currentUser={currentUser}
          programId={activeCallProgramId || undefined}
          onClose={handleModalClose}
        />
      )}

      {/* EDIT RESPONSE MODAL OVERLAY */}
      {activeEditCustomer && (
        <CallResponseModal
          customer={activeEditCustomer}
          currentUser={currentUser}
          programId={activeEditProgramId || undefined}
          isEditMode={true}
          onClose={() => {
            setActiveEditCustomer(null);
            setActiveEditProgramId(null);
            fetchPrograms();
          }}
        />
      )}

      {/* CLICKED USER DETAIL MODAL */}
      {selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          users={volunteers}
          onClose={() => setSelectedCustomer(null)}
          refreshCustomerList={() => {
            fetchPrograms();
            fetchCustomers();
          }}
        />
      )}

      <ToastContainer position="bottom-left" autoClose={3000} />
    </div>
  );
}
