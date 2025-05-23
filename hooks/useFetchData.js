import { useState, useEffect } from "react";
import { useRestaurant } from "../context/RestaurantContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const useFetchData = (endpoint, params = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { refreshTrigger } = useRestaurant();

  const fetchData = async () => {
    setLoading(true);
    try {
      const restaurantId = await AsyncStorage.getItem(WebService.OUTLET_ID);
      const userId = await AsyncStorage.getItem(WebService.USER_ID);

      const response = await axios.post(endpoint, {
        outlet_id: restaurantId,
        user_id: userId,
        ...params,
      });

      if (response.data.st === 1) {
        setData(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.msg || "Failed to fetch data");
      }
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, JSON.stringify(params)]);

  return { data, loading, error, refetch: fetchData };
};
