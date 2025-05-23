import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import newstyles from "../newstyles";

const CustomInputField = ({
                              label,
                              value,
                              onChangeText,
                              placeholder,
                              keyboardType = "default",
                              required = false,
                              errorMessage = "This field is required",
                              style = {},
                          }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasError, setHasError] = useState(false);

    const validateInput = () => {
        if (required && !value.trim()) {
            setHasError(true);
        } else {
            setHasError(false);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <Text style={newstyles.labelText}>{label}</Text>
            <TextInput
                style={[
                    newstyles.input,
                    hasError ? styles.errorBorder : isFocused ? styles.focusBorder : {},
                ]}
                placeholder={placeholder}
                value={value}
                onChangeText={(text) => {
                    onChangeText(text);
                    setHasError(false); // Reset error on text change
                }}
                keyboardType={keyboardType}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setIsFocused(false);
                    validateInput();
                }}
            />
            {hasError && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>
    );
};

export default CustomInputField;

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        color: "#333",
        marginBottom: 5,
    },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
    },
    errorBorder: {
        borderColor: "red",
        borderRadius: 5,
    },
    focusBorder: {
        borderColor: "#007BFF",
    },
    errorText: {
        marginTop: 5,
        color: "red",
        fontSize: 12,
    },
});
