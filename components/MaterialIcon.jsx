import React from "react";
import { MaterialIcons } from "@expo/vector-icons";

const MaterialIcon = ({ name, size = 24, color = "#000", style }) => {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
};

export default MaterialIcon;
