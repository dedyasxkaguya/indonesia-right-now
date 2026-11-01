export const METRIC_LABELS = {
  'infrastructure-access': { label: 'Akses Layanan Dasar', unit: '%', format: 'percent' },
  'road-authority-gap': { label: 'Kesenjangan Jalan Pusat–Daerah', unit: 'pp', format: 'number' },
  'slum-reduction': { label: 'Pengurangan Kawasan Kumuh', unit: '%', format: 'percent' },
  'disaster-exposure': { label: 'Indeks Paparan Bencana', unit: 'per 1.000 jiwa', format: 'number' },
  'waste-overcapacity': { label: 'TPA Overcapacity', unit: 'lokasi', format: 'integer' },
  'food-production-per-capita': { label: 'Produksi Pangan per Kapita', unit: 'ton/jiwa', format: 'decimal' },
  'food-productivity': { label: 'Produktivitas Pangan', unit: 'ton/ha', format: 'decimal' },
  'basic-service-deficit': { label: 'Defisit Layanan Dasar', unit: '%', format: 'percent' },
} as const;

export type MetricId = keyof typeof METRIC_LABELS;
