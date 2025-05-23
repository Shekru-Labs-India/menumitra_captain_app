import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';

const PinInput = forwardRef(({ pinLength, onCodeChanged }, ref) => {
    const [code, setCode] = useState(Array(pinLength).fill(''));

    const handleTextChange = (text, index) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);
        onCodeChanged(newCode.join(''));

        // Move to the next input field if available
        if (text && index < pinLength - 1) {
            inputs[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && code[index] === '') {
            // If backspace is pressed on an empty field, move to the previous field
            if (index > 0) {
                inputs[index - 1].focus();
            }
        }
    };

    const inputs = [];

    useImperativeHandle(ref, () => ({
        focusFirstInput: () => {
            if (inputs[0]) {
                inputs[0].focus();
            }
        }
    }));

    return (
        <View style={styles.container}>
            {Array(pinLength).fill().map((_, index) => (
                <TextInput
                    key={index}
                    style={styles.input}
                    maxLength={1}
                    keyboardType="numeric"
                    value={code[index]}
                    onChangeText={(text) => handleTextChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    ref={(input) => inputs[index] = input} // Store the input references
                />
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    input: {
        borderWidth: 1,
        borderColor: '#020202',
        padding: 10,
        textAlign: 'center',
        width: 40,
        marginHorizontal: 8,
    },
});

export default PinInput;
