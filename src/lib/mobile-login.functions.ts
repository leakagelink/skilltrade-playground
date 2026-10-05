import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Generic message for every failure so the endpoint never reveals whether a
// mobile number is registered (prevents account enumeration).
const GENERIC = "Invalid mobile number or password.";

function normalize(m: string): string | null {
  const d = m.replace(/[^0-9]/g, "");
  if (!d) return null;
  return d.length === 10 ? `91${d}` : d;
}

export const signInWithMobile = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ mobile: z.string().min(6).max(20), password: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const nm = normalize(data.mobile);
    if (!nm) return { ok: false as const, error: GENERIC };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("user_mobiles").select("user_id").eq("mobile", nm).maybeSingle();
    let email: string | null = null;
    if (row?.user_id) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
      email = u?.user?.email ?? null;
    }
    // Always run a password check (with a dummy address when unknown) so
    // timing does not reveal whether the number exists.
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: s, error } = await client.auth.signInWithPassword({
      email: email ?? "no-account@invalid.tradevirt.online",
      password: data.password,
    });
    if (error || !s.session || !email) return { ok: false as const, error: GENERIC };
    return { ok: true as const, access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });
