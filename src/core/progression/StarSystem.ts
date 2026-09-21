export interface StarInput {
  completed: boolean;
  errors: number;
  efficiency: number;
}

export const THREE_STAR_EFFICIENCY = 0.7;

export function calculateStars({ completed, errors, efficiency }: StarInput): 0 | 1 | 2 | 3 {
  if (!completed) return 0;
  if (errors === 0 && efficiency >= THREE_STAR_EFFICIENCY) return 3;
  if (errors <= 2) return 2;
  return 1;
}
