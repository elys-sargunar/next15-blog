
import getAuthUser from "@/lib/getAuthUser";
import NavLink from "./NavLink";
import {logout} from "@/actions/auth"
import { useCart } from "@/lib/CartContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";


export default async function Navigation(){

    const authUser = await getAuthUser()
    // console.log(authUser)

    function CartButton() {
        const { cart } = useCart();
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      
        return (
          <div className="fixed top-4 right-4 z-50">
            <Link href="/order">
              <Button>
                Cart ({itemCount} items)
              </Button>
            </Link>
          </div>
        );
      }

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