"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const Login = () => {
  return (
    <div>
      <Button
        onClick={async () => {
          const data = await authClient.signIn.social({
            provider: "github",
          });

          console.log({ data });
        }}
      >
        Login with Github
      </Button>
    </div>
  );
};

export default Login;
