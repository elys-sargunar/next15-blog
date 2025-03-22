import "server-only"

import { jwtVerify, SignJWT } from "jose"
import { cookies } from "next/headers"

const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey)

// Define proper types for session payload
interface SessionPayload {
  userId: string;
  expiresAt: Date;
  [key: string]: unknown; // Allow for additional properties if needed
}

export async function encrypt(payload: SessionPayload): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({alg: "HS256"})
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(encodedKey)
}

export async function decrypt(session: string): Promise<SessionPayload | undefined> {
    try {
        const {payload} = await jwtVerify(session, encodedKey, {
            algorithms: ["HS256"]
        })        
        return payload as SessionPayload;
    } catch (error) {
        console.log("Failed to verify session.")
        //throw new Error('Failed to verify session.');
    }
}

export async function createSession(userId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    const session = await encrypt({userId, expiresAt})
    const cookieStore = await cookies();

    cookieStore.set("userSession", session, {
        httpOnly: true,
        secure: true,
        expires: expiresAt,
        sameSite: "lax",
        path: "/"
    })
}