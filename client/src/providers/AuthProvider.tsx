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
    getRedirectResult,
    onAuthStateChanged,
    signInAnonymously,
    signInWithPopup,
    signInWithRedirect,
    signOut,
} from "firebase/auth";
import Loader from "@/components/loader";
import { env } from "@/lib/env";
import { toast } from "sonner";

/**
 * Firebase has two browser OAuth flows: a popup (result arrives through the
 * opener window) and a full-page redirect (result arrives in the same tab).
 * A manually opened tab cannot complete either, because there is no channel to
 * hand the credential back.
 *
 * The popup is used first: it keeps working when the browser blocks
 * third-party storage, which is what a redirect needs. A redirect is only
 * started when the browser refuses to open the popup at all.
 */
const REDIRECT_PENDING_KEY = "devomegle:auth-redirect-pending";

/** Codes that mean "this browser will not give us a popup", not "the user quit". */
const POPUP_UNAVAILABLE_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/internal-error",
]);

const loginErrorMessage = (error: any) => {
    switch (error?.code) {
        case "auth/unauthorized-domain":
            return "This domain is not authorised for sign-in yet. Add it in Firebase → Authentication → Settings → Authorised domains.";
        case "auth/account-exists-with-different-credential":
            return "That email is already registered with a different sign-in method.";
        case "auth/network-request-failed":
            return "Network error. Check your connection and try again.";
        case "auth/operation-not-supported-in-this-environment":
            return "This browser cannot complete the sign-in. Try opening the site in your normal browser.";
        default:
            return error?.message || "Failed to login";
    }
};

// interfaces
export interface AuthContextReturnType {
    user: User | null;
    loginWithGoogle: () => Promise<void>;
    loginWithGithub: () => Promise<void>;
    loginAsGuest: () => Promise<void>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextReturnType | null>(null);

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

const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Completes a redirect sign-in that started before the page unloaded.
    useEffect(() => {
        const pending = window.sessionStorage.getItem(REDIRECT_PENDING_KEY) === "1";

        getRedirectResult(auth)
            .then(async (result) => {
                window.sessionStorage.removeItem(REDIRECT_PENDING_KEY);

                if (result?.user) {
                    await persistUser(result.user);
                    return;
                }

                // We sent the user to the provider and came back empty-handed,
                // which means the browser dropped the result.
                if (pending) {
                    toast.error(
                        "Sign-in did not complete. Please try again, or allow storage for this site."
                    );
                }
            })
            .catch((error) => {
                window.sessionStorage.removeItem(REDIRECT_PENDING_KEY);
                console.log(error);
                toast.error(loginErrorMessage(error));
            });
    }, []);

    const loginWithProvider = async (provider: GithubAuthProvider | GoogleAuthProvider) => {
        try {
            const { user: currentUser } = await signInWithPopup(auth, provider);
            await persistUser(currentUser);
            return;
        } catch (error: any) {
            if (!POPUP_UNAVAILABLE_CODES.has(error?.code)) {
                console.log(error);
                toast.error(loginErrorMessage(error));
                return;
            }

            // The browser will not open a popup: fall back to a full-page
            // redirect, which may still work when third-party storage is
            // allowed.
            try {
                window.sessionStorage.setItem(REDIRECT_PENDING_KEY, "1");
                // Navigates away; the effect above finishes the flow on return.
                await signInWithRedirect(auth, provider);
            } catch (redirectError: any) {
                window.sessionStorage.removeItem(REDIRECT_PENDING_KEY);
                console.log(redirectError);
                toast.error(loginErrorMessage(redirectError));
            }
        }
    };

    const loginWithGithub = () => loginWithProvider(new GithubAuthProvider());

    const loginWithGoogle = () => loginWithProvider(new GoogleAuthProvider());

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
            {env.useEmulator && <span className="hidden" data-testid="auth-emulator" />}
        </AuthContext.Provider>
    );
};

export { AuthProvider };
