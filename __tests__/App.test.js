import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

test('hello world!', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/hello world/i);
  expect(linkElement).toBeTruthy();
});