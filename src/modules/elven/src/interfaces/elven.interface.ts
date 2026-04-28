export interface ElvenNavigation {
  title: string;
  action: () => void;
}

export interface ElvenAuthor {
  id?: number;
  name: string;
  bio?: string;
  notes?: string;
}

export interface ElvenColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}
