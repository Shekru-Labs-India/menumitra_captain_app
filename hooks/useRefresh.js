import { useState, useCallback } from "react";

export const useRefresh = (fetchFunction) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFunction().finally(() => setRefreshing(false));
  }, [fetchFunction]);

  return { refreshing, onRefresh };
};
