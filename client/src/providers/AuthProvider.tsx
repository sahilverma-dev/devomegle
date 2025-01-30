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
    signInWithPopup,
    signOut,
} from "firebase/auth";
import Loader from "@/components/loader";
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
            } catch (error: any) {
                console.log(error);
                toast.error(error?.message || "Failed to login")
            } finally {
                setLoading(false);
            }
        });
    }, []);

    const loginWithGithub = async () => {
        // TODO change this
        // const provider = new GoogleAuthProvider()
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
                    url: window.location.host,
                    timestamp: serverTimestamp(),
                },
                { merge: true }
            );
        } catch (error: any) {
            console.log(error);
            toast.error(error?.message || "Failed to login")
        }
    };
    const loginWithGoogle = async () => {
        // TODO change this
        const provider = new GoogleAuthProvider()

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
                    timestamp: serverTimestamp(),
                },
                { merge: true }
            );
        } catch (error: any) {
            console.log(error);
            toast.error(error?.message || "Failed to login")
        }
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{
            user,
            loginWithGithub,
            loginWithGoogle
            , logout
        }}>
            {loading ? <Loader /> : children}
        </AuthContext.Provider>
    );
};

export { AuthProvider };