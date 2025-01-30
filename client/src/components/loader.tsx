import { Loader2Icon } from "lucide-react"


const Loader = () => {
    return (
        <div className="flex items-center justify-center h-dvh w-full">
            <Loader2Icon className="animate-spin" />
        </div>
    )
}

export default Loader