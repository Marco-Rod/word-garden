export interface StarInput {
  completed: boolean;
  errors: number;
  efficiency: number;
}

export function calculateStars({ completed, errors }: StarInput): 0 | 1 | 2 | 3 {
  if (!completed) return 0;
  if (errors === 0) return 3;
  if (errors === 1) return 2;
  return 1;
}
