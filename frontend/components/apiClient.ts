import axios from "axios";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
export const api = axios.create({
  baseURL: apiBase ? (apiBase.endsWith("/") ? `${apiBase}api` : `${apiBase}/api`) : "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const API = {
  getAllUsers: (token: string) => api.post("/user/get-all-user", {
    token
  }),
  getUserList: (followUpId: string) => api.post("/user/get-user-list", { followUpId }),
  checkUser: () => api.get("/user/check-user"),

  // CUSTOMER
  getUnReserved: (token: string) => api.post("/customer/get-un-resrerved-customer", {
    token
  }),
  assignCustomer: (data: any) => api.post("/customer/assign-customer-to-user", data),
  editCustomer: (data: any) => api.put("/customer/edit-customer", data),
  addCustomer: (data: any) => api.post("/customer/add-customer", data),
  getAllCustomers: () => api.post("/customer/get-all-customer"),

  // ADMIN
  getAdmins: () => api.get("/admins/get-admins"),

  // ATTENDANCE
  getPrograms: () => api.get("/attendence/list?t=" + Date.now()),
  createProgram: (data: any) => api.post("/attendence/create", data),
  updateProgram: (data: any) => api.put("/attendence/update", data),
  upsertOneAttendance: (data: any) => api.put("/attendence/upsert-one", data),
  deleteProgram: (id: string) => api.delete("/attendence/delete", { data: { id } }),
  getLastAttendance: (customerId: string, currentEventId?: string) => api.get(`/attendence/last/${customerId}${currentEventId ? `?currentEventId=${currentEventId}` : ""}`),
  // PUSH NOTIFICATIONS
  getVapidPublicKey: () => api.get("/push/vapid-public-key"),
  subscribeToPush: (userId: string, subscription: any) => api.post("/push/subscribe", { userId, subscription }),
};

export default API;

