import React, { createContext, useContext } from "react";

const VersionContext = createContext({
  version: "1.0.0",
  buildNumber: "1",
  appName: "MenuMitra Captain",
  environment: __DEV__ ? "development" : "production",
});

export const useVersion = () => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error("useVersion must be used within a VersionProvider");
  }
  return context;
};

export function VersionProvider({ children }) {
  const value = {
    version: "1.0.0",
    buildNumber: "1",
    appName: "MenuMitra Captain",
    environment: __DEV__ ? "development" : "production",
  };

  return (
    <VersionContext.Provider value={value}>{children}</VersionContext.Provider>
  );
}
