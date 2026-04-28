import { supabase } from "./supabase";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "حدث خطأ غير متوقع.");
  }
  return data as T;
}

function isLocalDev(): boolean {
  return typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
}

async function registerViaRpc(username: string, password: string): Promise<string> {
  const { data, error } = await supabase.rpc("register_user", {
    p_username: username,
    p_password: password,
  });
  if (error) throw new Error("حدث خطأ أثناء إنشاء الحساب: " + error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.username) throw new Error("تعذر إنشاء الحساب.");
  return data.username as string;
}

async function loginViaRpc(username: string, password: string): Promise<string> {
  const { data, error } = await supabase.rpc("login_user", {
    p_username: username,
    p_password: password,
  });
  if (error) throw new Error("حدث خطأ أثناء تسجيل الدخول: " + error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.username) throw new Error("تعذر تسجيل الدخول.");
  return data.username as string;
}

async function checkUserViaRpc(username: string): Promise<{ exists: boolean; username: string | null }> {
  const { data, error } = await supabase.rpc("check_user_exists", {
    p_username: username,
  });
  if (error) throw new Error("حدث خطأ أثناء التحقق من اسم المستخدم: " + error.message);
  return {
    exists: Boolean(data?.exists),
    username: data?.username ?? null,
  };
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

// ── Register ──────────────────────────────────────────────────────
export async function registerUser(
  username: string,
  password: string,
): Promise<string> {
  const u = normalizeUsername(username);

  if (u.length < 2) throw new Error("اسم المستخدم قصير جداً.");
  if (!/^[a-z0-9._]+$/.test(u))
    throw new Error("اسم المستخدم يجب أن يحتوي على حروف إنجليزية وأرقام فقط.");
  if (password.length < 6)
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");

  if (isLocalDev()) {
    return registerViaRpc(u, password);
  }

  const data = await api<{ user: { username: string }; token: string }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ username: u, password }),
    },
  );
  return data.user.username;
}

// ── Login ─────────────────────────────────────────────────────────
export async function loginUser(
  username: string,
  password: string,
): Promise<string> {
  const u = normalizeUsername(username);

  if (isLocalDev()) {
    return loginViaRpc(u, password);
  }

  const data = await api<{ user: { username: string }; token: string }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username: u, password }),
    },
  );
  return data.user.username;
}

// ── Check if user exists ──────────────────────────────────────────
export async function checkUserExists(
  username: string,
): Promise<{ exists: boolean; username: string | null }> {
  const u = normalizeUsername(username);

  if (isLocalDev()) {
    return checkUserViaRpc(u);
  }

  return api<{ exists: boolean; username?: string | null }>(
    `/api/auth/check-user?username=${encodeURIComponent(u)}`,
  ).then((data) => ({
    exists: data.exists,
    username: data.username ?? null,
  }));
}
