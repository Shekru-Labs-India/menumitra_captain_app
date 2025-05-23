import React, { useState } from "react";
import { ScrollView, RefreshControl } from "react-native";

const withPullToRefresh = (WrappedComponent, fetchDataFunction) => {
  const WithPullToRefreshComponent = (props) => {
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
      setRefreshing(true);
      try {
        const response = await fetchDataFunction();
        if (props.onDataFetched) {
          props.onDataFetched(response);
        }
      } catch (error) {
        console.error("Refresh error:", error);
      } finally {
        setRefreshing(false);
      }
    };

    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0dcaf0"]}
            tintColor="#0dcaf0"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <WrappedComponent {...props} onRefresh={onRefresh} />
      </ScrollView>
    );
  };

  WithPullToRefreshComponent.displayName = `WithPullToRefresh(${getDisplayName(
    WrappedComponent
  )})`;
  return WithPullToRefreshComponent;
};

// Helper function to get the display name of the wrapped component
function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || "Component";
}

export default withPullToRefresh;
