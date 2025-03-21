import { NextRequest, NextResponse } from 'next/server';
import getAuthUser from '@/lib/getAuthUser';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

// Keep track of connected clients
const clients = new Set<{
  id: string;
  controller: ReadableStreamDefaultController;
}>();

// Function to send an event to all connected admin clients
export async function sendEventToAdmins(event: string, data: any) {
  const encodedData = JSON.stringify(data);
  
  for (const client of clients) {
    try {
      client.controller.enqueue(
        `event: ${event}\ndata: ${encodedData}\n\n`
      );
    } catch (error) {
      console.error(`Error sending event to client ${client.id}:`, error);
      // Remove the client if we can't send to it
      clients.delete(client);
    }
  }
}

// SSE endpoint for real-time order updates
export async function GET(request: NextRequest) {
  // Only allow admins to connect
  const authUser = await getAuthUser();
  
  if (!authUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Verify admin status
  const usersCollection = await getCollection("users");
  const userData = await usersCollection?.findOne({ 
    _id: ObjectId.createFromHexString(authUser.userId as string) 
  });
  
  if (!userData || !userData.isAdmin) {
    return NextResponse.json(
      { error: "Access denied. Admin privileges required." },
      { status: 403 }
    );
  }
  
  // Create a unique ID for this connection
  const clientId = Math.random().toString(36).substring(2, 15);
  
  // Set up the SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the set of connected clients
      clients.add({ id: clientId, controller });
      
      // Send initial connection event
      controller.enqueue(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);
      
      // Keep the connection alive with a comment every 30 seconds
      const interval = setInterval(() => {
        try {
          controller.enqueue(": keepalive\n\n");
        } catch (e) {
          // Connection was closed
          clearInterval(interval);
        }
      }, 30000);
    },
    cancel() {
      // Remove this client when they disconnect
      clients.delete(Array.from(clients).find(client => client.id === clientId)!);
    }
  });
  
  // Return the SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 