import { useEffect, useState } from "react";
import { useRestaurant } from "../context/RestaurantContext";

export const useRestaurantData = (fetchFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { refreshTrigger } = useRestaurant();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchFunction();
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshTrigger]); // Reload when restaurant changes

  return { data, loading, setData };
};
