"use client";

import { useState } from "react";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import {
  DEFAULT_WEIGHTS,
  FORMULA_COMPONENT_KEYS,
  FORMULA_COMPONENT_LABELS,
  getGrassComponents,
  recomputeGrassScore,
  type ComponentWeights,
} from "@/lib/formula/allergy-grass-formula";
import { deleteFormulaPreset, getFormulaPresets, saveFormulaPreset, type FormulaPreset } from "@/lib/formula-presets";

interface Props {
  selected: ActiveLayer[];
  selectedCityId: string | null;
  grassWeights: ComponentWeights;
  onGrassWeightsChange: (weights: ComponentWeights) => void;
  grassOverlayOn: boolean;
  onToggleGrassOverlay: () => void;
}

/**
 * "Describe how it works, and let the user change the calculation" --
 * explicit operator direction. Only allergy:grass has a real, decomposed,
 * documented formula (data/allergy-scoring.md) to tune; every other layer
 * (the 27 other allergens, both crime layers) gets an honest "nothing to
 * tune here" note instead of a fake control. Recomputed scores here can
 * optionally render as an ADDITIONAL map layer ("Show on map"), asterisked
 * and never replacing the shipped/validated Grass layer -- see
 * .pHive/design/power-user-formula-panel/design-note.md and
 * MultiLayerMap.tsx's CustomOverlay.
 */
export function FormulaPanel({
  selected,
  selectedCityId,
  grassWeights,
  onGrassWeightsChange,
  grassOverlayOn,
  onToggleGrassOverlay,
}: Props) {
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {selected.map((layer) => {
        const resolved = resolveActiveLayer(layer);
        if (!resolved) return null;
        const isGrass = layer.datasetId === "allergy" && layer.layerId === "grass";

        return (
          <div key={activeLayerKey(layer)} className="flex flex-col gap-2 text-xs">
            <span className="font-medium text-zinc-800 dark:text-zinc-100">
              {resolved.dataset.label}: {resolved.layer.label}
            </span>
            {isGrass ? (
              <GrassFormulaEditor
                selectedCityId={selectedCityId}
                weights={grassWeights}
                onWeightsChange={onGrassWeightsChange}
                overlayOn={grassOverlayOn}
                onToggleOverlay={onToggleGrassOverlay}
              />
            ) : (
              <p className="text-zinc-500 dark:text-zinc-400">
                No tunable formula for this layer — modeled directly (climate-zone lookup or
                real government rate), not a weighted formula.{" "}
                <a href={resolved.dataset.methodologyUrl} target="_blank" rel="noreferrer" className="underline">
                  See methodology
                </a>
                .
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const GRASS_LAYER_KEY = activeLayerKey({ datasetId: "allergy", layerId: "grass" });

interface GrassFormulaEditorProps {
  selectedCityId: string | null;
  weights: ComponentWeights;
  onWeightsChange: (weights: ComponentWeights) => void;
  overlayOn: boolean;
  onToggleOverlay: () => void;
}

function GrassFormulaEditor({
  selectedCityId,
  weights,
  onWeightsChange,
  overlayOn,
  onToggleOverlay,
}: GrassFormulaEditorProps) {
  const [presets, setPresets] = useState<FormulaPreset[]>(() => getFormulaPresets(GRASS_LAYER_KEY));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  if (!selectedCityId) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">
        Click a city (in the table or search) to see and adjust its grass-severity formula
        breakdown here.
      </p>
    );
  }

  const components = getGrassComponents(selectedCityId);
  if (!components) {
    return <p className="text-zinc-500 dark:text-zinc-400">No formula data for this city.</p>;
  }

  const shippedScore = recomputeGrassScore(components, DEFAULT_WEIGHTS);
  const adjustedScore = recomputeGrassScore(components, weights);
  const isDefault = FORMULA_COMPONENT_KEYS.every((key) => weights[key] === 1);

  function setWeight(key: (typeof FORMULA_COMPONENT_KEYS)[number], value: number) {
    onWeightsChange({ ...weights, [key]: value });
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset = saveFormulaPreset(GRASS_LAYER_KEY, trimmed, weights);
    setPresets((prev) => [...prev, preset]);
    setName("");
    setNaming(false);
  }

  function handleApply(preset: FormulaPreset) {
    onWeightsChange(preset.weights);
  }

  function handleDelete(id: string) {
    deleteFormulaPreset(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  function reset() {
    onWeightsChange(DEFAULT_WEIGHTS);
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-100 p-2 dark:border-zinc-800">
      {FORMULA_COMPONENT_KEYS.map((key) => (
        <div key={key} className="flex flex-col gap-0.5">
          <label htmlFor={`formula-weight-${key}`} className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>{FORMULA_COMPONENT_LABELS[key]}</span>
            <span>
              {components[key]} × {weights[key].toFixed(1)}
            </span>
          </label>
          <input
            id={`formula-weight-${key}`}
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={weights[key]}
            onChange={(e) => setWeight(key, Number(e.target.value))}
            className="w-full"
          />
        </div>
      ))}

      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-zinc-600 dark:text-zinc-400">
          Shipped score: <b className="text-zinc-800 dark:text-zinc-100">{shippedScore}</b>
        </span>
        <span className="text-zinc-600 dark:text-zinc-400">
          Your weights: <b className="text-zinc-800 dark:text-zinc-100">{adjustedScore}</b>
        </span>
      </div>
      <p className="text-zinc-400 dark:text-zinc-600">
        The table, CSV export, sort, and filter always use the shipped model. On the map, you can
        add your weights as an extra, clearly asterisked layer alongside the real Grass layer —
        it never replaces the shipped/validated score.
      </p>

      <div className="mt-1">
        <button
          type="button"
          onClick={onToggleOverlay}
          aria-pressed={overlayOn}
          className={`rounded border px-1.5 py-0.5 font-medium ${
            overlayOn
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
              : "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          }`}
        >
          {overlayOn ? "Showing on map — remove" : "Show on map"}
        </button>
      </div>

      <div className="mt-1 flex gap-2">
        {!isDefault && (
          <button type="button" onClick={reset} className="text-zinc-500 underline dark:text-zinc-400">
            Reset to shipped weights
          </button>
        )}
        {naming ? (
          <div className="flex items-center gap-1">
            <label htmlFor="formula-preset-name" className="sr-only">
              Preset name
            </label>
            <input
              id="formula-preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Preset name"
              className="w-28 rounded border border-zinc-200 bg-transparent px-1.5 py-0.5 dark:border-zinc-700"
              autoFocus
            />
            <button type="button" onClick={handleSave} className="font-medium text-zinc-900 dark:text-zinc-50">
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            aria-label="Save current formula weights"
            className="rounded border border-zinc-200 px-1.5 py-0.5 font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Save weights...
          </button>
        )}
      </div>

      {presets.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {presets.map((preset) => (
            <li key={preset.id} className="flex items-center justify-between gap-2">
              <span className="text-zinc-700 dark:text-zinc-300">{preset.name}</span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleApply(preset)}
                  aria-label={`Apply formula weights: ${preset.name}`}
                  className="text-zinc-500 underline dark:text-zinc-400"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(preset.id)}
                  aria-label={`Delete formula weights: ${preset.name}`}
                  className="text-zinc-500 underline dark:text-zinc-400"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
