import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  const username = req.query.username;

  if (!username) {
    res.status(400).json({ error: "Missing username parameter" }); return;
  }

  const normalized = username.toLowerCase().replace(/^@/, "");
  const { data: user } = await supabase.from("users").select("username").eq("username", normalized).single();
  
  if (!user) {
    res.status(404).json({ exists: false }); return;
  }

  res.json({ exists: true, username: user.username });
}
