import { NextRequest, NextResponse } from 'next/server';
import { addGuestClient, removeGuestClient } from '@/actions/events';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

// SSE endpoint for real-time order updates for guest users
export async function GET(request: NextRequest) {
  try {
    // Get the order ID from the query parameters
    const orderId = request.nextUrl.searchParams.get('orderId');
    
    if (!orderId) {
      console.log('Guest SSE connection rejected: Missing order ID');
      return NextResponse.json(
        { error: "Missing order ID" },
        { status: 400 }
      );
    }
    
    console.log(`Guest SSE connection request for order ${orderId}`);
    
    // Create a unique ID for this connection
    const clientId = Math.random().toString(36).substring(2, 15);
    
    // Set up the SSE stream
    const stream = new ReadableStream({
      start(controller) {
        console.log(`Starting SSE stream for guest order ${orderId}, client ${clientId}`);
        
        // Add this client to the order's set of connected clients
        addGuestClient(orderId, clientId, controller);
        
        // Send initial connection event
        controller.enqueue(`event: connected\ndata: {"clientId":"${clientId}", "orderId":"${orderId}"}\n\n`);
        console.log(`Guest client ${clientId} connected for order ${orderId}`);
        
        // Keep the connection alive with a comment every 15 seconds
        const interval = setInterval(() => {
          try {
            controller.enqueue(": keepalive\n\n");
          } catch (e) {
            // Connection was closed
            console.log(`Keepalive failed for guest client ${clientId}, order ${orderId}:`, e);
            clearInterval(interval);
          }
        }, 15000);
      },
      cancel(reason) {
        // Remove this client when they disconnect
        console.log(`SSE connection cancelled for guest client ${clientId}, order ${orderId}:`, reason);
        removeGuestClient(orderId, clientId);
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
    console.error('Error setting up guest SSE connection:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 