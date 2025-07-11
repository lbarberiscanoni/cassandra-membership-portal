"use client";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";

export default function AddressInput({ field }) {
  const [suggestions, setSuggestions] = useState([]);
  const timer = useRef(null);

  const handleChange = (e) => {
    const q = e.target.value;
    field.onChange(q);

    clearTimeout(timer.current);
    if (q.length < 3) return setSuggestions([]);

    timer.current = setTimeout(async () => {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
          q
        )}`
      );
      const json = await r.json();
      setSuggestions(json);
    }, 600); // 0.6 s debounce keeps you under 1 req/sec
  };

  return (
    <div className="relative">
      <Input
        value={field.value || ""}
        onChange={handleChange}
        placeholder="Start typing address…"
        autoComplete="street-address"
      />

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white shadow border rounded mt-1 max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                field.onChange(s.display_name);
                setSuggestions([]);
              }}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
