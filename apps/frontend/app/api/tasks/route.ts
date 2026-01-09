import { getUser } from "@/lib/auth/get-user";
import { createTask } from "@/lib/actions/create-task";
import { getTasks } from "@/lib/db-operations/get-tasks";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await getTasks(user.id);

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accept multipart/form-data to avoid Server Actions on the client.
    const formData = await request.formData();
    const taskId = await createTask(formData);

    return NextResponse.json({ taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating task:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
