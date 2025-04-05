"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const LoginPage = () => {
  return (
    <div>
      <Button
        onClick={async () => {
          await authClient.signIn.social({
            provider: "github",
            callbackURL: "/",
          });
        }}
      >
        Login
      </Button>
    </div>
  );
};

export default LoginPage;
