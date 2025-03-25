import { NextRequest, NextResponse } from 'next/server';
import getAuthUser from '@/lib/getAuthUser';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { addAdminClient, removeAdminClient, isConnectionValid } from '@/actions/events';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

// SSE endpoint for real-time order updates
export async function GET(request: NextRequest) {
  let clientId = ''; // For error handling
  let abortController: AbortController | null = null;
  
  try {
    console.log('API: Admin SSE connection request received');
    
    // Only allow admins to connect
    const authUser = await getAuthUser();
    
    if (!authUser) {
      console.log('API: Admin SSE connection rejected: User not authenticated');
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
      console.log(`API: Admin SSE connection rejected: User ${authUser.userId} is not an admin`);
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }
    
    const userId = authUser.userId as string;
    console.log(`API: Admin SSE connection request received from admin user ${userId}`);
    console.log(`API: Request headers:`, JSON.stringify(Object.fromEntries(request.headers.entries())));
    
    // Create a unique ID for this connection
    clientId = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    console.log(`API: Generated admin client ID ${clientId}`);
    
    // Create abort controller to handle cancellation
    abortController = new AbortController();
    
    // Set up the SSE stream
    const stream = new ReadableStream({
      start(controller) {
        try {
          console.log(`API: Starting admin SSE stream for client ${clientId}`);
          
          // Add this client to the set of connected admin clients
          addAdminClient(clientId, controller);
          
          // Send initial connection event
          controller.enqueue(`event: connected\ndata: {"clientId":"${clientId}","isAdmin":true,"userId":"${userId}"}\n\n`);
          console.log(`API: Admin client ${clientId} connected and registered for notifications`);
          
          // If the abort controller is triggered, close the connection
          abortController?.signal.addEventListener('abort', () => {
            console.log(`API: Connection aborted for admin client ${clientId}`);
            try {
              removeAdminClient(clientId);
            } catch (e) {
              console.error(`API: Error removing admin client ${clientId} on abort:`, e);
            }
          });
          
          // Send test event
          setTimeout(() => {
            // Check if the connection is still valid
            isConnectionValid(clientId).then(isValid => {
              if (isValid) {
                try {
                  controller.enqueue(`event: test\ndata: {"message":"Admin connection test"}\n\n`);
                  console.log(`API: Sent test event to admin client ${clientId}`);
                } catch (e) {
                  console.error(`API: Failed to send test event to admin client ${clientId}:`, e);
                  removeAdminClient(clientId);
                }
              } else {
                console.log(`API: Not sending test event - connection invalid for admin client ${clientId}`);
              }
            });
          }, 2000);
          
          // Keep the connection alive with a comment every 15 seconds
          const interval = setInterval(() => {
            // Only send keepalive if the connection is still valid
            isConnectionValid(clientId).then(isValid => {
              if (isValid) {
                try {
                  controller.enqueue(": keepalive\n\n");
                  console.log(`API: Sent keepalive to admin client ${clientId}`);
                } catch (e) {
                  // Connection was closed
                  clearInterval(interval);
                  console.log(`API: Keepalive failed for admin client ${clientId}:`, e);
                  // Cleanup
                  removeAdminClient(clientId);
                }
              } else {
                // Connection is no longer valid
                console.log(`API: Connection no longer valid for admin client ${clientId}. Cleaning up.`);
                clearInterval(interval);
                removeAdminClient(clientId);
              }
            });
          }, 15000);
          
          // Handle automatic cleanup after a long period (8 hours)
          // This helps prevent memory leaks from abandoned connections
          const maxConnectionTime = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
          const cleanupTimeout = setTimeout(() => {
            console.log(`API: Maximum connection time reached for admin client ${clientId}. Closing connection.`);
            try {
              removeAdminClient(clientId);
              // Try to notify the client that they need to reconnect
              controller.enqueue(`event: reconnect\ndata: {"message":"Connection timeout reached. Please reconnect."}\n\n`);
            } catch (e) {
              console.error(`API: Error during timeout cleanup for admin client ${clientId}:`, e);
            }
            clearInterval(interval);
          }, maxConnectionTime);
          
          // Clean up the timeout if the connection is cancelled
          request.signal.addEventListener('abort', () => {
            clearTimeout(cleanupTimeout);
          });
        } catch (e) {
          console.error(`API: Error in stream start for admin client ${clientId}:`, e);
          // Try to inform the client about the error
          try {
            controller.enqueue(`event: error\ndata: {"message":"Server error setting up admin connection"}\n\n`);
          } catch (sendError) {
            console.error('API: Failed to send error to admin client:', sendError);
          }
        }
      },
      cancel() {
        // Remove this client when they disconnect
        console.log(`API: Admin client ${clientId} disconnected`);
        removeAdminClient(clientId);
      }
    });
    
    // Return the SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Prevents buffering in Nginx
        'Transfer-Encoding': 'chunked'
      },
    });
  } catch (error) {
    console.error(`API: Error setting up admin SSE connection for client ${clientId}:`, error);
    
    // Abort the controller if it exists
    if (abortController) {
      try {
        abortController.abort();
      } catch (abortError) {
        console.error(`API: Error aborting controller for admin client ${clientId}:`, abortError);
      }
    }
    
    // Clean up if clientId was created
    if (clientId) {
      try {
        removeAdminClient(clientId);
      } catch (cleanupError) {
        console.error('API: Error while cleaning up failed admin client connection:', cleanupError);
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 