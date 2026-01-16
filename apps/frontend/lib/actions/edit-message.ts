"use server";

// Stub: Using Convex-native - edit messages via Convex mutations
export async function editMessage(formData: FormData) {
  const messageId = formData.get("messageId") as string;
  console.log(`[STUB] editMessage called for ${messageId} - use Convex mutation`);
  throw new Error("Use Convex mutation api.messages.update");
}
