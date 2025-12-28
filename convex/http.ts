import { httpRouter } from "convex/server";
import { streamPersistentDemo } from "./persistentStreaming";

const http = httpRouter();

http.route({
  path: "/persistent-stream",
  method: "POST",
  handler: streamPersistentDemo,
});

export default http;




