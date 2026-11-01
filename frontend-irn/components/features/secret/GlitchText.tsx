export function GlitchText({ text, className, as = 'h1' }: { text: string; className?: string; as?: 'h1' | 'h2' | 'p' }) {
  const Tag = as;
  return <Tag className={`glitch-text ${className ?? ''}`} data-text={text}>{text}</Tag>;
}
