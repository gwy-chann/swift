import React from "react";
import { getMotorcycleModelsAction } from "@/lib/motomatcher/actions";
import { getProductsAction } from "@/lib/admin/product-actions";
import { MotoMatcherContainer } from "./admin-motomatcher-client";

export default async function AdminMotoMatcherPage() {
  const [models, products] = await Promise.all([
    getMotorcycleModelsAction(),
    getProductsAction(),
  ]);

  return (
    <MotoMatcherContainer
      initialModels={models}
      initialProducts={products}
    />
  );
}
