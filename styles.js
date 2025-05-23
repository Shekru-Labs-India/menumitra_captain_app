// styles.js
import { StyleSheet } from "react-native";

const globalStyles = StyleSheet.create({
  mainContainer: {
    width: "100%",
    flex: 1,
    paddingTop: 50,
    marginBottom: 30,
    paddingLeft: 5,
    paddingRight: 5,
    paddingBottom: 5,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: "#fff",
  },
  header: {
    marginLeft: 10,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    margin: 15,
  },
  deleteButton: {
    flex: 1,

    backgroundColor: "#b80c0c",
    marginRight: 10,
    borderColor: "#b80c0c",
    borderWidth: 1,
  },
  deleteButtonLabel: {
    color: "#f6f5f5",
  },
  updateButton: {
    flex: 1,
    marginRight: 10,
    marginLeft: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 10,
    width: "95%",
    
  },
  searchInput: {
    height: 40,
backgroundColor: "#f6f6f6",
    borderColor: "black",
    borderWidth: 1,
    borderRadius: 5,
    flex: 1,
    paddingHorizontal: 10,
  },
  searchIcon: {
    color: "black",
    marginLeft: -25, // Overlap with the input
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#0dcaf0",
    padding: 5,
    borderRadius: 10,
    alignItems: "center",
    margin: 5,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 10,
  },
  submitButton: {
    width: "80%",
    marginTop: 20,
    marginBottom: 20, // Ensure space below the button
  },
  editImage: {
    width: 20,
    height: 20,
    marginHorizontal: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 15,
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: "row",
    flex: 1,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: "#e0e0e0",
    paddingVertical: 10,
    alignItems: "center",
  },
  selectedButton: {
    backgroundColor: "#6200ee",
  },
  toggleButtonText: {
    color: "#000",
    fontSize: 16,
  },
  selectedButtonText: {
    color: "#fff",
  },
});

export default globalStyles;
