"use client";

import { useEffect } from "react";
import { canWork, useNumbersGame } from "@/lib/numbers/useNumbersGame";
import { dailyNumbersPuzzle } from "@/lib/daily/puzzles";
import { Button } from "@/components/ui/Button";
import { TileRack } from "@/components/numbers/TileRack";
import { OperatorBar } from "@/components/numbers/OperatorBar";
import { StepHistory } from "@/components/numbers/StepHistory";
import { NumbersResultPanel } from "@/components/numbers/NumbersResultPanel";
import { DailyStageProps } from "./types";

// Daily Numbers is the untimed calculator flavour: one shared puzzle per day,
// no clock, so the share grid compares like with like.
export function DailyNumbersStage({
  dayKey,
  onComplete,
  onContinue,
}: DailyStageProps) {
  const [state, dispatch] = useNumbersGame();

  useEffect(() => {
    dispatch({ type: "LOAD_PUZZLE", ...dailyNumbersPuzzle(dayKey) });
  }, [dayKey, dispatch]);

  const result = state.result;
  useEffect(() => {
    if (result) onComplete(result.pointsAwarded);
  }, [result, onComplete]);

  const isWorking = canWork(state);
  const canConfirm =
    isWorking &&
    state.pendingOperand1 !== null &&
    state.pendingOperand2 !== null &&
    state.pendingOperator !== null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
          Target
        </span>
        <div className="font-serif text-6xl font-bold tracking-widest text-ink">
          {state.target ?? "---"}
        </div>
      </div>

      <TileRack
        tiles={state.pool}
        pendingOperand1={state.pendingOperand1}
        pendingOperand2={state.pendingOperand2}
        disabled={!isWorking}
        onSelectTile={(tileId) => dispatch({ type: "SELECT_OPERAND", tileId })}
      />
      <OperatorBar
        pendingOperator={state.pendingOperator}
        canConfirm={canConfirm}
        canUndo={state.steps.length > 0}
        disabled={!isWorking}
        onSelectOperator={(operator) =>
          dispatch({ type: "SELECT_OPERATOR", operator })
        }
        onConfirm={() => dispatch({ type: "CONFIRM_STEP" })}
        onUndo={() => dispatch({ type: "UNDO_STEP" })}
        onClear={() => dispatch({ type: "CLEAR_CALCULATOR" })}
      />
      <StepHistory steps={state.steps} />
      <Button
        disabled={!isWorking}
        onClick={() => dispatch({ type: "SUBMIT_ANSWER" })}
      >
        Submit answer
      </Button>

      <NumbersResultPanel result={result} onNextRound={onContinue} />
    </div>
  );
}
