"use client";

import { useState } from "react";
import { useNumbersGame, canWork } from "@/lib/numbers/useNumbersGame";
import { Timer } from "@/components/ui/Timer";
import { LargeCountSelector } from "@/components/numbers/LargeCountSelector";
import { TileRack } from "@/components/numbers/TileRack";
import { OperatorBar } from "@/components/numbers/OperatorBar";
import { StepHistory } from "@/components/numbers/StepHistory";
import { ProveClock } from "@/components/numbers/ProveClock";
import { NumbersResultPanel } from "@/components/numbers/NumbersResultPanel";
import { ROUND_DURATION_SECONDS } from "@/types/numbers";

export default function NumbersPage() {
  const [state, dispatch] = useNumbersGame();
  // Bumped on every calculator tap while proving. It is the ProveClock's
  // key, so each tap remounts it for an exact fresh per-tap window.
  const [tapCount, setTapCount] = useState(0);

  const isSelecting = state.phase === "selecting";
  const isSolving = state.phase === "solving";
  const isProving = state.phase === "proving";
  const isDeclaring = isSolving && state.playMode === "declare";
  // Same rule the reducer uses for "can the player currently build a
  // solution" — imported rather than re-derived, so the UI can't disagree
  // with the reducer about when buttons should actually work.
  const isWorking = canWork(state);

  const tap = () => {
    if (isProving) setTapCount((c) => c + 1);
  };

  const canConfirm =
    isWorking &&
    state.inputMode === "calculator" &&
    state.pendingOperand1 !== null &&
    state.pendingOperand2 !== null &&
    state.pendingOperator !== null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 p-8">
      {/* Only declare mode has a countdown. Untimed mode has no Timer for
          now — a count-up stopwatch is a separate later UI job with its own
          ticking state, not wired through this reducer. */}
      {state.playMode === "declare" && (
        <Timer
          durationSeconds={ROUND_DURATION_SECONDS}
          isRunning={isDeclaring}
          onExpire={() => dispatch({ type: "TIME_EXPIRED" })}
        />
      )}

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Target
        </span>
        <div className="font-mono text-5xl font-black tracking-widest text-gray-900 dark:text-white">
          {state.target ?? "---"}
        </div>
      </div>

      <LargeCountSelector
        selectedLargeCount={state.largeCount}
        inputMode={state.inputMode}
        playMode={state.playMode}
        disabled={!isSelecting}
        onSelectLargeCount={(largeCount) =>
          dispatch({ type: "SET_LARGE_COUNT", largeCount })
        }
        onSelectInputMode={(mode) => dispatch({ type: "SET_INPUT_MODE", mode })}
        onSelectPlayMode={(mode) => dispatch({ type: "SET_PLAY_MODE", mode })}
        onStart={() => dispatch({ type: "START_SOLVING" })}
      />

      {isDeclaring && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Declare the number you can reach
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              step={1}
              value={state.declaredValue ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                // Number("") is 0, not NaN — an empty box has to become
                // null ("nothing declared"), not the value 0.
                const parsed = raw === "" ? null : Number(raw);
                dispatch({ type: "SET_DECLARED_VALUE", value: parsed });
              }}
              placeholder="e.g. 518"
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 font-mono text-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="button"
              disabled={state.declaredValue === null}
              onClick={() => dispatch({ type: "LOCK_DECLARATION" })}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lock in
            </button>
          </div>
        </div>
      )}

      {isProving && (
        <>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Prove {state.declaredValue}
          </p>
          <ProveClock
            key={tapCount}
            onExpire={() => dispatch({ type: "PROVE_TIMEOUT" })}
          />
        </>
      )}

      {state.inputMode === "calculator" ? (
        <>
          <TileRack
            tiles={state.pool}
            pendingOperand1={state.pendingOperand1}
            pendingOperand2={state.pendingOperand2}
            disabled={!isWorking}
            onSelectTile={(tileId) => {
              tap();
              dispatch({ type: "SELECT_OPERAND", tileId });
            }}
          />
          <OperatorBar
            pendingOperator={state.pendingOperator}
            canConfirm={canConfirm}
            canUndo={state.steps.length > 0}
            disabled={!isWorking}
            onSelectOperator={(operator) => {
              tap();
              dispatch({ type: "SELECT_OPERATOR", operator });
            }}
            onConfirm={() => {
              tap();
              dispatch({ type: "CONFIRM_STEP" });
            }}
            onUndo={() => {
              tap();
              dispatch({ type: "UNDO_STEP" });
            }}
            onClear={() => {
              tap();
              dispatch({ type: "CLEAR_CALCULATOR" });
            }}
          />
          <StepHistory steps={state.steps} />
        </>
      ) : (
        <>
          <TileRack
            tiles={state.drawnNumbers}
            pendingOperand1={null}
            pendingOperand2={null}
            disabled
            onSelectTile={() => {}}
          />
          <input
            type="text"
            value={state.freeTextExpression}
            disabled={!isWorking}
            onChange={(e) =>
              dispatch({ type: "UPDATE_FREE_TEXT", value: e.target.value })
            }
            placeholder="e.g. (100 + 4) * 5 - 25"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </>
      )}

      <button
        type="button"
        disabled={!isWorking}
        onClick={() => dispatch({ type: "SUBMIT_ANSWER" })}
        className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit Answer
      </button>

      <NumbersResultPanel
        result={state.result}
        onNextRound={() => dispatch({ type: "RESET_ROUND" })}
      />
    </main>
  );
}
