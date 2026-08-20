"use client";

import { useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DirectChatTransport } from "ai";
import { createChatAgent, CHAT_PROVIDERS, type ChatProvider } from "@/lib/chat/agent";

function storageKeyFor(provider: ChatProvider) {
  return `mapstack_byok_${provider}_key`;
}

const PROVIDER_BILLING_LABEL: Record<ChatProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

/**
 * Chat with the data -- BYOK (bring your own key), fully client-side, now
 * across three providers (Anthropic, OpenAI, Google). See
 * src/lib/chat/agent.ts for the real, verified per-provider mechanism (no
 * server route anywhere in this path; the key goes straight from this
 * browser to the chosen provider's own API). The disclosure text below is
 * not boilerplate -- it's the actual, complete description of what
 * happens to a visitor's key, matching explicit operator direction to "be
 * very transparent on how that is used, what it enables." Anthropic
 * remains the default provider (unchanged from before multi-provider
 * support was added) so a visitor who never touches the selector gets the
 * exact same flow as always.
 */
export function ChatPanel() {
  const [provider, setProvider] = useState<ChatProvider>("anthropic");
  const [apiKey, setApiKey] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(storageKeyFor("anthropic")),
  );
  const [keyInput, setKeyInput] = useState("");
  const [remember, setRemember] = useState(true);
  const [input, setInput] = useState("");

  const providerInfo = CHAT_PROVIDERS.find((p) => p.id === provider)!;
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const agent = useMemo(() => (apiKey ? createChatAgent(provider, apiKey) : null), [provider, apiKey]);
  const transport = useMemo(() => (agent ? new DirectChatTransport({ agent }) : undefined), [agent]);
  const { messages, sendMessage, status, error } = useChat({ transport });

  function selectProvider(next: ChatProvider) {
    setProvider(next);
    setKeyInput("");
    setApiKey(typeof window === "undefined" ? null : window.localStorage.getItem(storageKeyFor(next)));
  }

  // Real WAI-ARIA APG radiogroup keyboard pattern -- a gap found live by
  // this project's own QA sweep: the provider selector had 3 separate Tab
  // stops with no arrow-key handling at all, deviating from how a real
  // radiogroup is expected to behave for keyboard/screen-reader users.
  // Left/Up moves to the previous option, Right/Down to the next, both
  // wrapping around; only the checked option is ever a real Tab stop
  // (roving tabindex), matching every other radio group's real behavior.
  function handleProviderKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % CHAT_PROVIDERS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + CHAT_PROVIDERS.length) % CHAT_PROVIDERS.length;
    }
    if (nextIndex === null) return;
    e.preventDefault();
    selectProvider(CHAT_PROVIDERS[nextIndex].id);
    radioRefs.current[nextIndex]?.focus();
  }

  function submitKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    if (remember) window.localStorage.setItem(storageKeyFor(provider), trimmed);
    setApiKey(trimmed);
    setKeyInput("");
  }

  function forgetKey() {
    window.localStorage.removeItem(storageKeyFor(provider));
    setApiKey(null);
  }

  function submitMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-semibold">How this works, in full:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>You paste your own {providerInfo.label} API key below. It is sent directly from your browser to {providerInfo.id}&apos;s own API -- it never touches Mapstack&apos;s servers, because Mapstack has none.</li>
          <li>By default the key is saved in this browser&apos;s local storage so you don&apos;t have to re-enter it; you can opt out of that below, or forget it any time. Each provider&apos;s key is stored separately. Mapstack is mounted at tools.mdostal.com/mapstack alongside sibling tools on that same origin, and browser storage is scoped per-origin, not per-path -- so this key is technically readable by any script running anywhere on tools.mdostal.com, not just Mapstack&apos;s own code.</li>
          <li>Like anything used client-side, your key is visible in this browser&apos;s network/dev tools while a request is in flight. Don&apos;t use a key you wouldn&apos;t want a technically capable visitor on this device to see.</li>
          <li>The assistant can only call a small, fixed set of read-only lookup tools on this site&apos;s real public data (city search, dataset values, ranking) -- it has no access to site code, secrets, or anything else, and can&apos;t write or change anything.</li>
          <li>Usage is billed by {PROVIDER_BILLING_LABEL[provider]} directly to your own account, at their standard API rates -- Mapstack has no visibility into or control over that billing.</li>
        </ul>
      </div>

      {!apiKey ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Provider</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Chat provider">
              {CHAT_PROVIDERS.map((p, index) => (
                <button
                  key={p.id}
                  ref={(el) => {
                    radioRefs.current[index] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={provider === p.id}
                  tabIndex={provider === p.id ? 0 : -1}
                  onClick={() => selectProvider(p.id)}
                  onKeyDown={(e) => handleProviderKeyDown(e, index)}
                  className={
                    "rounded border px-2 py-1 text-xs " +
                    (provider === p.id
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{providerInfo.label} API key</span>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={providerInfo.keyPlaceholder}
              className="rounded border border-zinc-200 bg-transparent px-2 py-1.5 text-xs dark:border-zinc-700"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember this key in this browser (local storage)
          </label>
          <button
            type="button"
            onClick={submitKey}
            disabled={!keyInput.trim()}
            className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Start chatting
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Chatting with your own key. <span className="text-zinc-400 dark:text-zinc-500">({PROVIDER_BILLING_LABEL[provider]})</span>
            </span>
            <button type="button" onClick={forgetKey} className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              Forget key
            </button>
          </div>

          <div
            data-testid="chat-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800"
          >
            {messages.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Ask about any city, dataset, or comparison -- e.g. &quot;how does Austin&apos;s violent crime rate compare to Denver&apos;s?&quot;
              </p>
            )}
            {messages.map((message) => (
              <div key={message.id} data-testid="chat-message" className={message.role === "user" ? "self-end text-right" : "self-start"}>
                <div
                  className={
                    "inline-block max-w-[85%] rounded-md px-2.5 py-1.5 text-xs " +
                    (message.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100")
                  }
                >
                  {message.parts.map((part, i) =>
                    part.type === "text" ? (
                      <span key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </span>
                    ) : part.type.startsWith("tool-") || part.type === "dynamic-tool" ? (
                      <span key={i} className="block text-[10px] italic opacity-70">
                        looked something up on the site&apos;s data…
                      </span>
                    ) : null,
                  )}
                </div>
              </div>
            ))}
            {(status === "submitted" || status === "streaming") && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">thinking…</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error.message || `Something went wrong talking to ${providerInfo.label}. Check your key and try again.`}
            </p>
          )}

          <form onSubmit={submitMessage} className="flex gap-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the data…"
              className="flex-1 rounded border border-zinc-200 bg-transparent px-2 py-1.5 text-xs dark:border-zinc-700"
            />
            <button
              type="submit"
              disabled={!input.trim() || status === "streaming" || status === "submitted"}
              className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
