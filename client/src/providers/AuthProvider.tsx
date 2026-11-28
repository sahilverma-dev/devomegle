/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useState, useEffect, PropsWithChildren } from "react";

// firebase
import { auth, firestore } from "../firebase/config";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
    GithubAuthProvider,
    GoogleAuthProvider,
    User,
    getAdditionalUserInfo,
    getRedirectResult,
    onAuthStateChanged,
    signInAnonymously,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    type UserCredential,
} from "firebase/auth";
import Loader from "@/components/loader";
import { env } from "@/lib/env";
import {
    githubUrlForUsername,
    safeGithubUrl,
} from "@/lib/github";
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
    githubUrl: string | null;
    loginWithGoogle: () => Promise<void>;
    loginWithGithub: () => Promise<void>;
    loginAsGuest: () => Promise<void>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextReturnType | null>(null);

const GITHUB_CACHE_PREFIX = "devomegle:github-url:";

const cacheGithubUrl = (uid: string, url: string | null) => {
    try {
        if (url) window.localStorage.setItem(`${GITHUB_CACHE_PREFIX}${uid}`, url);
        else window.localStorage.removeItem(`${GITHUB_CACHE_PREFIX}${uid}`);
    } catch {
        // Private mode: the in-memory state still carries the URL.
    }
};

const readCachedGithubUrl = (uid: string) => {
    try {
        return safeGithubUrl(
            window.localStorage.getItem(`${GITHUB_CACHE_PREFIX}${uid}`)
        );
    } catch {
        return null;
    }
};

/** GitHub's provider info carries the username, which is what we need to link. */
const githubUrlFromCredential = (credential: UserCredential) => {
    const info = getAdditionalUserInfo(credential);
    return info?.providerId === "github.com"
        ? githubUrlForUsername(info.username)
        : null;
};

const persistUser = async (currentUser: User, githubUrl: string | null) => {
    const githubUsername = githubUrl?.split("/").pop() ?? null;

    await setDoc(
        doc(firestore, `users/${currentUser.uid}`),
        {
            name: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            phoneNumber: currentUser.phoneNumber,
            url: window.location.host,
            timestamp: serverTimestamp(),
            ...(githubUsername ? { githubUsername } : {}),
        },
        { merge: true }
    );
};

const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);
    const [githubUrl, setGithubUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setGithubUrl(
                currentUser ? readCachedGithubUrl(currentUser.uid) : null
            );
            setLoading(false);

            if (!currentUser) return;

            // A fresh device has no cache yet; the profile document does.
            void getDoc(doc(firestore, `users/${currentUser.uid}`))
                .then((snapshot) => {
                    if (auth.currentUser?.uid !== currentUser.uid) return;
                    if (readCachedGithubUrl(currentUser.uid)) return;

                    const url = githubUrlForUsername(
                        snapshot.data()?.githubUsername
                    );
                    if (!url) return;

                    cacheGithubUrl(currentUser.uid, url);
                    setGithubUrl(url);
                })
                .catch(() => {
                    // A missing profile document just means no GitHub link.
                });
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
                    const url = githubUrlFromCredential(result);
                    if (url) {
                        cacheGithubUrl(result.user.uid, url);
                        setGithubUrl(url);
                    }
                    await persistUser(result.user, url);
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
            const credential = await signInWithPopup(auth, provider);
            const url = githubUrlFromCredential(credential);

            if (url) {
                cacheGithubUrl(credential.user.uid, url);
                setGithubUrl(url);
            }

            await persistUser(credential.user, url);
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
            await persistUser(currentUser, null);
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
                githubUrl,
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
