
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "./scroll-area"


interface ComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyResultText?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  searchPlaceholder, 
  emptyResultText,
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = React.useMemo(() => {
    const fullLabel = options.find(option => option.value === value)?.label || "";
    if (!fullLabel) return placeholder;
    // return fullLabel; // Show full path
    const parts = fullLabel.split(' > ');
    return parts[parts.length - 1]; // Show only last part
  }, [options, value, placeholder]);


  const handleSelect = (currentValue: string) => {
    onChange(currentValue === value ? "" : currentValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {value ? selectedLabel : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" >
        <Command>
          <CommandInput placeholder={searchPlaceholder || "検索..."} />
            <CommandEmpty>{emptyResultText || "見つかりません。"}</CommandEmpty>
            <CommandList>
               <ScrollArea className="h-72">
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label} // Search by label
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
