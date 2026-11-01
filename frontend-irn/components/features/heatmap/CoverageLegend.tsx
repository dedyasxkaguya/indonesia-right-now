export function CoverageLegend({ max, publishers, categories }: { max: number; publishers: number; categories: number }) {
  return <div className="mt-4">
    <div aria-hidden="true" className="h-2 w-full border border-paper-300" style={{ background: 'linear-gradient(to right, #FDFBF6, #D32F2F)' }} />
    <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-400"><span>0</span><span>{max}</span></div>
    <p className="mt-3 font-mono text-[10px] text-ink-500">Data 24 jam terakhir · {publishers} publisher · {categories} kategori</p>
  </div>;
}
