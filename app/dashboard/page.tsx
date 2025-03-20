import { deletePost } from "@/actions/posts";
import { getOrdersByUserId } from "@/actions/orders";
import { getCollection } from "@/lib/db";
import getAuthUser from "@/lib/getAuthUser";
import { ObjectId } from "mongodb";
import Link from "next/link";

export default async function Dashboard() {
  const user = await getAuthUser();
  
  // Fetch complete user data including points
  const usersCollection = await getCollection("users");
  const userData = await usersCollection?.findOne({ 
    _id: ObjectId.createFromHexString(user?.userId as string) 
  });

  // Fetch user posts
  const postsCollection = await getCollection("posts");
  const userPosts = await postsCollection
    ?.find({ userId: ObjectId.createFromHexString(user?.userId as string) }).toArray();

  // Fetch user orders
  const userOrders = await getOrdersByUserId(user?.userId as string);

  if(!userData) return <p>Failed to fetch user data.</p>

  return (
    <div className="space-y-8">
      {/* User Information Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Your Information</h2>
          <p><span className="font-medium">Email:</span> {userData.email}</p>
          <p><span className="font-medium">Reward Points:</span> 
            <span className="text-amber-600 font-bold ml-2">{userData.points || 0} points</span>
          </p>
        </div>
      </div>

      {/* Orders Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Orders</h2>
        {!userOrders || userOrders.length === 0 ? (
          <p className="text-gray-500">You haven't placed any orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Points Earned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {userOrders.map((order) => (
                  <tr key={order._id.toString()}>
                    <td className="font-medium text-blue-600">
                      {order._id.toString().substring(0, 8)}...
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>{order.items?.length || 0} items</td>
                    <td>£{order.totalPrice ? (order.totalPrice / 100).toFixed(2) : "N/A"}</td>
                    <td className="text-amber-600 font-medium">{order.totalPoints || 0}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.status === "completed" ? "bg-green-100 text-green-800" :
                        order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
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

      {/* Posts Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Posts</h2>
        {!userPosts || userPosts.length === 0 ? (
          <p className="text-gray-500">You don't have any posts yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="w-3/6">Title</th>
                <th className="w-1/6 sr-only">View</th>
                <th className="w-1/6 sr-only">Edit</th>
                <th className="w-1/6 sr-only">Delete</th>              
              </tr>
            </thead>
            <tbody>
              {userPosts.map((post) => (
                <tr key={post._id.toString()}>
                  <td className="w-3/6">{post.title}</td>
                  <td className="w-1/6 text-blue-500">
                    <Link href={`/posts/show/${post._id.toString()}`}>View</Link>
                  </td>
                  <td className="w-1/6 text-green-500">
                    <Link href={`/posts/edit/${post._id.toString()}`}>Edit</Link>
                  </td>
                  <td className="w-1/6 text-red-500">                
                    <form action={deletePost}>
                      <input type="hidden" name="postId" defaultValue={post._id.toString()}/>
                      <button type="submit">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
