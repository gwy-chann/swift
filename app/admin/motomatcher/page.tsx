import React from "react";
import { getMotorcycleModelsAction } from "@/lib/actions/motomatcher-actions";
import { getProductsAction } from "@/lib/admin/product-actions";
import { AdminMotoMatcherClient } from "./admin-motomatcher-client";

export default async function AdminMotoMatcherPage() {
  const [models, products] = await Promise.all([
    getMotorcycleModelsAction(),
    getProductsAction(),
  ]);

  return (
    <AdminMotoMatcherClient
      initialModels={models}
      initialProducts={products}
    />
  );
}
