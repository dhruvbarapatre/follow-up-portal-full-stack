import axios from "axios";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { toast, ToastContainer } from "react-toastify";
import { Phone, X, Users, Eye, EyeOff, Lock, UserCheck } from "lucide-react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "@/components/slices/authSlice";
import { normalizePhone } from "@/lib/phoneUtils";
import { PersistData } from "@/components/my-list-com/types";
import "react-toastify/dist/ReactToastify.css";
import ModalWrapper from "@/components/ModalWrapper";

axios.defaults.withCredentials = true;

interface Admin {
  name: string;
  phone?: string;
  phoneNumber?: string;
}

interface FormData {
  phoneNumber: string;
  password: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<FormData>({
    phoneNumber: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((s: PersistData) => s.auth);

  // Fetch admin contacts
  useEffect(() => {
    if (showPopup && admins.length === 0) {
      const fetchAdmins = async () => {
        setAdminLoading(true);
        try {
          const res = await axios.get("/api/get-admins");
          setAdmins(res.data.data || []);
        } catch (error) {
          toast.error("Failed to load admin contacts");
        } finally {
          setAdminLoading(false);
        }
      };
      fetchAdmins();
    }
  }, [showPopup, admins.length]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const { phoneNumber, password } = formData;
    const normalizedPhone = normalizePhone(phoneNumber);

    if (!normalizedPhone || !password) {
      toast.error("Please provide a valid 10-digit phone number and password!");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("/api/user/login", {
        phoneNumber: normalizedPhone,
        password,
      });

      const token = res.data.token;
      localStorage.setItem("fyp_token", token);

      // Immediately fetch user profile to update Redux state before redirection
      const checkRes = await axios.post("/api/user/check-user", { fyp_token: token });
      const { id, name, phoneNumber: phone, role } = checkRes.data.data;

      dispatch(
        loginSuccess({ id, name, phone, role, token })
      );

      toast.success(res.data.message);

      setTimeout(() => navigate.push("/"), 1500);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Login failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-100px)] py-10 px-4 bg-zinc-950">
      <div className="w-full max-w-sm bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden animate-slideUp">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="w-12 h-12 bg-indigo-950/40 border border-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400 shadow-inner">
            <UserCheck size={22} />
          </div>
          <h1 className="text-xl font-bold font-display text-zinc-100 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-zinc-450 mt-1">Sign in to manage your follow-ups</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* PHONE NUMBER */}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider" htmlFor="phoneNumber">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                <Phone size={16} />
              </span>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full premium-input pr-4"
                style={{ paddingLeft: "38px" }}
                placeholder="Enter phone number"
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full premium-input pr-11"
                style={{ paddingLeft: "38px" }}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-650 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-950/50 disabled:opacity-50 transition active:scale-95 duration-200 mt-6"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Register Info */}
        <p className="text-center text-xs text-zinc-450 mt-6 leading-relaxed relative z-10">
          Don't have an account?<br />
          Contact an{" "}
          <span
            className="text-indigo-400 font-semibold underline cursor-pointer hover:text-indigo-300 transition"
            onClick={() => setShowPopup(true)}
          >
            Admin
          </span>{" "}
          to register.
        </p>
      </div>

      {/* POPUP MODAL */}
      {showPopup && (
        <ModalWrapper>
          <div
            className="fixed inset-0 flex justify-center items-center bg-zinc-950/60 backdrop-blur-md z-50 p-4"
            onClick={() => setShowPopup(false)}
          >
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 text-white relative border-b border-zinc-800/80">
                <button
                  onClick={() => setShowPopup(false)}
                  className="absolute right-4 top-4 bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition text-white"
                >
                  <X size={16} />
                </button>

                <div className="text-center">
                  <div className="w-12 h-12 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users size={24} />
                  </div>
                  <h3 className="text-lg font-bold font-display text-zinc-100">Contact Admin</h3>
                  <p className="text-zinc-350 text-xs mt-0.5">Reach out to create your volunteer account</p>
                </div>
              </div>

              <div className="p-5 max-h-[300px] overflow-y-auto scrollable-content space-y-2.5">
                {adminLoading ? (
                  <div className="text-center py-6 text-xs text-zinc-450">
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading admin contacts...
                  </div>
                ) : admins.length > 0 ? (
                  admins.map((admin, idx) => {
                    const phoneNum = admin.phone || admin.phoneNumber || "";
                    return (
                      <div key={idx} className="border border-zinc-800 bg-zinc-850/30 rounded-2xl p-3 flex justify-between items-center hover:bg-zinc-850/50 transition-colors">
                        <div>
                          <p className="font-semibold text-zinc-200 text-sm">{admin.name}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-zinc-650" /> {phoneNum}
                          </p>
                        </div>
                        <a
                          href={`tel:${phoneNum}`}
                          className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 rounded-xl flex items-center gap-1.5 text-xs font-semibold shadow-sm transition active:scale-95 duration-200"
                        >
                          <Phone size={12} /> Call
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-xs text-zinc-500 py-6">No admin contacts found</p>
                )}
              </div>
            </div>
          </div>
        </ModalWrapper>
      )}

      <ToastContainer position="bottom-left" autoClose={3000} />
    </div>
  );
}
