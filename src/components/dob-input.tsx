import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** ISO (yyyy-MM-dd) -> DD/MM/YYYY for display. */
function isoToDisplay(iso: string | null) {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "dd/MM/yyyy") : "";
}

/**
 * Date of birth entry for front-desk speed: type `31/12/1980` (slashes are
 * inserted automatically) or pick from the calendar. Value is always stored as
 * an ISO date string for the database.
 */
export function DobInput({
  value,
  onChange,
  id = "date_of_birth",
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  id?: string;
}) {
  const [text, setText] = useState(() => isoToDisplay(value));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length < 8) {
      onChange(null);
      return;
    }
    const d = parse(digits, "ddMMyyyy", new Date());
    onChange(isValid(d) ? format(d, "yyyy-MM-dd") : null);
  };

  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
          const masked = parts.join("/");
          setText(masked);
          commit(masked);
        }}
        onBlur={() => setText(isoToDisplay(value))}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Pick date of birth">
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            defaultMonth={selected && isValid(selected) ? selected : new Date(1990, 0)}
            startMonth={new Date(1900, 0)}
            endMonth={new Date()}
            disabled={{ after: new Date() }}
            selected={selected && isValid(selected) ? selected : undefined}
            onSelect={(d) => {
              onChange(d ? format(d, "yyyy-MM-dd") : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
