"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DirectChatTransport } from "ai";
import { createChatAgent } from "@/lib/chat/agent";

const STORAGE_KEY = "mapstack_byok_anthropic_key";

/**
 * Chat with the data -- BYOK (bring your own key), fully client-side.
 * See src/lib/chat/agent.ts for the real, verified mechanism (no server
 * route anywhere in this path; the key goes straight from this browser
 * to api.anthropic.com). The disclosure text below is not boilerplate --
 * it's the actual, complete description of what happens to a visitor's
 * key, matching explicit operator direction to "be very transparent on
 * how that is used, what it enables."
 */
export function ChatPanel() {
  const [apiKey, setApiKey] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY),
  );
  const [keyInput, setKeyInput] = useState("");
  const [remember, setRemember] = useState(true);
  const [input, setInput] = useState("");

  const agent = useMemo(() => (apiKey ? createChatAgent(apiKey) : null), [apiKey]);
  const transport = useMemo(() => (agent ? new DirectChatTransport({ agent }) : undefined), [agent]);
  const { messages, sendMessage, status, error } = useChat({ transport });

  function submitKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    if (remember) window.localStorage.setItem(STORAGE_KEY, trimmed);
    setApiKey(trimmed);
    setKeyInput("");
  }

  function forgetKey() {
    window.localStorage.removeItem(STORAGE_KEY);
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
          <li>You paste your own Anthropic API key below. It is sent directly from your browser to api.anthropic.com -- it never touches Mapstack&apos;s servers, because Mapstack has none.</li>
          <li>By default the key is saved only in this browser&apos;s local storage so you don&apos;t have to re-enter it; you can opt out of that below, or forget it any time.</li>
          <li>Like anything used client-side, your key is visible in this browser&apos;s network/dev tools while a request is in flight. Don&apos;t use a key you wouldn&apos;t want a technically capable visitor on this device to see.</li>
          <li>The assistant can only call a small, fixed set of read-only lookup tools on this site&apos;s real public data (city search, dataset values, ranking) -- it has no access to site code, secrets, or anything else, and can&apos;t write or change anything.</li>
          <li>Usage is billed by Anthropic directly to your own account, at their standard API rates -- Mapstack has no visibility into or control over that billing.</li>
        </ul>
      </div>

      {!apiKey ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Anthropic API key</span>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-..."
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
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Chatting with your own key.</span>
            <button type="button" onClick={forgetKey} className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              Forget key
            </button>
          </div>

          <div data-testid="chat-messages" className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
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
            <p className="text-xs text-red-600 dark:text-red-400">
              {error.message || "Something went wrong talking to Anthropic. Check your key and try again."}
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
