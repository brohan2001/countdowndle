"use client";

import {
  NumbersOperator,
  OPERATOR_ORDER,
  OPERATOR_SYMBOLS,
} from "@/types/numbers";
import { Button } from "@/components/ui/Button";
import { Tile } from "@/components/ui/Tile";

export interface OperatorBarProps {
  pendingOperator: NumbersOperator | null;
  canConfirm: boolean;
  canUndo: boolean;
  disabled: boolean;
  onSelectOperator: (operator: NumbersOperator) => void;
  onConfirm: () => void;
  onUndo: () => void;
  onClear: () => void;
}

export function OperatorBar({
  pendingOperator,
  canConfirm,
  canUndo,
  disabled,
  onSelectOperator,
  onConfirm,
  onUndo,
  onClear,
}: OperatorBarProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {OPERATOR_ORDER.map((operator, index) => (
          <Tile
            key={operator}
            index={index}
            selected={operator === pendingOperator}
            disabled={disabled}
            ariaLabel={`Operator ${OPERATOR_SYMBOLS[operator]}`}
            onClick={() => onSelectOperator(operator)}
            className="!h-12 !min-w-12 !text-2xl"
          >
            {OPERATOR_SYMBOLS[operator]}
          </Tile>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={disabled || !canUndo}
          onClick={onUndo}
        >
          Undo
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={onClear}>
          Clear
        </Button>
        <Button disabled={disabled || !canConfirm} onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
