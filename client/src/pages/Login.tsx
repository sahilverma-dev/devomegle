import { useAuth } from "@/hooks"
import { FcGoogle as GoogleIcon } from "react-icons/fc";
import { FaGithub as GithubIcon } from "react-icons/fa"

import { Navigate } from "react-router-dom"


const Login = () => {
    const { user, loginWithGithub, loginWithGoogle } = useAuth()


    if (user) {
        return <Navigate to={'/'} replace />
    }

    return (
        <div

            className="min-h-screen flex items-center justify-center bg-[#E5E7EB] p-4"
        >
            <div className="bg-white rounded-lg w-full max-w-md p-8 border border-neutral-200/20">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        Welcome to Devomegle
                    </h1>
                    <p className="text-gray-600">Connect with developers worldwide</p>
                </div>
                <div className="space-y-4">
                    <button
                        onClick={loginWithGithub}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-200/40 rounded-lg hover:bg-gray-50 transition-colors">
                        <GithubIcon
                            className="w-5 h-5"
                        />
                        Continue with Github
                    </button>
                    <button
                        onClick={loginWithGoogle}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-200/40 rounded-lg hover:bg-gray-50 transition-colors">
                        <GoogleIcon
                            className="w-5 h-5"
                        />
                        Continue with Google
                    </button>

                </div>
            </div>
        </div>

    )
}

export default Login