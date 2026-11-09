import { useAuth } from "@/hooks"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const Header = () => {
    const { user, logout } = useAuth()
    return (
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-3 z-50">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
                <div className="text-xl font-bold text-blue-600">Devomegle</div>

                <DropdownMenu >
                    <DropdownMenuTrigger>
                        <Avatar className="border">
                            <AvatarImage src={user?.photoURL as string} />
                            {user?.displayName && <AvatarFallback>{(user.displayName).split(" ").join("")}</AvatarFallback>}
                        </Avatar>

                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Profile</DropdownMenuItem>
                        <DropdownMenuItem>Billing</DropdownMenuItem>
                        <DropdownMenuItem>Team</DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={logout}
                            className="text-red-500"
                        >
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </header>
    )
}

export default Header