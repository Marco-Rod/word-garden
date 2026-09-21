export class RunProgress {
  totalScore = 0;

  add(score: number): number {
    this.totalScore += score;
    return this.totalScore;
  }

  reset(): void {
    this.totalScore = 0;
  }
}

export const runProgress = new RunProgress();
