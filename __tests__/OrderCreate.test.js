import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OrderCreate from '../path/to/OrderCreate'; // Adjust the import path as necessary
import { create } from 'react-test-renderer';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

describe('OrderCreate Component', () => {
  it('triggers print functionality when print button is clicked', () => {
    const { getByText } = render(<OrderCreate route={{ params: {} }} navigation={{}} />);
    
    const printButton = getByText('Print');
    fireEvent.press(printButton);
    
    // Add assertions to verify print functionality
    expect(Alert.alert).toHaveBeenCalledWith("Success", expect.any(String), expect.any(Array));
  });
});