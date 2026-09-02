import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export function RatingCard({ label, value, detail, icon }: { label: string; value: string; detail: ReactNode; icon?: ReactNode }) {
  return <Card className="rating-card"><div className="rating-card__label"><span>{label}</span>{icon}</div><strong>{value}</strong><div className="rating-card__detail">{detail}</div></Card>;
}
