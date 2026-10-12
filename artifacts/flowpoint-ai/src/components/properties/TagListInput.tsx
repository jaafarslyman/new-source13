import { useState, type KeyboardEvent } from 'react';

interface TagListInputProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  suggestions?: readonly string[];
}

function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function TagListInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions = [],
}: TagListInputProps) {
  const [draft, setDraft] = useState('');
  const add = (tags: string[]) => onChange(normalizeTags([...value, ...tags]));
  const commitDraft = () => {
    const newTags = draft.split(/[,\n]/).map((tag) => tag.trim()).filter(Boolean);
    if (newTags.length) add(newTags);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitDraft();
    }
    if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const isSelected = (suggestion: string) =>
    value.some((tag) => tag.toLocaleLowerCase() === suggestion.toLocaleLowerCase());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((item) => item !== tag))}
              className="font-medium text-slate-500 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          aria-describedby={`${id}-hint`}
        />
        <button
          type="button"
          onClick={commitDraft}
          disabled={!draft.trim()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-slate-500">
        Type an item and press Enter or choose a suggestion below.
      </p>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => {
            const selected = isSelected(suggestion);
            return (
              <button
                key={suggestion}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onChange(
                    selected
                      ? value.filter((tag) => tag.toLocaleLowerCase() !== suggestion.toLocaleLowerCase())
                      : normalizeTags([...value, suggestion]),
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  selected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
                }`}
              >
                {suggestion}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
