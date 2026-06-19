import axios from "axios";
import { useState, ChangeEvent, FormEvent } from "react";
import { toast, ToastContainer } from "react-toastify";
import { Eye, EyeOff, UserPlus, Phone, Lock, User } from "lucide-react";
import { useSelector } from "react-redux";
import "react-toastify/dist/ReactToastify.css";

axios.defaults.withCredentials = true;

interface FormDataType {
    name: string;
    phoneNumber: string;
    password: string;
    userType: string;
}

export default function SignupPage() {
    const [formData, setFormData] = useState<FormDataType>({
        name: "",
        phoneNumber: "",
        password: "",
        userType: "",
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const authState = useSelector((state: any) => state.auth);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { name, phoneNumber, password } = formData;
        const userType = "youth"; // Set default userType for signup
        if (!name || !phoneNumber || !password || !userType) {
            setLoading(false);
            toast.error("Please fill all fields!");
            return;
        }

        const payload = { name, phoneNumber, password, userType };

        try {
            const res = await axios.post("/api/user/signup", payload, { withCredentials: true });
            toast.success(res?.data?.message || "Signed up successfully!");
            setFormData({ name: "", phoneNumber: "", password: "", userType: "" });
        } catch (error: any) {
            console.log("Signup request error:", error);
            const backendMessage = error?.response?.data?.message;
            if (backendMessage) {
                toast.error(backendMessage);
            } else if (error?.message) {
                toast.error(error.message);
            } else {
                toast.error("Signup failed. Check console for details.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center w-full min-h-[calc(100vh-100px)] py-10 px-4 bg-neutral-50/20 dark:bg-zinc-950/20">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800/80 shadow-premium rounded-2xl p-6 sm:p-8 animate-slideUp">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
                        <UserPlus size={22} />
                    </div>
                    <h1 className="text-xl font-bold font-display text-neutral-800 dark:text-zinc-100 tracking-tight">Create Account</h1>
                    <p className="text-xs text-neutral-400 dark:text-zinc-500 mt-1">Register a new volunteer to follow-ups</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block mb-1.5 text-xs font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
                            Full Name
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-500">
                                <User size={16} />
                            </span>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter full name"
                                className="w-full premium-input"
                                style={{ paddingLeft: "38px" }}
                                required
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block mb-1.5 text-xs font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
                            Phone Number
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-500">
                                <Phone size={16} />
                            </span>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                placeholder="Enter phone number"
                                className="w-full premium-input"
                                style={{ paddingLeft: "38px" }}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block mb-1.5 text-xs font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-500">
                                <Lock size={16} />
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full premium-input pr-10"
                                style={{ paddingLeft: "38px" }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-550 hover:text-neutral-600 dark:hover:text-zinc-350 p-0.5"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-6 shadow-md shadow-indigo-100 dark:shadow-none py-3 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 disabled:bg-indigo-400"
                    >
                        {loading ? "Creating Account…" : "Create Doer"}
                    </button>
                </form>

                <ToastContainer position="bottom-left" autoClose={3000} />
            </div>
        </div>
    );
}
