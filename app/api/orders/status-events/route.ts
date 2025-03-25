import { NextRequest, NextResponse } from 'next/server';
import getAuthUser from '@/lib/getAuthUser';
import { addUserClient, removeUserClient, isConnectionValid } from '@/actions/events';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

// SSE endpoint for real-time order updates for a specific user
export async function GET(request: NextRequest) {
  let clientId = ''; // Moved out of try block for error handling
  let userId = '';   // Moved out of try block for error handling
  let abortController: AbortController | null = null;
  
  try {
    console.log('API: User SSE connection request received');
    
    // Get the authenticated user
    const authUser = await getAuthUser();
    
    // Check for authentication
    if (!authUser || !authUser.userId) {
      console.log('API: SSE connection rejected: User not authenticated');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    userId = authUser.userId as string;
    console.log(`API: SSE connection request received from user ${userId}`);
    console.log(`API: Request headers:`, JSON.stringify(Object.fromEntries(request.headers.entries())));
    
    // Create a unique ID for this connection
    clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    console.log(`API: Generated client ID ${clientId} for user ${userId}`);
    
    // Create abort controller to handle cancellation
    abortController = new AbortController();
    
    // Set up the SSE stream
    const stream = new ReadableStream({
      start(controller) {
        console.log(`API: Starting SSE stream for user ${userId}, client ${clientId}`);
        
        try {
          // Add this client to the user's set of connected clients
          addUserClient(userId, clientId, controller);
          
          // Send initial connection event with user ID to confirm identity
          controller.enqueue(`event: connected\ndata: {"clientId":"${clientId}","userId":"${userId}"}\n\n`);
          console.log(`API: Client ${clientId} connected for user ${userId} and registered for notifications`);
          
          // If the abort controller is triggered, close the connection
          abortController?.signal.addEventListener('abort', () => {
            console.log(`API: Connection aborted for client ${clientId}, user ${userId}`);
            try {
              removeUserClient(userId, clientId);
            } catch (e) {
              console.error(`API: Error removing client ${clientId} on abort:`, e);
            }
          });
          
          // Send a test event shortly after connection to verify everything works
          setTimeout(() => {
            // Check if the connection is still valid
            isConnectionValid(`user:${userId}:${clientId}`).then(isValid => {
              if (isValid) {
                try {
                  controller.enqueue(`event: test\ndata: {"message":"Connection test for user ${userId}"}\n\n`);
                  console.log(`API: Sent test event to client ${clientId} for user ${userId}`);
                } catch (e) {
                  console.error(`API: Failed to send test event to client ${clientId}:`, e);
                  // Remove the client if we can't send to it
                  removeUserClient(userId, clientId);
                }
              } else {
                console.log(`API: Not sending test event - connection invalid for client ${clientId}, user ${userId}`);
              }
            });
          }, 2000);
          
          // Keep the connection alive with a comment every 15 seconds
          const interval = setInterval(() => {
            // Only send keepalive if the connection is still valid
            isConnectionValid(`user:${userId}:${clientId}`).then(isValid => {
              if (isValid) {
                try {
                  controller.enqueue(": keepalive\n\n");
                  console.log(`API: Sent keepalive to client ${clientId}, user ${userId}`);
                } catch (e) {
                  // Connection was closed
                  console.log(`API: Keepalive failed for client ${clientId}, user ${userId}:`, e);
                  clearInterval(interval);
                  removeUserClient(userId, clientId);
                }
              } else {
                // Connection is no longer valid
                console.log(`API: Connection no longer valid for client ${clientId}, user ${userId}. Cleaning up.`);
                clearInterval(interval);
                removeUserClient(userId, clientId);
              }
            });
          }, 15000);
          
          // Handle automatic cleanup after a long period (8 hours)
          // This helps prevent memory leaks from abandoned connections
          const maxConnectionTime = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
          const cleanupTimeout = setTimeout(() => {
            console.log(`API: Maximum connection time reached for client ${clientId}, user ${userId}. Closing connection.`);
            try {
              removeUserClient(userId, clientId);
              // Try to notify the client that they need to reconnect
              controller.enqueue(`event: reconnect\ndata: {"message":"Connection timeout reached. Please reconnect."}\n\n`);
            } catch (e) {
              console.error(`API: Error during timeout cleanup for client ${clientId}:`, e);
            }
            clearInterval(interval);
          }, maxConnectionTime);
          
          // Clean up the timeout if the connection is cancelled
          request.signal.addEventListener('abort', () => {
            clearTimeout(cleanupTimeout);
          });
        } catch (e) {
          console.error(`API: Error in stream start for client ${clientId}, user ${userId}:`, e);
          // Try to inform the client about the error
          try {
            controller.enqueue(`event: error\ndata: {"message":"Server error setting up connection"}\n\n`);
          } catch (sendError) {
            console.error('API: Failed to send error to client:', sendError);
          }
        }
      },
      cancel(reason) {
        // Remove this client when they disconnect
        console.log(`API: SSE connection cancelled for client ${clientId}, user ${userId}:`, reason);
        // Safely remove the client
        if (userId && clientId) {
          removeUserClient(userId, clientId);
        }
      }
    });
    
    // Return the SSE response with appropriate headers to prevent caching
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
    console.error(`API: Error setting up SSE connection for client ${clientId}, user ${userId}:`, error);
    
    // Abort the controller if it exists
    if (abortController) {
      try {
        abortController.abort();
      } catch (abortError) {
        console.error(`API: Error aborting controller for client ${clientId}:`, abortError);
      }
    }
    
    // Safely remove the client if it was created but then errored
    if (userId && clientId) {
      try {
        removeUserClient(userId, clientId);
      } catch (cleanupError) {
        console.error('API: Error while cleaning up failed client connection:', cleanupError);
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 
