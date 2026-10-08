export interface TabOption<T extends string | number> {
  value: T;
  label: string;
}

export interface TabSelectorProps<T extends string | number> {
  options: TabOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  label?: string; // accessible group name
}

// Index-card tabs: rounded on the top corners only; the active tab is paper
// with a brass top edge.
export function TabSelector<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  label,
}: TabSelectorProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex items-end gap-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            style={active ? { boxShadow: "inset 0 2px 0 #b8944f" } : undefined}
            className={`rounded-t-desk border-[1.5px] border-b-0 px-4 py-2 font-sans text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-tile-edge bg-paper pb-2.5 text-ink"
                : "border-transparent bg-tab text-ink-soft hover:bg-paper"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
