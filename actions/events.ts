'use server'

import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { ConnectionStatus } from '@/lib/rules';

// Define the type for order event data
export interface OrderEventData {
  order?: Record<string, unknown>;
  [key: string]: unknown; // Allow additional properties
}

// Define the type for status update event data
export interface StatusUpdateEventData {
  orderId: string;
  oldStatus: string;
  newStatus: string;
  updatedAt: string;
  userId?: string; // Add userId to ensure routing
  [key: string]: unknown; // Allow additional properties
}

// Define a type for the controller to make code more readable
type StreamController = ReadableStreamDefaultController;

// In-memory storage for active client connections
// For admin clients - simple clientId to controller mapping
const adminClients: Map<string, StreamController> = new Map();

// For user clients - userId to Map of clientId to controller
const userClients: Map<string, Map<string, StreamController>> = new Map();

// Connection timestamps to track when clients connected
const connectionTimestamps: Map<string, number> = new Map();

// Connection status tracking
const connectionStatus: Map<string, ConnectionStatus> = new Map();

/**
 * Sends an event to all connected admin clients
 * This is used for real-time notifications triggered by MongoDB changes
 * @param event Event name
 * @param data Event data
 */
export async function sendEventToAdmins(event: string, data: OrderEventData): Promise<void> {
  const eventString = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const failedClients: string[] = [];

  console.log(`EVENTS: Broadcasting "${event}" event to ${adminClients.size} admin clients - ${new Date().toISOString()}`);
  
  if (adminClients.size === 0) {
    console.log(`EVENTS: No admin clients connected to receive "${event}" event`);
    return;
  }
  
  let successCount = 0;

  // Send to each connected admin client
  adminClients.forEach((controller, clientId) => {
    try {
      // Check if the connection is marked as closed or errored
      const status = connectionStatus.get(clientId);
      
      if (status !== 'active') {
        console.log(`EVENTS: Skipping admin client ${clientId} - connection not active`);
        failedClients.push(clientId);
        return;
      }
      
      controller.enqueue(eventString);
      successCount++;
      console.log(`EVENTS: Successfully sent "${event}" to admin client ${clientId}`);
    } catch (error) {
      console.error(`EVENTS: Failed to send event to admin client ${clientId}:`, error);
      failedClients.push(clientId);
      connectionStatus.set(clientId, 'error');
    }
  });

  // Clean up any failed clients
  for (const clientId of failedClients) {
    try {
      adminClients.delete(clientId);
      connectionTimestamps.delete(clientId);
      connectionStatus.delete(clientId);
      console.log(`EVENTS: Removed failed admin client ${clientId}`);
    } catch (error) {
      console.error(`EVENTS: Error removing admin client ${clientId}:`, error);
    }
  }

  console.log(`EVENTS: Successfully sent "${event}" to ${successCount} admin clients, removed ${failedClients.length} failed clients`);
}

/**
 * Sends an event to a specific user across all their connected clients
 * This is used for real-time notifications triggered by MongoDB changes
 * @param userId User ID
 * @param event Event name
 * @param data Event data
 */
export async function sendEventToUser(userId: string, event: string, data: StatusUpdateEventData): Promise<void> {
  // Make sure userId is a string
  userId = String(userId);
  
  console.log(`EVENTS: Preparing "${event}" event for user ${userId}`);
  
  // Add userId to event data for tracking
  const eventData = { ...data, userId };
  const eventString = `event: ${event}\ndata: ${JSON.stringify(eventData)}\n\n`;
  
  const userClientMap = userClients.get(userId);
  
  if (!userClientMap || userClientMap.size === 0) {
    console.log(`EVENTS: No active connections for user ${userId} to receive "${event}" event`);
    return;
  }
  
  console.log(`EVENTS: Sending "${event}" event to user ${userId} (${userClientMap.size} connections)`);
  
  const failedClients: string[] = [];
  let successCount = 0;
  
  // Send to each connected client for this user
  userClientMap.forEach((controller, clientId) => {
    try {
      // Check if the connection is marked as closed or errored
      const connectionKey = `user:${userId}:${clientId}`;
      const status = connectionStatus.get(connectionKey);
      
      if (status !== 'active') {
        console.log(`EVENTS: Skipping client ${clientId} for user ${userId} - connection status: ${status || 'unknown'}`);
        failedClients.push(clientId);
        return;
      }

      controller.enqueue(eventString);
      successCount++;
      console.log(`EVENTS: Successfully sent "${event}" to client ${clientId} for user ${userId}`);
    } catch (error) {
      console.error(`EVENTS: Failed to send event to user client ${clientId}:`, error);
      failedClients.push(clientId);
      connectionStatus.set(`user:${userId}:${clientId}`, 'error');
    }
  });
  
  // Clean up any failed clients
  for (const clientId of failedClients) {
    try {
      userClientMap.delete(clientId);
      connectionTimestamps.delete(`user:${userId}:${clientId}`);
      connectionStatus.delete(`user:${userId}:${clientId}`);
      console.log(`EVENTS: Removed failed client ${clientId} for user ${userId}`);
    } catch (error) {
      console.error(`EVENTS: Error removing user client ${clientId}:`, error);
    }
  }
  
  // If all clients have been removed, clean up the user entry
  if (userClientMap.size === 0) {
    userClients.delete(userId);
    console.log(`EVENTS: Removed user ${userId} from client tracking (no remaining connections)`);
  }
  
  console.log(`EVENTS: Finished sending "${event}" event - success: ${successCount}/${userClientMap.size + failedClients.length} clients for user ${userId}`);
}

