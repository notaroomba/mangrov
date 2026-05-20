import { useEffect, useState } from "react";

// Businesses are not yet modeled in the new Postgres backend.
// Returning an empty list keeps callers working until the businesses surface is rebuilt.
export function useBusinessProducts(businessId: string | undefined) {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) {
      setProducts([]);
      return;
    }
    setProducts([]);
  }, [businessId]);
  return products;
}
