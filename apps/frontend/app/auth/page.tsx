"use client";

import { LandingPagePromptForm } from "@/components/chat/prompt-form/demo-prompt-form";
import { GithubLogo } from "@/components/graphics/github/github-logo";
import { OpulentLogo } from "@/components/graphics/logo/opulent-logo";
import { NewTaskAnimation } from "@/components/task/new-task-animation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// Dynamically import authClient only in the browser
let authClient: any;
if (typeof window !== "undefined") {
  authClient = require("@/lib/auth/auth-client").authClient;
}

export default function AuthPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Don't render anything on the server
  }
  const handleGithubSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleDevLogin = () => {
    window.location.href = "/api/dev-login";
  };

  return (
    <div className="@container relative flex size-full h-svh flex-col items-center overflow-hidden">
      <NewTaskAnimation className="top-52" />
      <div className="relative z-0 mx-auto mt-32 flex w-full max-w-xl flex-col items-center gap-10 overflow-hidden p-4">
        <div className="font-departureMono flex select-none items-center gap-4 text-3xl font-medium tracking-tighter">
          <OpulentLogo size="lg" />
          <span>Opulent Code</span>
        </div>

        <div className="from-background to-background/25 animate-in fade-in fill-mode-both ease-out-quad delay-1500 top-18 absolute left-0 z-10 flex h-36 w-full flex-col items-center justify-center gap-3 bg-gradient-to-t duration-500">
          <Button
            onClick={handleGithubSignIn}
            className="ring-offset-background ring-ring text-base font-medium ring-1 ring-offset-2"
          >
            <GithubLogo className="size-4" />
            Get Started
          </Button>
          <Button
            onClick={handleDevLogin}
            variant="outline"
            className="text-sm"
          >
            Dev Login (Skip Auth)
          </Button>
        </div>

        <LandingPagePromptForm />
      </div>
    </div>
  );
}