/**
 * Send order status update notification to a user
 * Called when order status is updated in MongoDB
 * @param userId User ID to send update to
 * @param orderId Order ID that was updated
 * @param oldStatus Previous order status
 * @param newStatus New order status
 */
export async function broadcastOrderStatusUpdate(
  userId: string, 
  orderId: string, 
  oldStatus: string, 
  newStatus: string
): Promise<void> {
  // Make sure userId is a string
  userId = String(userId);
  
  console.log(`EVENTS: Broadcasting order status update for order ${orderId} to user ${userId}: ${oldStatus} -> ${newStatus}`);
  
  // Create event data
  const eventData: StatusUpdateEventData = {
    orderId,
    oldStatus,
    newStatus,
    updatedAt: new Date().toISOString(),
    userId
  };
  
  // Get connection info
  const userClientMap = userClients.get(userId);
  const connectionCount = userClientMap ? userClientMap.size : 0;
  console.log(`EVENTS: User ${userId} has ${connectionCount} active connections`);
  
  // Send to the specific user
  await sendEventToUser(userId, 'order-status-update', eventData);
}

/**
 * Get order details and send to the requester
 * This is called when a client connects and asks for initial order data
 * @param orderId The ID of the order to fetch
 * @param controller The stream controller to send the order details to
 */
export async function sendOrderDetails(orderId: string, controller: StreamController): Promise<void> {
  try {
    const ordersCollection = await getCollection("orders");
    const order = await ordersCollection?.findOne({ _id: new ObjectId(orderId) });
    
    if (!order) {
      console.log(`EVENTS: Order ${orderId} not found`);
      return;
    }
    
    const eventData = {
      order: {
        ...order,
        _id: order._id.toString(),
        userId: order.userId ? order.userId.toString() : null
      }
    };
    
    const eventString = `event: order-details\ndata: ${JSON.stringify(eventData)}\n\n`;
    controller.enqueue(eventString);
    
    console.log(`EVENTS: Sent details for order ${orderId}`);
  } catch (error) {
    console.error(`EVENTS: Error sending order details:`, error);
  }
}

/**
 * Add an admin client to the set of connected clients
 * @param id Client ID
 * @param controller Stream controller for sending events
 */
export async function addAdminClient(id: string, controller: StreamController): Promise<void> {
  adminClients.set(id, controller);
  connectionTimestamps.set(id, Date.now());
  connectionStatus.set(id, 'active');
  console.log(`Admin client ${id} added. Total admin clients: ${adminClients.size}`);
  
  // Send recent orders to the admin client
  await sendRecentOrdersToAdmin(controller);
}

/**
 * Send recent orders to a newly connected admin client
 * @param controller Stream controller to send orders to
 */
async function sendRecentOrdersToAdmin(controller: StreamController): Promise<void> {
  try {
    const ordersCollection = await getCollection("orders");
    
    // Get orders from the last 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const recentOrders = await ordersCollection?.find({
      createdAt: { $gte: cutoffTime }
    }).sort({ createdAt: -1 }).toArray();
    
    if (!recentOrders || recentOrders.length === 0) {
      console.log('EVENTS: No recent orders to send to admin');
      return;
    }
    
    console.log(`EVENTS: Sending ${recentOrders.length} recent orders to admin`);
    
    // Send each order as a new-order event
    for (const order of recentOrders) {
      const serializedOrder = {
        ...order,
        _id: order._id.toString(),
        userId: order.userId ? order.userId.toString() : null,
        createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt
      };
      
      const eventData = {
        type: 'new-order',
        order: serializedOrder
      };
      
      const eventString = `event: new-order\ndata: ${JSON.stringify(eventData)}\n\n`;
      controller.enqueue(eventString);
    }
    
    console.log('EVENTS: Finished sending recent orders to admin');
  } catch (error) {
    console.error('EVENTS: Error sending recent orders to admin:', error);
  }
}

