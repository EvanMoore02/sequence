import { useRef } from 'react';

type SignedAnswerInputProps = {
  id: string;
  value: string;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
};

export function SignedAnswerInput({ id, value, disabled, placeholder, onChange }: SignedAnswerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleSign() {
    const input = inputRef.current;
    const cursor = input?.selectionStart ?? value.length;
    const segmentStart = value.lastIndexOf(',', Math.max(0, cursor - 1)) + 1;
    const nextComma = value.indexOf(',', cursor);
    const segmentEnd = nextComma === -1 ? value.length : nextComma;
    const leadingSpace = value.slice(segmentStart, segmentEnd).match(/^\s*/)?.[0].length ?? 0;
    const signIndex = segmentStart + leadingSpace;
    const hasMinus = value[signIndex] === '-';
    const nextValue = hasMinus
      ? value.slice(0, signIndex) + value.slice(signIndex + 1)
      : value.slice(0, signIndex) + '-' + value.slice(signIndex);

    onChange(nextValue);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const nextCursor = hasMinus ? Math.max(signIndex, cursor - 1) : cursor + 1;
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  return <div className="signed-input">
    <button
      type="button"
      className="signed-input-minus"
      aria-label="Toggle negative sign for this answer"
      title="Toggle negative sign"
      disabled={disabled}
      onClick={toggleSign}
    >−</button>
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="text"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>;
}
