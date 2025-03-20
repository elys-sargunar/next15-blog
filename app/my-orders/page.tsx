import { getOrdersByUserId } from "@/actions/orders";
import getAuthUser from "@/lib/getAuthUser";
import Link from "next/link";
import GuestOrdersView from "./guest-view";

export default async function MyOrdersPage() {
  // Check if the user is signed in
  const user = await getAuthUser();
  
  // If no user is logged in, show the guest view
  if (!user) {
    return <GuestOrdersView />;
  }

  // Fetch orders for the current user
  const orders = await getOrdersByUserId(user.userId as string);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 mb-6">You haven't placed any orders yet</p>
          <Link 
            href="/menu" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id.toString()}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {order._id.toString().substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.items ? `${order.items.length} items` : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    £{order.totalPrice ? (order.totalPrice / 100).toFixed(2) : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${order.status === "completed" ? "bg-green-100 text-green-800" :
                        order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"}`}>
                      {order.status || "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 