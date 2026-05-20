export function ExpandableText({ text }: { text: string }) {
  return (
    <span className="mt-1 block text-xs leading-5 text-stone-500">
      <span className="line-clamp-3">{text}</span>
    </span>
  );
}
