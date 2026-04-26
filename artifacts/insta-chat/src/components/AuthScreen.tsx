import { useState } from "react";
import { useMe } from "@/lib/me";

export function AuthScreen() {
  const setAuth = useMe((s) => s.setAuth);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) { setError("يرجى ملء جميع الحقول."); return; }
    if (!isLogin && password !== confirmPassword) { setError("كلمتا المرور غير متطابقتين."); return; }
    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول");
      setAuth(data.user.username, data.token);
      
      if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ ما.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-[100dvh] w-full bg-black flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="mb-8 text-center">
          <h1
            className="text-[52px] font-extrabold italic leading-none"
            style={{
              background: "linear-gradient(135deg,#4f5bd5,#962fbf,#d62976,#fa7e1e,#feda75)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            دايركت
          </h1>
          <p className="text-[#555] text-[13px] mt-2">
            {isLogin ? "سجّل دخولك للمتابعة" : "أنشئ حسابك الجديد"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl px-8 py-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#555] block mb-1.5">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
                className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#444] transition-colors focus:border-white/25 focus:bg-[#222]"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#555] block mb-1.5">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#444] transition-colors focus:border-white/25 focus:bg-[#222]"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#555] block mb-1.5">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  autoComplete="new-password"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#444] transition-colors focus:border-white/25 focus:bg-[#222]"
                  required
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-[#ed4956]/10 border border-[#ed4956]/30 rounded-xl px-3.5 py-2.5 text-[13px] text-[#ed4956]">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white font-bold text-[14px] transition-colors disabled:opacity-50"
            >
              {loading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
            </button>
          </form>

          {isLogin && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="text-[11px] text-[#444] uppercase font-semibold">أو</span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>
              <button className="w-full text-center text-[12px] text-[#555] hover:text-[#a8a8a8] transition-colors">
                نسيت كلمة المرور؟
              </button>
            </>
          )}
        </div>

        {/* Switch mode */}
        <div className="mt-4 bg-[#0d0d0d] border border-white/[0.08] rounded-2xl py-4 text-center text-[14px]">
          {isLogin ? (
            <p className="text-[#555]">
              ليس لديك حساب؟{" "}
              <button onClick={() => switchMode(false)} className="text-[#0095f6] font-semibold hover:text-white transition-colors">
                سجّل الآن
              </button>
            </p>
          ) : (
            <p className="text-[#555]">
              لديك حساب بالفعل؟{" "}
              <button onClick={() => switchMode(true)} className="text-[#0095f6] font-semibold hover:text-white transition-colors">
                تسجيل الدخول
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
