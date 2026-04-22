import { useState } from "react";
import { useMe } from "@/lib/me";

export function SetupScreen() {
  const setUsername = useMe((s) => s.setUsername);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    const clean = val.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9._]{2,24}$/.test(clean)) {
      setErr("Use 2-24 letters, numbers, dots or underscores.");
      return;
    }
    setUsername(clean);
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-[360px] flex flex-col items-center text-center">
        <div
          className="text-[44px] font-bold mb-2"
          style={{
            background: "linear-gradient(135deg, #4f5bd5, #962fbf, #d62976, #fa7e1e, #feda75)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Direct
        </div>
        <p className="text-[#a8a8a8] text-[14px] mb-8">
          Pick a username so people can message you.
        </p>
        <input
          autoFocus
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setErr("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="@username"
          className="w-full bg-[#121212] border border-[#262626] rounded-xl px-4 py-3 text-white text-[16px] outline-none focus:border-[#363636] mb-3"
        />
        {err && <div className="text-[#ed4956] text-[12px] mb-3">{err}</div>}
        <button
          onClick={submit}
          disabled={!val.trim()}
          className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #4f5bd5, #962fbf, #d62976, #fa7e1e, #feda75)" }}
        >
          Continue
        </button>
        <p className="text-[#737373] text-[11px] mt-6">
          Tell a friend your username. Open the app on their phone, they pick their own and message you.
        </p>
      </div>
    </div>
  );
}
