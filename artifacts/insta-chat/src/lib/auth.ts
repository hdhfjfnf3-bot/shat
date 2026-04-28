import { supabaseAdmin } from "./supabase";

/** SHA-256 via browser Web Crypto API — no external libs needed */
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  // Check existence using admin client (bypasses RLS)
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("username")
    .eq("username", u)
    .maybeSingle();

  if (existing) throw new Error("اسم المستخدم مستخدم بالفعل.");

  const hash = await sha256(password);
  const { error } = await supabaseAdmin
    .from("users")
    .insert({ username: u, password_hash: hash });

  if (error) throw new Error("حدث خطأ أثناء إنشاء الحساب: " + error.message);
  return u;
}

// ── Login ─────────────────────────────────────────────────────────
export async function loginUser(
  username: string,
  password: string,
): Promise<string> {
  const u = normalizeUsername(username);

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("username, password_hash")
    .eq("username", u)
    .maybeSingle();

  if (!user) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة.");

  // Legacy bcrypt hash (created by old Express server) — can't verify in browser
  if (
    user.password_hash.startsWith("$2b$") ||
    user.password_hash.startsWith("$2a$")
  ) {
    throw new Error(
      "هذا الحساب يستخدم تشفيراً قديماً. يرجى إنشاء حساب جديد باسم مستخدم مختلف.",
    );
  }

  const inputHash = await sha256(password);
  if (inputHash !== user.password_hash)
    throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة.");

  return user.username;
}

// ── Check if user exists ──────────────────────────────────────────
export async function checkUserExists(
  username: string,
): Promise<{ exists: boolean; username: string | null }> {
  const u = normalizeUsername(username);
  const { data } = await supabaseAdmin
    .from("users")
    .select("username")
    .eq("username", u)
    .maybeSingle();
  return { exists: !!data, username: data?.username ?? null };
}
