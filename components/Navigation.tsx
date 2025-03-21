import getAuthUser from "@/lib/getAuthUser";
import NavLink from "./NavLink";
import ClientNavigation from "./ClientNavigation";

export default async function Navigation() {
    const authUser = await getAuthUser();
    
    // Adapt authUser to the expected format for ClientNavigation
    const clientAuthUser = authUser ? { userId: String(authUser.userId), isAdmin: authUser.isAdmin as boolean } : null;
    const userData = authUser ? { isAdmin: authUser.isAdmin as boolean } : null;

    return (
        <nav className="flex justify-between items-center p-4 bg-slate-800 shadow-sm">
            {/* Left side navigation - visible on all screen sizes */}
            <div className="flex space-x-4">
                <NavLink label="Home" href="/"></NavLink>
                {/* Menu link only visible on desktop */}
                <span>
                    <NavLink label="Menu" href="/menu"></NavLink>
                </span>
            </div>
            
            {/* Right side with client navigation (cart, auth, etc.) */}
            <ClientNavigation authUser={clientAuthUser} userData={userData} />
        </nav>
    );
}