/**
 * Remove an admin client from the set of connected clients
 * @param id Client ID
 */
export async function removeAdminClient(id: string): Promise<void> {
  adminClients.delete(id);
  connectionTimestamps.delete(id);
  connectionStatus.set(id, 'closed');
  console.log(`Admin client ${id} removed. Remaining admin clients: ${adminClients.size}`);
}

/**
 * Add a user client to the set of connected clients for that user
 * @param userId User ID
 * @param clientId Client ID
 * @param controller Stream controller for sending events
 */
export async function addUserClient(userId: string, clientId: string, controller: StreamController): Promise<void> {
  // Get or create the map for this user
  if (!userClients.has(userId)) {
    userClients.set(userId, new Map());
  }
  
  // Add the client to the user's map
  const userClientMap = userClients.get(userId)!;
  userClientMap.set(clientId, controller);
  
  // Track connection time and status
  connectionTimestamps.set(`user:${userId}:${clientId}`, Date.now());
  connectionStatus.set(`user:${userId}:${clientId}`, 'active');
  
  console.log(`User client ${clientId} connected for user ${userId}. Total connections for this user: ${userClientMap.size}`);
  
  // Send recent orders for this user
  await sendUserRecentOrders(userId, controller);
}

/**
 * Send recent orders to a newly connected user client
 * @param userId User ID to fetch orders for
 * @param controller Stream controller to send orders to
 */
async function sendUserRecentOrders(userId: string, controller: StreamController): Promise<void> {
  try {
    const ordersCollection = await getCollection("orders");
    
    // Get the user's orders with pending status
    const pendingOrders = await ordersCollection?.find({
      userId: new ObjectId(userId),
      status: { $in: ['pending', 'accepted', 'preparing'] }
    }).sort({ createdAt: -1 }).toArray();
    
    if (!pendingOrders || pendingOrders.length === 0) {
      console.log(`EVENTS: No pending orders to send to user ${userId}`);
      return;
    }
    
    console.log(`EVENTS: Sending ${pendingOrders.length} pending orders to user ${userId}`);
    
    // Send each order status
    for (const order of pendingOrders) {
      const eventData = {
        orderId: order._id.toString(),
        oldStatus: "",
        newStatus: order.status,
        updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : 
                  (order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date().toISOString()),
        userId: userId
      };
      
      const eventString = `event: order-status-update\ndata: ${JSON.stringify(eventData)}\n\n`;
      controller.enqueue(eventString);
    }
    
    console.log(`EVENTS: Finished sending pending orders to user ${userId}`);
  } catch (error) {
    console.error(`EVENTS: Error sending pending orders to user:`, error);
  }
}

/**
 * Remove a user client from the set of connected clients for that user
 * @param userId User ID
 * @param clientId Client ID
 */
export async function removeUserClient(userId: string, clientId: string): Promise<void> {
  // Safety check
  if (!userClients.has(userId)) {
    console.log(`No clients found for user ${userId}, nothing to remove`);
    return;
  }
  
  // Get the map for this user
  const userClientMap = userClients.get(userId)!;
  
  // Remove the client from the user's map
  userClientMap.delete(clientId);
  connectionTimestamps.delete(`user:${userId}:${clientId}`);
  connectionStatus.set(`user:${userId}:${clientId}`, 'closed');
  
  console.log(`User client ${clientId} disconnected from user ${userId}. Remaining connections: ${userClientMap.size}`);
  
  // If the user has no more clients, remove them from the map
  if (userClientMap.size === 0) {
    userClients.delete(userId);
    console.log(`Removed user ${userId} from client tracking (no more connections)`);
  }
}

/**
 * Utility function to check if a connection is still valid
 * Returns true if connection is likely still valid
 */
export async function isConnectionValid(controllerKey: string): Promise<boolean> {
  // Get timestamp when connection was established
  const timestamp = connectionTimestamps.get(controllerKey);
  if (!timestamp) return false;
  
  // Get current status
  const status = connectionStatus.get(controllerKey);
  if (status !== 'active') return false;
  
  // Connection is valid if it has an active status
  return true;
}

/**
 * Utility function to get stats about current connections
 */
export async function getConnectionStats() {
  return {
    adminCount: adminClients.size,
    userCount: userClients.size,
    totalUserConnections: Array.from(userClients.values())
      .reduce((total, map) => total + map.size, 0),
    connectionAges: Array.from(connectionTimestamps.entries())
      .map(([key, timestamp]) => ({
        key,
        age: Math.floor((Date.now() - timestamp) / 1000) // Age in seconds
      }))
  };
} 