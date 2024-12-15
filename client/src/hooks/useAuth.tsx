import { AuthContext } from "@/app/providers/auth-provider";
import { useContext } from "react";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context) {
    return context;
  } else {
    throw new Error("Something is wrong with auth context");
  }
};
