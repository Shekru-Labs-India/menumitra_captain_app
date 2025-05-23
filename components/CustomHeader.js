import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import RemixIcon from "react-native-remix-icon";
import * as ConstantValues from "../Screens/utils/ConstantValues";
import { useBackButtonHandler } from "../hooks/useBackButtonHandler";

// Constants for consistent sizing
const HEADER_HEIGHT = Platform.OS === "ios" ? 44 : 56;
const STATUSBAR_HEIGHT = Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CustomHeader = ({
  title,
  showBackButton = true,
  onMenuPress,
  isHome = false,
  rightComponent = null,
  titleStyle = {},
  onBackPress,
}) => {
  const navigation = useNavigation();
  
  // Use the custom hook to handle back press consistently
  // It will use the provided onBackPress if available
  const handleBack = useBackButtonHandler(onBackPress);

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#fff"
        barStyle="dark-content"
        translucent={true}
      />
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.leftContainer}>
            {showBackButton && !isHome && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleBack}
              >
                <RemixIcon name="arrow-left-line" size={24} color="#000" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.titleContainer}>
            <Text numberOfLines={1} style={[styles.title, titleStyle]}>
              {title}
            </Text>
          </View>

          <View style={styles.rightContainer}>
            {rightComponent}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingTop: STATUSBAR_HEIGHT,
    zIndex: 1000,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  header: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  leftContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  rightContainer: {
    minWidth: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
    marginLeft: 8,
    flex: 0,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CustomHeader;
