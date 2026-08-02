"use client";

import { useState } from "react";
import type { ActiveLayer } from "@/lib/active-layers";
import type { SortDirection } from "@/lib/power-user/sort";
import { deleteView, getSavedViews, renameView, saveView, type SavedView } from "@/lib/saved-views";

interface Props {
  currentSelections: ActiveLayer[];
  currentSortBy: ActiveLayer | null;
  currentDirection: SortDirection;
  onRestore: (view: SavedView) => void;
}

/**
 * Save/restore/rename/delete named power-user views. No modal anywhere --
 * inline name input instead, matching the project's no-boilerplate
 * developer preference and the absence of a modal pattern elsewhere in
 * mapstack-us (see .pHive/design/power-user-saved-views/brief.md).
 */
export function SavedViewsPanel({ currentSelections, currentSortBy, currentDirection, onRestore }: Props) {
  const [views, setViews] = useState<SavedView[]>(() => getSavedViews());
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const view = saveView(trimmed, currentSelections, currentSortBy, currentDirection);
    setViews((prev) => [...prev, view]);
    setName("");
    setNaming(false);
  }

  function handleDelete(id: string, viewName: string) {
    if (!window.confirm(`Delete saved view "${viewName}"?`)) return;
    deleteView(id);
    setViews((prev) => prev.filter((v) => v.id !== id));
  }

  function handleRenameSubmit(id: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renameView(id, trimmed);
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name: trimmed } : v)));
    setRenamingId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {naming ? (
        <div className="flex items-center gap-1">
          <label htmlFor="saved-view-name" className="sr-only">
            View name
          </label>
          <input
            id="saved-view-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="View name"
            className="w-full rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs dark:border-zinc-700"
            autoFocus
          />
          <button type="button" onClick={handleSave} className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setNaming(false);
              setName("");
            }}
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          disabled={currentSelections.length < 2}
          aria-label="Save current view"
          className="rounded border border-zinc-200 px-2 py-1 text-left text-xs font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
        >
          Save current view...
        </button>
      )}

      {views.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No saved views yet. Select layers above, then Save current view to keep them.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {views.map((view) => (
            <li
              key={view.id}
              className="flex flex-col gap-0.5 rounded border border-zinc-100 p-1.5 dark:border-zinc-800"
            >
              {renamingId === view.id ? (
                <div className="flex items-center gap-1">
                  <label htmlFor={`rename-${view.id}`} className="sr-only">
                    Rename saved view: {view.name}
                  </label>
                  <input
                    id={`rename-${view.id}`}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="w-full rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs dark:border-zinc-700"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameSubmit(view.id)}
                    className="text-xs font-medium text-zinc-900 dark:text-zinc-50"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{view.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(view)}
                      aria-label={`Restore saved view: ${view.name}`}
                      className="text-xs text-zinc-600 underline dark:text-zinc-400"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(view.id);
                        setRenameValue(view.name);
                      }}
                      aria-label={`Rename saved view: ${view.name}`}
                      className="text-xs text-zinc-600 underline dark:text-zinc-400"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(view.id, view.name)}
                      aria-label={`Delete saved view: ${view.name}`}
                      className="text-xs text-zinc-600 underline dark:text-zinc-400"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
