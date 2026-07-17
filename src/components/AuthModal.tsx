import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi } from "@/api/axios";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PhoneInputWithFlag } from "@/components/ui/PhoneInputWithFlag";

const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, authMode, setToken, setUser, openAuthModal } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", mobile: "" });

  const isLogin = authMode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await authApi.login({ email: form.email, password: form.password });
        const userData = res.data.user || res.data;
        console.log("Login User Data:", userData, "Extracted Role:", userData.role);
        setToken(res.data.token);
        setUser(userData);
        toast.success("Welcome back! 🎉");

        const role = userData.role;
        if (role === "admin" || role === "Admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        const cleanMobile = form.mobile.replace(/[^0-9]/g, "");
        await authApi.register({
          name: form.name,
          email: form.email,
          password: form.password,
          mobile: cleanMobile,
        });
        toast.success("Account created! Please sign in.");
        openAuthModal("login");
        setForm({ name: "", email: "", password: "", mobile: "" });
        return;
      }
      closeAuthModal();
      setForm({ name: "", email: "", password: "", mobile: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={closeAuthModal}>
      <DialogContent className="overflow-hidden border-none bg-transparent p-0 shadow-none sm:max-w-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative rounded-2xl border border-border bg-card/95 p-8 shadow-2xl backdrop-blur-xl"
        >
          <DialogTitle className="sr-only">{isLogin ? "Sign In" : "Create Account"}</DialogTitle>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to access your orders and cart"
                : "Join us for the best food delivery experience"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mobile Number
                  </label>
                  <PhoneInputWithFlag
                    value={form.mobile}
                    onChange={(v) => setForm({ ...form, mobile: v || "" })}
                    placeholder="98765 43210"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </motion.button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => openAuthModal(isLogin ? "register" : "login")}
              className="font-semibold text-primary hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
