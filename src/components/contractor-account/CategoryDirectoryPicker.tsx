'use client';

import { CategoryDirectoryContent } from '../content/CategoryDirectoryContent';

interface CategoryDirectoryPickerProps {
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
  disabled?: boolean;
}

export function CategoryDirectoryPicker({
  selectedSlugs,
  onToggle,
  disabled,
}: CategoryDirectoryPickerProps) {
  return (
    <CategoryDirectoryContent
      mode="select"
      selectedSlugs={selectedSlugs}
      onToggle={onToggle}
      disabled={disabled}
    />
  );
}
