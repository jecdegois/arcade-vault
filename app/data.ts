export type Category = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';

export interface AVUser {
  id: string;
  name: string;
  avatar?: string | null;
}

export const CATS: Category[] = ['ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS'];
