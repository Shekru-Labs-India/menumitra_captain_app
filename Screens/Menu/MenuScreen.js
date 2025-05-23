import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import AllMenuProducts from "./MenuProduct/AllMenuProducts";
import CustomHeader from "../../components/CustomHeader";
import MainToolBar from "../MainToolbar";

export default function MenuScreen() {
  return (
    <>
      <CustomHeader title="Menu" />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      {/* <SafeAreaView style={styles.container}> */}
        <AllMenuProducts />
      {/* </SafeAreaView> */}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  toolbarContainer: {
    backgroundColor: '#f6f6f6',
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: '#e0e0e0'
  }
});
