export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyRange {
    min: number;
    max: number;
}

/**
 * Returns the numeric range (inclusive) for the given difficulty.
 * - easy: 1-20
 * - medium: 1-50
 * - hard: 1-100
 */
export function getDifficultyRange(difficulty: Difficulty): DifficultyRange {
    switch (difficulty) {
        case 'easy':   return { min: 1, max: 20 };
        case 'hard':   return { min: 1, max: 100 };
        case 'medium':
        default:       return { min: 1, max: 50 };
    }
}

/** Convenience: just the max for the difficulty */
export function getDifficultyMax(difficulty: Difficulty): number {
    return getDifficultyRange(difficulty).max;
}

/** Arabic label for the difficulty */
export function getDifficultyLabel(difficulty: Difficulty): string {
    switch (difficulty) {
        case 'easy':   return 'سهل';
        case 'hard':   return 'صعب';
        case 'medium':
        default:       return 'متوسط';
    }
}

/** Tailwind colour classes for badges */
export function getDifficultyColor(difficulty: Difficulty): string {
    switch (difficulty) {
        case 'easy':   return 'bg-green-100 text-green-700 border-green-200';
        case 'hard':   return 'bg-red-100 text-red-700 border-red-200';
        case 'medium':
        default:       return 'bg-amber-100 text-amber-700 border-amber-200';
    }
}

