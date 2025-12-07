"use client";

import { useEffect, useState } from "react";
import { appendMessage, createTask, listMessages } from "@/lib/convex/actions";

type Message = {
  _id: string;
  content: string;
  role: string;
  sequence: number;
};

export default function ConvexDemoPage() {
  const [taskId, setTaskId] = useState<string>("");
  const [title, setTitle] = useState("Convex demo task");
  const [messageText, setMessageText] = useState("Hello from Convex");
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshMessages = async (id: string) => {
    try {
      const data = await listMessages(id);
      setMessages(data ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load messages");
    }
  };

  const handleCreateTask = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await createTask({
        title,
        repoFullName: "shadow/demo",
        repoUrl: "https://github.com/shadow/demo",
        userId,
      });
      setTaskId(result.taskId);
      await refreshMessages(result.taskId);
    } catch (err) {
      console.error(err);
      setError("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!taskId) {
      setError("Create a task first.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await appendMessage({
        taskId,
        role: "USER",
        content: messageText,
      });
      setMessageText("");
      await refreshMessages(taskId);
    } catch (err) {
      console.error(err);
      setError("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      void refreshMessages(taskId);
    }
  }, [taskId]);

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Convex Demo</h1>
      <p className="text-sm text-muted-foreground">
        Minimal happy path: create a task and append chat messages via Convex
        actions. Set NEXT_PUBLIC_CONVEX_URL to point to your Convex deployment.
      </p>

      <div className="flex flex-col gap-2 rounded border p-4">
        <label className="text-sm font-medium">User Id</label>
        <input
          className="rounded border px-2 py-1"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Convex user id"
        />
        <label className="text-sm font-medium">Task title</label>
        <input
          className="rounded border px-2 py-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          onClick={handleCreateTask}
          disabled={loading}
        >
          Create task
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded border p-4">
        <label className="text-sm font-medium">Message</label>
        <textarea
          className="rounded border px-2 py-1"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
        />
        <button
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          onClick={handleSendMessage}
          disabled={loading}
        >
          Send message
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-2 rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Messages</h2>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => (taskId ? refreshMessages(taskId) : undefined)}
            disabled={!taskId || loading}
          >
            Refresh
          </button>
        </div>
        {!messages.length ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {messages.map((m) => (
              <li
                key={m._id}
                className="rounded border px-3 py-2 text-sm"
              >{`${m.sequence} [${m.role}] ${m.content}`}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
