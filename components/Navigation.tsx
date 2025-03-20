import getAuthUser from "@/lib/getAuthUser";
import NavLink from "./NavLink";
import { logout } from "@/actions/auth";
import ClientNavigation from "./ClientNavigation";

export default async function Navigation() {
    const authUser = await getAuthUser();
    
    // Adapt authUser to the expected format for ClientNavigation
    const clientAuthUser = authUser ? { userId: String(authUser.userId) } : null;

    return (
        <nav className="flex justify-between items-center p-4 bg-slate-800 shadow-sm">
            <div className="flex space-x-4">
                <NavLink label="Home" href="/"></NavLink>
                <NavLink label="Menu" href="/menu"></NavLink>
                <NavLink label="My Orders" href="/my-orders"></NavLink>
            </div>
            
            <ClientNavigation authUser={clientAuthUser} />
        </nav>
    );
}