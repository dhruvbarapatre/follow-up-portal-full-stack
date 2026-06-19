import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import API from "@/components/apiClient";

export function useCallingTracker(currentUser: any, onCallReturned?: (response?: string) => void) {
  const [activeCallCustomer, setActiveCallCustomer] = useState<any>(null);
  const [liveCallingStates, setLiveCallingStates] = useState<Record<string, { callingBy: string; status: string }>>({});

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleCallingStart = (data: any) => {
      setLiveCallingStates((prev) => ({
        ...prev,
        [data.customerId]: { callingBy: data.userName, status: "calling" },
      }));
    };

    const handleCallingStop = (data: any) => {
      setLiveCallingStates((prev) => {
        const next = { ...prev };
        delete next[data.customerId];
        return next;
      });
    };

    // Listen for real-time states
    socket.on("calling-start", handleCallingStart);
    socket.on("calling-stop", handleCallingStop);

    return () => {
      socket.off("calling-start", handleCallingStart);
      socket.off("calling-stop", handleCallingStop);
    };
  }, []);

  const initiateCall = async (customer: any, programId?: string) => {
    if (!currentUser) return;

    try {
      // Set DB status
      await API.editCustomer({
        _id: customer._id,
        updateData: {
          callingStatus: "calling",
          callingBy: currentUser.name || currentUser.phone || currentUser.phoneNumber,
          callingById: currentUser.id,
        },
      });

      // Emit socket event
      const socket = getSocket();
      socket.connect();
      socket.emit("calling-start", {
        customerId: customer._id,
        userName: currentUser.name || currentUser.phone || currentUser.phoneNumber,
        userId: currentUser.id,
        programId,
      });

      // Save details to sessionStorage
      sessionStorage.setItem("activeCallCustomer", JSON.stringify(customer));
      if (programId) {
        sessionStorage.setItem("activeCallProgramId", programId);
      } else {
        sessionStorage.removeItem("activeCallProgramId");
      }

      // Add window focus listener to catch when they return
      const handleFocus = () => {
        window.removeEventListener("focus", handleFocus);
        
        setTimeout(() => {
          const stored = sessionStorage.getItem("activeCallCustomer");
          if (stored) {
            const parsed = JSON.parse(stored);
            setActiveCallCustomer(parsed);
          }
        }, 1000);
      };
      
      window.addEventListener("focus", handleFocus);

      // Open dialer
      window.location.href = `tel:${customer.phoneNumber}`;
    } catch (err) {
      console.error("Failed to initiate call:", err);
    }
  };

  const handleModalClose = (response?: string) => {
    setActiveCallCustomer(null);
    sessionStorage.removeItem("activeCallCustomer");
    sessionStorage.removeItem("activeCallProgramId");
    if (onCallReturned) {
      onCallReturned(response);
    }
  };

  return {
    activeCallCustomer,
    liveCallingStates,
    initiateCall,
    handleModalClose,
    activeCallProgramId: typeof window !== "undefined" ? sessionStorage.getItem("activeCallProgramId") : null,
  };
}
