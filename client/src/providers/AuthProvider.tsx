/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useState, useEffect, PropsWithChildren } from "react";

// firebase
import { auth, firestore } from "../firebase/config";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
    GithubAuthProvider,
    GoogleAuthProvider,
    User,
    onAuthStateChanged,
    signInAnonymously,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import Loader from "@/components/loader";
import { toast } from "sonner";

// interfaces
export interface AuthContextReturnType {
    user: User | null;
    loginWithGoogle: () => Promise<void>;
    loginWithGithub: () => Promise<void>;
    loginAsGuest: () => Promise<void>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextReturnType | null>(null);

const useEmulator = import.meta.env.VITE_USE_EMULATOR === "true";

const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const persistUser = async (currentUser: User) => {
        await setDoc(
            doc(firestore, `users/${currentUser.uid}`),
            {
                name: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL,
                phoneNumber: currentUser.phoneNumber,
                url: window.location.host,
                timestamp: serverTimestamp(),
            },
            { merge: true }
        );
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGithub = async () => {
        try {
            const provider = new GithubAuthProvider();
            const { user: currentUser } = await signInWithPopup(auth, provider);
            await persistUser(currentUser);
        } catch (error: any) {
            console.log(error);
            toast.error(error?.message || "Failed to login");
        }
    };

    const loginWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const { user: currentUser } = await signInWithPopup(auth, provider);
            await persistUser(currentUser);
        } catch (error: any) {
            console.log(error);
            toast.error(error?.message || "Failed to login");
        }
    };

    // Only used against the Firebase emulator, where OAuth popups are not
    // available. Keeps the two-tab signaling test self-contained.
    const loginAsGuest = async () => {
        try {
            const { user: currentUser } = await signInAnonymously(auth);
            await persistUser(currentUser);
        } catch (error: any) {
            console.log(error);
            toast.error(error?.message || "Failed to login as guest");
        }
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider
            value={{
                user,
                loginWithGithub,
                loginWithGoogle,
                loginAsGuest,
                logout,
            }}
        >
            {loading ? <Loader /> : children}
            {useEmulator && <span className="hidden" data-testid="auth-emulator" />}
        </AuthContext.Provider>
    );
};

export { AuthProvider };
