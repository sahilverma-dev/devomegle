import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

const Login = () => {
  const { user, loginWithGithub, loginWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const navigate = useNavigate();

  useEffect(() => {
    console.log(user);
    if (user) {
      navigate(redirectTo ? redirectTo : "/", {
        replace: true,
      });
    }
  }, [user, navigate, redirectTo]);

  return (
    <div className="h-dvh">
      <Button onClick={loginWithGithub}>Login with github</Button>
      <Button onClick={loginWithGoogle}>Login with google</Button>
    </div>
  );
};
export default Login;
