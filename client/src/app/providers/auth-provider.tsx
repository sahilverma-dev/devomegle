import { createContext, useState, useEffect, PropsWithChildren } from "react";

// firebase
import { auth, firestore } from "@/config/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { toast } from "sonner";

// interfaces
export interface AuthContextReturnType {
  user: User | null;
  loginWithGoogle: () => void;
  loginWithGithub: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextReturnType | null>(null);

const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      try {
        setLoading(true);
        setUser(user);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    try {
      await setDoc(
        doc(firestore, `users/${user?.uid}`),
        {
          name: user?.displayName,
          email: user?.email,
          photoURL: user?.photoURL,
          phoneNumber: user?.phoneNumber,
          url: window.location.host,
          provider: "google",
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.log(error);
    }
  };
  const loginWithGithub = async () => {
    const provider = new GithubAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    try {
      await setDoc(
        doc(firestore, `users/${user?.uid}`),
        {
          name: user?.displayName,
          email: user?.email,
          photoURL: user?.photoURL,
          phoneNumber: user?.phoneNumber,
          provider: "github",
          url: window.location.host,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error: any) {
      console.log(error.message);
      toast.error(error?.message);
      throw new Error(error);
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{ user, loginWithGithub, loginWithGoogle, logout }}
    >
      {loading ? <p>Loading ...</p> : children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
