import { Select, Text, cn } from "../atoms";
import type { SelectOption } from "../atoms";

export type CategorySelectProps = {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const CATEGORY_SELECT_ID = "category-select";

export function CategorySelect({
  categories,
  value,
  onChange,
  className,
}: CategorySelectProps) {
  const options: SelectOption[] = categories.map((category) => ({
    value: category,
    label: category,
  }));

  return (
    <div className={cn(className)}>
      <Text
        as="label"
        variant="label"
        htmlFor={CATEGORY_SELECT_ID}
        className="mb-1.5 block"
      >
        Categories
      </Text>
      <Select
        id={CATEGORY_SELECT_ID}
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
