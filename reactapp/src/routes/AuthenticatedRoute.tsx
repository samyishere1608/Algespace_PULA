import { useAuth } from "@/contexts/AuthProvider.tsx";
import { Navigate, Outlet } from "react-router-dom";
import { Paths } from "./paths";

export default function AuthenticatedRoute() {
    const { user } = useAuth();

    if (user === undefined) {
        return <Navigate to={Paths.StudiesLoginPath} />;
    }

    return <Outlet />;
}
