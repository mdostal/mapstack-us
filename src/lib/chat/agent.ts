import { ToolLoopAgent } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { chatTools } from "@/lib/chat/tools";

/**
 * BYOK, fully client-side -- no server route anywhere in this path. The
 * visitor's own key is used to call api.anthropic.com DIRECTLY from the
 * browser; it never transits any server this project controls (this
 * site has none). Two things make that possible, both real and verified
 * live before writing this:
 *
 * 1. `dangerouslyAllowBrowser: true` is @ai-sdk/anthropic's own opt-in
 *    for constructing a provider outside a server context (unlike the
 *    raw @anthropic-ai/sdk, this package doesn't hard-block it, but the
 *    naming mirrors that SDK's identical guard on purpose -- the risk is
 *    the same one being accepted).
 * 2. Anthropic's API itself blocks cross-origin browser requests unless
 *    the `anthropic-dangerous-direct-browser-access: true` header is
 *    present on the actual request -- confirmed live via a real CORS
 *    preflight check (OPTIONS to api.anthropic.com/v1/messages): with
 *    that header absent from Access-Control-Request-Headers, the
 *    preflight returns "Disallowed CORS origin"; with it present, the
 *    server returns access-control-allow-origin: *. Both pieces are
 *    required together -- omitting either would break real usage, not
 *    just look risky.
 *
 * The key itself: caller-supplied, held only in the caller's own state
 * (see ChatPanel.tsx for where it's read from/written to -- localStorage
 * or memory-only, the visitor's choice). This module never persists it
 * anywhere itself.
 */
export function createChatAgent(apiKey: string) {
  const anthropic = createAnthropic({
    apiKey,
    headers: { "anthropic-dangerous-direct-browser-access": "true" },
  });

  return new ToolLoopAgent({
    model: anthropic("claude-sonnet-4-5"),
    instructions:
      "You are the Mapstack data assistant. You can only see what these tools expose: " +
      "real, sourced per-city dataset values on tools.mdostal.com/mapstack. You have no " +
      "access to site code, secrets, or anything outside these tools. Never invent a " +
      "value a tool didn't return -- if a tool returns found:false or an empty result, " +
      "say so plainly rather than guessing. When comparing or ranking cities, prefer " +
      "calling rank_cities or compare_cities over eyeballing individual get_layer_value " +
      "calls. Cite the real year a value is from when one is available. If a visitor " +
      "wants to weigh their own personal priorities (e.g. their own income, a health " +
      "condition, a preference for low crime) into a city recommendation, use " +
      "rank_cities with weights that reflect what they told you -- do not ask them to " +
      "upload documents here; this chat has no upload path, so just take their stated " +
      "priorities directly. Call get_methodology before making a recommendation that " +
      "leans heavily on one dataset, and disclose any real limitation it names.",
    tools: chatTools,
  });
}
