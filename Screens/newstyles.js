import { Dimensions, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

const newstyles = StyleSheet.create({
  labelText: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 3, // Adds space between label and button
    alignSelf: "flex-start", // Align text to the left
  },
  icon: {
    width: 30,
    height: 30,
  },
  imagePickerContainer: {
    alignSelf: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#000000",
  },
  input: {
    fontSize: 15,
    height: 45,
    backgroundColor: "#fff",
    width: "100%",
    marginBottom: 10,
    borderRadius: 10,
  },

  androidPicker: {
    fontSize: 13,
    height: 50,
    width: "100%",
    borderRadius: 4,
  },
  androidPickerContainer: {
    backgroundColor: "#ffffff",
    width: width - 40,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 4,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    height: 40,
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 5,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  picker: {
    height: 40,
    width: "100%",
  },
  datePicker: {
    height: 40,

    backgroundColor: "#fff",
    width: "100%",
    marginBottom: 10,
  },
  datePickerContainer: {
    height: 40,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 5,
    paddingVertical: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  datePickerText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  textArea: {
    backgroundColor: "#fff",
    fontSize: 13,
    width: "100%",
    marginBottom: 10,
    height: 100,
  },
  submitButton: {
    tintColor: "#FFFFFF",
    backgroundColor: "#0dcaf0",
    width: "100%",
    marginTop: 20,
  },
  deleteButton: {
    backgroundColor: "#FF0000",
  },
  footer: {
    alignItems: "center",
    padding: 10,
  },
  footerText: {
    fontSize: 14,
    color: "gray",
  },
  footerTextContainer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: "center",
  },
  selectModalPicker: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 15,
    borderWidth: 0.5,
    borderColor: "#1a1919",
    borderRadius: 3,
    marginBottom: 15,
  },

  selectModalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  selectModalContent: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
    width: width - 40,
  },
  selectModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  selectModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  selectModalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectModalItemText: {
    fontSize: 16,
  },
});

export default newstyles;
