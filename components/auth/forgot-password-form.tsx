"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn } from "@clerk/nextjs";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";

type Step = "email" | "code" | "password";

function clerkErrorMessage(error: { message?: string; longMessage?: string } | null) {
  if (!error) return "Something went wrong. Please try again.";
  return error.longMessage || error.message || "Something went wrong. Please try again.";
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signIn } = useSignIn();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signIn) return;

    setError(null);
    startTransition(async () => {
      const createResult = await signIn.create({ identifier: email.trim() });
      if (createResult.error) {
        setError(clerkErrorMessage(createResult.error));
        return;
      }

      const sendResult = await signIn.resetPasswordEmailCode.sendCode();
      if (sendResult.error) {
        setError(clerkErrorMessage(sendResult.error));
        return;
      }

      setStep("code");
    });
  }

  function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signIn) return;

    setError(null);
    startTransition(async () => {
      const verifyResult = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyResult.error) {
        setError(clerkErrorMessage(verifyResult.error));
        return;
      }

      setStep("password");
    });
  }

  function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signIn) return;

    setError(null);
    startTransition(async () => {
      const passwordResult = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (passwordResult.error) {
        setError(clerkErrorMessage(passwordResult.error));
        return;
      }

      const finalizeResult = await signIn.finalize();
      if (finalizeResult.error) {
        setError(clerkErrorMessage(finalizeResult.error));
        return;
      }

      if (signIn.createdSessionId) {
        await setActive({ session: signIn.createdSessionId });
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          {step === "email"
            ? "Enter your account email and we will send you a verification code."
            : step === "code"
              ? "Enter the verification code sent to your email."
              : "Choose a new password for your account (minimum 12 characters)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending || !email.trim()}>
              {pending ? "Sending..." : "Send reset code"}
            </Button>
          </form>
        ) : null}

        {step === "code" ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending || !code.trim()}>
              {pending ? "Verifying..." : "Verify code"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setStep("email")}>
              Use a different email
            </Button>
          </form>
        ) : null}

        {step === "password" ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending || !password}>
              {pending ? "Updating..." : "Update password"}
            </Button>
          </form>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/sign-in" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
