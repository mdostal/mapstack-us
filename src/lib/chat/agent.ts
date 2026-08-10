import { ToolLoopAgent } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { chatTools } from "@/lib/chat/tools";

export type ChatProvider = "anthropic" | "openai" | "google";

export interface ChatProviderInfo {
  id: ChatProvider;
  label: string;
  keyPlaceholder: string;
  keyHelpUrl: string;
}

/**
 * The three supported BYOK providers. Every one is verified live (real
 * CORS preflight checks against the provider's own API, before writing
 * this) to allow a direct browser request with no server this project
 * runs or controls -- see the per-provider notes in createChatAgent().
 */
export const CHAT_PROVIDERS: ChatProviderInfo[] = [
  { id: "anthropic", label: "Anthropic (Claude)", keyPlaceholder: "sk-ant-...", keyHelpUrl: "https://console.anthropic.com/settings/keys" },
  { id: "openai", label: "OpenAI (GPT)", keyPlaceholder: "sk-...", keyHelpUrl: "https://platform.openai.com/api-keys" },
  { id: "google", label: "Google (Gemini)", keyPlaceholder: "AIza...", keyHelpUrl: "https://aistudio.google.com/apikey" },
];

const INSTRUCTIONS =
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
  "leans heavily on one dataset, and disclose any real limitation it names.";

/**
 * BYOK, fully client-side for all three providers -- no server route
 * anywhere in this path. The visitor's own key is used to call the
 * provider's API DIRECTLY from the browser; it never transits any server
 * this project controls (this site has none). Each provider needed its
 * own real, live verification before being added here -- none of this is
 * assumed from documentation alone:
 *
 * - **Anthropic**: needs BOTH `dangerouslyAllowBrowser`-equivalent SDK
 *   construction AND the `anthropic-dangerous-direct-browser-access: true`
 *   request header -- confirmed live via a real CORS preflight (OPTIONS
 *   to api.anthropic.com/v1/messages): absent that header, the preflight
 *   returns "Disallowed CORS origin"; present, it returns
 *   access-control-allow-origin: *.
 * - **OpenAI**: no special header or SDK flag needed -- a real CORS
 *   preflight (OPTIONS to api.openai.com/v1/chat/completions) already
 *   returns access-control-allow-origin echoing the request Origin, for
 *   plain `authorization`/`content-type` headers.
 * - **Google (Gemini)**: same -- a real CORS preflight (OPTIONS to
 *   generativelanguage.googleapis.com) already returns
 *   access-control-allow-origin echoing the request Origin, for plain
 *   `content-type`/`x-goog-api-key` headers, no special opt-in needed.
 *
 * The key itself: caller-supplied, held only in the caller's own state
 * (see ChatPanel.tsx for where it's read from/written to -- localStorage
 * or memory-only, the visitor's choice, stored per-provider). This
 * module never persists it anywhere itself.
 */
export function createChatAgent(provider: ChatProvider, apiKey: string) {
  const model = (() => {
    switch (provider) {
      case "anthropic": {
        const anthropic = createAnthropic({
          apiKey,
          headers: { "anthropic-dangerous-direct-browser-access": "true" },
        });
        return anthropic("claude-sonnet-4-5");
      }
      case "openai": {
        const openai = createOpenAI({ apiKey });
        return openai("gpt-4o");
      }
      case "google": {
        const google = createGoogleGenerativeAI({ apiKey });
        return google("gemini-2.0-flash");
      }
    }
  })();

  return new ToolLoopAgent({
    model,
    instructions: INSTRUCTIONS,
    tools: chatTools,
  });
}
