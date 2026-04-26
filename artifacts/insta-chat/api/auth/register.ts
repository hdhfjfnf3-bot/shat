import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const { username, password } = req.body ?? {};

  if (!username || typeof username !== "string" || username.length < 2) {
    res.status(400).json({ error: "اسم المستخدم يجب أن يكون حرفين على الأقل." }); return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." }); return;
  }

  const normalized = username.toLowerCase().replace(/^@/, "");
  const { data: existing } = await supabase.from("users").select("username").eq("username", normalized).single();
  if (existing) { res.status(409).json({ error: "اسم المستخدم محجوز بالفعل." }); return; }

  const passwordHash = await bcrypt.hash(password, 10);
  const { error } = await supabase.from("users").insert({ username: normalized, password_hash: passwordHash });
  if (error) { res.status(500).json({ error: "خطأ في إنشاء الحساب." }); return; }

  const token = jwt.sign({ username: normalized }, JWT_SECRET, { expiresIn: "30d" });
  res.status(201).json({ user: { username: normalized }, token });
}
