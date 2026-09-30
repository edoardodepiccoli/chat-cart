import type { ProductVariant, SelectedOption } from "../../../shared/chat";

function hasOption(variant: ProductVariant, pick: SelectedOption): boolean {
  return variant.selectedOptions.some((option) => {
    return option.name === pick.name && option.value === pick.value;
  });
}

function matchesEveryPick(
  variant: ProductVariant,
  picks: SelectedOption[],
): boolean {
  return picks.every((pick) => hasOption(variant, pick));
}

export function findVariant(
  variants: ProductVariant[],
  picks: SelectedOption[],
): ProductVariant | null {
  for (const variant of variants) {
    if (variant.selectedOptions.length !== picks.length) {
      continue;
    }

    if (matchesEveryPick(variant, picks)) {
      return variant;
    }
  }

  return null;
}

export function isOptionValueAvailable(
  variants: ProductVariant[],
  picks: SelectedOption[],
  optionName: string,
  value: string,
): boolean {
  const otherPicks = picks.filter((pick) => pick.name !== optionName);
  const candidatePicks = [...otherPicks, { name: optionName, value }];

  return variants.some((variant) => {
    return variant.available && matchesEveryPick(variant, candidatePicks);
  });
}

export function defaultSelectedOptions(
  variants: ProductVariant[],
): SelectedOption[] {
  const firstAvailable = variants.find((variant) => variant.available);

  if (firstAvailable !== undefined) {
    return firstAvailable.selectedOptions;
  }

  if (variants.length === 0) {
    return [];
  }

  return variants[0].selectedOptions;
}

export function replacePick(
  picks: SelectedOption[],
  optionName: string,
  value: string,
): SelectedOption[] {
  const otherPicks = picks.filter((pick) => pick.name !== optionName);

  return [...otherPicks, { name: optionName, value }];
}
