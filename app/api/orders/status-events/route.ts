import { NextRequest, NextResponse } from 'next/server';
import getAuthUser from '@/lib/getAuthUser';
import { addUserClient, removeUserClient } from '@/actions/events';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

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
        
        // Add this client to the user's set of connected clients
        addUserClient(userId, clientId, controller);
        
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
        removeUserClient(userId, clientId);
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
