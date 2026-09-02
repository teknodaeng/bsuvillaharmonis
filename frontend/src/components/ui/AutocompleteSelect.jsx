import React, { useState, useRef, useEffect, useMemo } from "react";
import clsx from "clsx";
import { Search, ChevronDown, Check, X, Tag } from "lucide-react";

export const AutocompleteSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "-- Cari & Pilih Pilihan --",
  listHeaderTitle = "Daftar Pilihan Aktif",
  emptyMessage = "Tidak ditemukan data yang cocok",
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  containerClassName = "",
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Sync display text when value changes or dropdown closes
  useEffect(() => {
    if (!isOpen) {
      if (selectedOption) {
        setSearchQuery(selectedOption.label || "");
      } else {
        setSearchQuery("");
      }
    }
  }, [value, selectedOption, isOpen]);

  // Filter options based on search query when typing
  const filteredOptions = useMemo(() => {
    if (!isOpen || !searchQuery.trim()) {
      return options;
    }
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const searchTarget = (
        opt.searchTerms ||
        [
          opt.label,
          opt.group,
          opt.badge,
          opt.name,
          opt.category,
          opt.subLabel,
          opt.code,
          opt.exampleItems,
          opt.formattedPrice,
          opt.rightBadge,
        ]
          .filter(Boolean)
          .join(" ")
      ).toLowerCase();
      return searchTarget.includes(q);
    });
  }, [options, searchQuery, isOpen]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    if (disabled) return;
    onChange?.(option.value, option);
    setSearchQuery(option.label || "");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("", null);
    setSearchQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const selectId = id || "autocomplete-select";

  return (
    <div ref={containerRef} className={clsx("w-full relative", containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-sm">
        {/* Search icon on left */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>

        {/* Input field for typing & autocomplete */}
        <input
          id={selectId}
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? searchQuery : selectedOption ? selectedOption.label : ""}
          placeholder={placeholder}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearchQuery(""); // Clear input on focus to allow fresh search/view of options
            }
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={clsx(
            "block w-full rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-500 pl-9 pr-16 py-2.5 bg-white cursor-text",
            error
              ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-200"
              : "border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-100",
            className
          )}
        />

        {/* Right actions: Clear & Toggle Dropdown Arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              title="Hapus pilihan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                } else {
                  setIsOpen(true);
                  inputRef.current?.focus();
                }
              }
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronDown
              className={clsx(
                "h-4 w-4 transition-transform duration-150",
                isOpen && "transform rotate-180 text-primary-600"
              )}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Suggestions List */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span>{listHeaderTitle}</span>
            <span>{filteredOptions.length} Opsi</span>
          </div>

          <ul
            ref={listRef}
            className="max-h-64 overflow-y-auto divide-y divide-gray-100 py-1 text-xs"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-4 text-center text-gray-400">
                <Tag className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                <span>{emptyMessage}</span>
                {searchQuery && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    dengan kata kunci "{searchQuery}"
                  </p>
                )}
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                const badgeTag = opt.badge || opt.group;
                const rightTag = opt.rightBadge || opt.formattedPrice;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={clsx(
                      "px-3.5 py-2.5 flex items-start justify-between gap-3 cursor-pointer transition-colors select-none",
                      isHighlighted
                        ? "bg-primary-50 text-primary-900"
                        : isSelected
                        ? "bg-emerald-50/70 text-emerald-950"
                        : "hover:bg-gray-50 text-gray-800"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {badgeTag && (
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-primary-100 text-primary-800 rounded border border-primary-200">
                            {badgeTag}
                          </span>
                        )}
                        <span className="font-semibold text-gray-900 text-sm">
                          {opt.name || opt.label}
                        </span>
                        {opt.category && (
                          <span className="inline-block px-1.5 py-0.2 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                            {opt.category}
                          </span>
                        )}
                      </div>

                      {(opt.subLabel || opt.exampleItems) && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {opt.subLabel || `Contoh: ${opt.exampleItems}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      {rightTag && (
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-xs">
                          {rightTag}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
      {!error && helperText && (
        <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};
