'use server'

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
  [key: string]: unknown; // Allow additional properties
}

// Keep track of connected admin clients
const adminClients = new Set<{
  id: string;
  controller: ReadableStreamDefaultController;
}>();

// Keep track of connected user clients
const userClients = new Map<string, Set<{
  id: string;
  controller: ReadableStreamDefaultController;
}>>();

// Function to send an event to all connected admin clients
export async function sendEventToAdmins(event: string, data: OrderEventData): Promise<void> {
  const encodedData = JSON.stringify(data);
  
  for (const client of adminClients) {
    try {
      client.controller.enqueue(
        `event: ${event}\ndata: ${encodedData}\n\n`
      );
    } catch (error) {
      console.error(`Error sending event to client ${client.id}:`, error);
      // Remove the client if we can't send to it
      adminClients.delete(client);
    }
  }
}

// Function to send an event to a specific user's connected clients
export async function sendEventToUser(userId: string, event: string, data: StatusUpdateEventData): Promise<void> {
  const encodedData = JSON.stringify(data);
  const userConnections = userClients.get(userId);
  
  if (!userConnections) {
    console.log(`No active connections found for user ${userId}`);
    return;
  }
  
  let failedClients = 0;
  for (const client of userConnections) {
    try {
      client.controller.enqueue(
        `event: ${event}\ndata: ${encodedData}\n\n`
      );
      console.log(`Event '${event}' sent to client ${client.id} for user ${userId}`);
    } catch (error) {
      console.error(`Error sending event to client ${client.id} for user ${userId}:`, error);
      // Remove the client if we can't send to it
      userConnections.delete(client);
      failedClients++;
    }
  }
  
  if (failedClients > 0) {
    console.log(`Removed ${failedClients} failed clients for user ${userId}`);
  }
  
  // Clean up empty user connections
  if (userConnections.size === 0) {
    userClients.delete(userId);
    console.log(`Removed empty connection set for user ${userId}`);
  }
}

// Helper functions to manage client connections

// Add an admin client
export function addAdminClient(id: string, controller: ReadableStreamDefaultController): void {
  adminClients.add({ id, controller });
}

// Remove an admin client
export function removeAdminClient(id: string): void {
  const client = Array.from(adminClients).find(client => client.id === id);
  if (client) {
    adminClients.delete(client);
  }
}

// Add a user client
export function addUserClient(userId: string, clientId: string, controller: ReadableStreamDefaultController): void {
  if (!userClients.has(userId)) {
    userClients.set(userId, new Set());
  }
  
  userClients.get(userId)!.add({ id: clientId, controller });
}

// Remove a user client
export function removeUserClient(userId: string, clientId: string): void {
  const userConnections = userClients.get(userId);
  if (userConnections) {
    const client = Array.from(userConnections).find(client => client.id === clientId);
    if (client) {
      userConnections.delete(client);
    }
    
    // Clean up if there are no more connections for this user
    if (userConnections.size === 0) {
      userClients.delete(userId);
    }
  }
} 