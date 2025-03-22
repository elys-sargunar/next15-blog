import { NextRequest, NextResponse } from 'next/server';
import getAuthUser from '@/lib/getAuthUser';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

// Define the type for status update event data
interface StatusUpdateEventData {
  orderId: string;
  oldStatus: string;
  newStatus: string;
  updatedAt: string;
  [key: string]: unknown; // Allow additional properties
}

// Keep track of connected clients
const userClients = new Map<string, Set<{
  id: string;
  controller: ReadableStreamDefaultController;
}>>();

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

// SSE endpoint for real-time order updates for a specific user
export async function GET(request: NextRequest) {
  try {
    // Only allow authenticated users
    const authUser = await getAuthUser();
    console.log(request)
    if (!authUser) {
      console.log('SSE connection rejected: User not authenticated');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = authUser.userId as string;
    console.log(`SSE connection request from user ${userId}`);
    
    // Create a unique ID for this connection
    const clientId = Math.random().toString(36).substring(2, 15);
    
    // Set up the SSE stream
    const stream = new ReadableStream({
      start(controller) {
        console.log(`Starting SSE stream for user ${userId}, client ${clientId}`);
        // Initialize user's connections set if it doesn't exist
        if (!userClients.has(userId)) {
          userClients.set(userId, new Set());
        }
        
        // Add this client to the user's set of connected clients
        userClients.get(userId)!.add({ id: clientId, controller });
        
        // Send initial connection event
        controller.enqueue(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);
        console.log(`Client ${clientId} connected for user ${userId}`);
        
        // Keep the connection alive with a comment every 15 seconds (reduced from 30)
        const interval = setInterval(() => {
          try {
            controller.enqueue(": keepalive\n\n");
          } catch (e) {
            // Connection was closed
            console.log(`Keepalive failed for client ${clientId}, user ${userId}:`, e);
            clearInterval(interval);
          }
        }, 15000);
      },
      cancel(reason) {
        // Remove this client when they disconnect
        console.log(`SSE connection cancelled for client ${clientId}, user ${userId}:`, reason);
        const userConnections = userClients.get(userId);
        if (userConnections) {
          userConnections.delete(Array.from(userConnections).find(client => client.id === clientId)!);
          console.log(`Removed client ${clientId} for user ${userId}`);
          
          // Clean up if there are no more connections for this user
          if (userConnections.size === 0) {
            userClients.delete(userId);
            console.log(`Removed empty connection set for user ${userId}`);
          }
        }
      }
    });
    
    // Return the SSE response with appropriate headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Prevents buffering in Nginx
      },
    });
  } catch (error) {
    console.error('Error setting up SSE connection:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 