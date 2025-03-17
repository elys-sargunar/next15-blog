import getAuthUser from "@/lib/getAuthUser";
import NavLink from "./NavLink";
import {logout} from "@/actions/auth"

export default async function Navigation(){

    const authUser = await getAuthUser()
    // console.log(authUser)
    return (
        <nav>
            <div>
                <NavLink label="Home" href="/"></NavLink>
                <NavLink label="Menu" href="/menu"></NavLink>
            </div>
            {authUser ? 
            (<div className="flex items-center">
                <NavLink label="New Post" href="/posts/create"></NavLink>
                <NavLink label="Dashboard" href="/dashboard"></NavLink>
                <form action={logout}>
                    <button className="nav-link">Logout</button>
                </form>
            </div>)
            :
            (<div>
                <NavLink label="Register" href="/register"></NavLink>
                <NavLink label="Login" href="/login"></NavLink>       
            </div>)
            }                        
        </nav>
    )
}