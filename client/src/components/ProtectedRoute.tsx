import { useAuth } from '@/hooks'
import { Navigate } from 'react-router-dom'


const ProtectedRoute = ({ children }: React.PropsWithChildren) => {

    const { user } = useAuth()

    return (
        <>
            {
                !user ?
                    <Navigate
                        to={'/login'}

                        replace
                    /> : children
            }
        </>

    )
}

export default ProtectedRoute