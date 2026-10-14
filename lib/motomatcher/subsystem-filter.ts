import type { Product, MotorcycleModelRecord } from "../types/product.ts";
import {
  fromProductToComparisonPart,
  type ComparisonPartItem,
} from "./comparison-matrix-contracts.ts";

export interface SubsystemCategoryDefinition {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  aliases: string[];
}

export const SUBSYSTEM_CATEGORIES: SubsystemCategoryDefinition[] = [
  {
    id: "ALL",
    label: "All Systems",
    shortLabel: "All",
    aliases: ["ALL", "*", "ALL SYSTEMS", "ALL PARTS"],
  },
  {
    id: "Brakes",
    label: "Braking System",
    shortLabel: "Brakes",
    aliases: ["BRAKES", "BRAKING", "BRAKE"],
  },
  {
    id: "Drivetrain",
    label: "Drive & CVT",
    shortLabel: "CVT",
    aliases: ["DRIVETRAIN", "CVT", "TRANSMISSION", "DRIVE", "BELT"],
  },
  {
    id: "Fluids",
    label: "Oils & Fluids",
    shortLabel: "Fluids",
    aliases: ["FLUIDS", "OILS", "OIL", "LUBRICANTS", "CHEMICALS", "COOLANT"],
  },
  {
    id: "Ignition",
    label: "Ignition & Electrical",
    shortLabel: "Ignition",
    aliases: ["IGNITION", "ELECTRICAL", "BATTERY", "SPARK", "PLUG", "ECU"],
  },
  {
    id: "Engine",
    label: "Engine & Clutch",
    shortLabel: "Engine",
    aliases: ["ENGINE", "CLUTCH", "PISTON", "GASKET", "VALVES"],
  },
  {
    id: "Tires",
    label: "Tires & Wheels",
    shortLabel: "Tires",
    aliases: ["TIRES", "WHEELS", "TIRE", "WHEEL", "RIM", "TUBES"],
  },
  {
    id: "Suspension",
    label: "Suspension",
    shortLabel: "Suspension",
    aliases: ["SUSPENSION", "SHOCKS", "FORK", "SPRINGS"],
  },
  {
    id: "Accessories",
    label: "Accessories",
    shortLabel: "Accessories",
    aliases: ["ACCESSORIES", "BODY", "LIGHTING", "FAIRINGS", "BRACKET"],
  },
];

export interface MotoMatcherFilterOptions {
  selectedModel: MotorcycleModelRecord | null;
  isUniversalPlatform?: boolean;
  systemCategory: string;
  includeUniversal: boolean;
}

export interface MotoMatcherFilteredSet {
  filteredProducts: Product[];
  oemParts: ComparisonPartItem[];
  aftermarketParts: ComparisonPartItem[];
  totalMatches: number;
  oemCount: number;
  aftermarketCount: number;
}

/**
 * Checks whether a product category matches the selected subsystem category ID
 */
export function matchesSubsystemCategory(
  productCategory: string | undefined,
  targetCategory: string
): boolean {
  if (!productCategory) return false;
  if (!targetCategory || targetCategory.toUpperCase() === "ALL") return true;

  const normalizedProduct = productCategory.trim().toUpperCase();
  const normalizedTarget = targetCategory.trim().toUpperCase();

  const def = SUBSYSTEM_CATEGORIES.find(
    (c) => c.id.toUpperCase() === normalizedTarget
  );

  if (def) {
    if (def.id.toUpperCase() === normalizedProduct) return true;
    for (const alias of def.aliases) {
      if (
        normalizedProduct === alias ||
        normalizedProduct.includes(alias) ||
        alias.includes(normalizedProduct)
      ) {
        return true;
      }
    }
    return false;
  }

  return (
    normalizedProduct === normalizedTarget ||
    normalizedProduct.includes(normalizedTarget)
  );
}

/**
 * Pure predicate checking whether a product matches active platform and universal filters
 */
export function matchesPlatformAndUniversal(
  product: Product,
  options: MotoMatcherFilterOptions
): boolean {
  const partModel = (product.model || "").trim().toLowerCase();
  const isPartUniversal = partModel === "universal";

  // If universal parts are excluded and this item is universal, reject immediately
  if (!options.includeUniversal && isPartUniversal) {
    return false;
  }

  // 1. Universal platform selection mode
  if (options.isUniversalPlatform) {
    return isPartUniversal;
  }

  // 2. Specific motorcycle platform selected
  if (options.selectedModel) {
    const queryModel = options.selectedModel.model.trim().toLowerCase();
    const queryFullName = `${options.selectedModel.make} ${options.selectedModel.model}`
      .trim()
      .toLowerCase();

    const isDedicatedMatch =
      partModel === queryModel ||
      partModel === queryFullName ||
      partModel.includes(queryModel);

    if (isDedicatedMatch) {
      return true;
    }

    // Include universal item only if enabled
    if (options.includeUniversal && isPartUniversal) {
      return true;
    }

    return false;
  }

  // 3. No platform selected
  if (options.includeUniversal) {
    return isPartUniversal;
  }

  return false;
}

/**
 * Filters a list of products by motorcycle platform, subsystem category, and universal visibility
 */
export function filterMotoMatcherProducts(
  products: Product[],
  options: MotoMatcherFilterOptions
): Product[] {
  return products.filter((product) => {
    const platformMatch = matchesPlatformAndUniversal(product, options);
    if (!platformMatch) return false;

    const categoryMatch = matchesSubsystemCategory(
      product.category,
      options.systemCategory
    );
    return categoryMatch;
  });
}

/**
 * Executes filtering and partitions results into OEM and Aftermarket comparison items with exact counts
 */
export function getMotoMatcherFilteredSet(
  products: Product[],
  options: MotoMatcherFilterOptions
): MotoMatcherFilteredSet {
  const filteredProducts = filterMotoMatcherProducts(products, options);

  const oemParts: ComparisonPartItem[] = [];
  const aftermarketParts: ComparisonPartItem[] = [];

  for (const product of filteredProducts) {
    const item = fromProductToComparisonPart(product);
    if (item.isOem) {
      oemParts.push(item);
    } else {
      aftermarketParts.push(item);
    }
  }

  return {
    filteredProducts,
    oemParts,
    aftermarketParts,
    totalMatches: filteredProducts.length,
    oemCount: oemParts.length,
    aftermarketCount: aftermarketParts.length,
  };
}
