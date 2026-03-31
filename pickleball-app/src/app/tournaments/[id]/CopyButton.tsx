"use client";

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      className="btn-secondary text-xs py-1.5"
      onClick={() => navigator.clipboard.writeText(text)}
    >
      Copy Link
    </button>
  );
}
