import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import Logo from "@/components/ui/logo";

import { Github, Terminal } from "lucide-react";

const LoginPage = () => {
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md animate-in">
          <div className="text-center space-y-6">
            <Logo />
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome to DevOmegle
              </h1>
              <p className="text-sm text-muted-foreground">
                Connect with developers who share your interests.
                <br />
                Collaborate, learn, and code together.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Continue with
                </span>
              </div>
            </div>
            <Button className="w-full ">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
            <GradientButton>Get Started</GradientButton>
          </div>
        </div>
        <div className="fixed bottom-4 flex items-center text-xs text-muted-foreground gap-1">
          <Terminal className="w-3 h-3" />
          <span>Made with code by developers, for developers</span>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
