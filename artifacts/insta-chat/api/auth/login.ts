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

  if (!username || !password) {
    res.status(400).json({ error: "يرجى ملء جميع الحقول." }); return;
  }

  const normalized = (username as string).toLowerCase().replace(/^@/, "");
  const { data: user } = await supabase.from("users").select("*").eq("username", normalized).single();
  if (!user) { res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }); return; }

  const valid = await bcrypt.compare(password as string, user.password_hash);
  if (!valid) { res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }); return; }

  const token = jwt.sign({ username: normalized }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ user: { username: normalized }, token });
}
