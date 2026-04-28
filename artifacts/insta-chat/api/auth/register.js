import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const { username, password } = req.body || {};

  if (!username || typeof username !== "string" || username.length < 2) {
    res.status(400).json({ error: "اسم المستخدم يجب أن يكون حرفين على الأقل." }); return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." }); return;
  }

  const normalized = username.toLowerCase().replace(/^@/, "");
  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("username")
    .eq("username", normalized)
    .maybeSingle();
  if (existingError) {
    res.status(500).json({ error: "خطأ في التحقق من اسم المستخدم: " + existingError.message, details: existingError });
    return;
  }
  if (existing) { res.status(409).json({ error: "اسم المستخدم محجوز بالفعل." }); return; }

  const { data: result, error } = await supabase.rpc("register_user", {
    p_username: normalized,
    p_password: password,
  });
  if (error) {
    res.status(500).json({ error: "خطأ في إنشاء الحساب: " + error.message, details: error });
    return;
  }
  if (result?.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  const token = jwt.sign({ username: normalized }, JWT_SECRET, { expiresIn: "30d" });
  res.status(201).json({ user: { username: normalized }, token });
}
