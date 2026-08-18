import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Scheduled reminder dispatcher. Delivers due internal reminders as staff
 * notifications and holds external channels until a messaging provider exists.
 */
export const Route = createFileRoute("/api/public/hooks/follow-up-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey") ?? request.headers.get("authorization")?.replace("Bearer ", "");
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Missing apikey" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supabase = createClient(process.env["VITE_SUPABASE_URL"]!, apiKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error } = await supabase.rpc("dispatch_due_reminders");
        if (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const row = (Array.isArray(data) ? data[0] : data) ?? { delivered: 0, held: 0 };
        return new Response(JSON.stringify({ success: true, ...row }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
