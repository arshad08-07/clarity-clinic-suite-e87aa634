import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/api";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In — Vision Care Eye Hospital" },
      {
        name: "description",
        content: "Secure sign in for clinic staff and patients of Vision Care Eye Hospital.",
      },
      { property: "og:title", content: "Staff Sign In — Vision Care Eye Hospital" },
      {
        property: "og:description",
        content: "Secure sign in for clinic staff and patients of Vision Care Eye Hospital.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    if (!data.session) {
      setEmailSent(true);
      toast.success("Check your email to confirm your account");
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  }

  async function resetPassword() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(errorMessage(error));
    else toast.success("Password reset link sent");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Eye className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Vision Care</p>
            <p className="text-xs text-sidebar-foreground/60">Eye Hospital Management System</p>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            One system for the entire eye-care journey.
          </h2>
          <p className="mt-4 text-sm text-sidebar-foreground/70">
            Registration, queue, optometry and refraction, examination, diagnostics, cataract and OT
            workflow, IOL tracking, pharmacy, optical shop, billing and follow-ups — connected to
            every patient record.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          Role-based access · Audit logged · Multi-branch ready
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access the clinic workspace.
          </p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4" onSubmit={(e) => void signIn(e)}>
                <div>
                  <Label htmlFor="email" className="mb-1.5 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="mb-1.5 block">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null} Sign in
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => void resetPassword()}
                >
                  Forgot password?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {emailSent ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  We sent a confirmation link to <strong>{email}</strong>. Confirm your email, then
                  sign in. An administrator will assign your role.
                </div>
              ) : (
                <form className="space-y-4" onSubmit={(e) => void signUp(e)}>
                  <div>
                    <Label htmlFor="fullName" className="mb-1.5 block">
                      Full name
                    </Label>
                    <Input
                      id="fullName"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Asha Rao"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email2" className="mb-1.5 block">
                      Email
                    </Label>
                    <Input
                      id="email2"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password2" className="mb-1.5 block">
                      Password
                    </Label>
                    <Input
                      id="password2"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Create account
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    The first account created becomes Super Admin. Later accounts start as
                    Receptionist until an admin changes the role.
                  </p>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
