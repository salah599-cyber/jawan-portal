"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import {
  DATE_INPUT_PLACEHOLDER,
  formatDateForInput,
  formatDateInput,
  parseDateInput,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

function toDisplayValue(value?: string | null): string {
  if (!value) return "";
  return formatDateForInput(value);
}

function toIsoValue(value?: string | null): string {
  if (!value) return "";
  return formatDateInput(value);
}

const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pr-9 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

export function DateInput({
  className,
  name,
  id,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  placeholder = DATE_INPUT_PLACEHOLDER,
  ...props
}: DateInputProps) {
  const isControlled = value !== undefined;
  // Only used in uncontrolled mode — the controlled `value`/`visibleValue`/
  // `submittedIso` below are derived directly from props during render.
  const [displayValue, setDisplayValue] = React.useState(() => toDisplayValue(defaultValue));
  const [isoValue, setIsoValue] = React.useState(() => toIsoValue(defaultValue));

  const emitChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, nextIso: string) => {
      if (!onChange) return;
      const syntheticEvent = {
        ...event,
        target: { ...event.target, value: nextIso },
        currentTarget: { ...event.currentTarget, value: nextIso },
      };
      onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    },
    [onChange],
  );

  const handleDisplayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextDisplay = event.target.value;
    const parsed = parseDateInput(nextDisplay);
    const nextIso = parsed ? formatDateInput(parsed) : "";

    if (!isControlled) {
      setDisplayValue(nextDisplay);
      setIsoValue(nextIso);
    }

    emitChange(event, nextIso);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const currentIso = isControlled ? toIsoValue(value) : isoValue;
    const normalizedDisplay = currentIso ? formatDateForInput(currentIso) : "";

    if (!isControlled && normalizedDisplay !== displayValue) {
      setDisplayValue(normalizedDisplay);
    }

    props.onBlur?.(event);
  };

  const submittedIso = isControlled ? toIsoValue(value) : isoValue;
  const visibleValue = isControlled ? toDisplayValue(value) : displayValue;

  return (
    <div className={cn("relative w-full", className)}>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        data-slot="input"
        data-date-input="display"
        id={id}
        placeholder={placeholder}
        value={visibleValue}
        onChange={handleDisplayChange}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        className={inputClassName}
      />
      {name ? (
        <input
          type="hidden"
          name={name}
          value={submittedIso}
          required={required}
          disabled={disabled}
        />
      ) : null}
      <Calendar
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
