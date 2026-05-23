export interface Category {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type NewCategory = Pick<Category, 'name'>;
