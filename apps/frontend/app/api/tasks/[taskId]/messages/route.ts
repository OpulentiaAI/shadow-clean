import { getTaskMessages } from "@/lib/db-operations/get-task-messages";
import { verifyTaskOwnership } from "@/lib/auth/verify-task-ownership";
import { getConvexClient, api } from "@/lib/convex/client";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const { error, user: _user } = await verifyTaskOwnership(taskId);
    if (error) return error;

    const messages = await getTaskMessages(taskId);

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const { error, user: _user } = await verifyTaskOwnership(taskId);
    if (error) return error;

    const body = await request.json();

    // Use Convex mutation to append message (Convex-native)
    try {
      const convex = getConvexClient();
      const result = await convex.mutation(api.messages.append, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        taskId: taskId as any,
        content: body.content || body.message || "",
        role: body.role || "USER",
      });

      return NextResponse.json({ success: true, messageId: result.messageId });
    } catch (convexError) {
      console.error("Convex message creation failed:", convexError);
      return NextResponse.json(
        { error: "Failed to send message via Convex" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
