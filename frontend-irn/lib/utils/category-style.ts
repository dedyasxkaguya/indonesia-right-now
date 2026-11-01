import {
  Cpu,
  FileText,
  GraduationCap,
  Heart,
  Landmark,
  Leaf,
  MapPin,
  Palette,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type CategoryStyle = { color: string; icon: LucideIcon };

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  politics: { color: '#D32F2F', icon: Landmark },
  economy: { color: '#B45309', icon: TrendingUp },
  health: { color: '#15803D', icon: Heart },
  education: { color: '#2563EB', icon: GraduationCap },
  environment: { color: '#0D9488', icon: Leaf },
  technology: { color: '#4A148C', icon: Cpu },
  culture: { color: '#DB2777', icon: Palette },
  regional: { color: '#5C5852', icon: MapPin },
  community: { color: '#B45309', icon: Users },
  sports: { color: '#EA580C', icon: Trophy },
};

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category.toLowerCase()] ?? { color: '#8C8882', icon: FileText };
}
