import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// A function to scale the font size dynamically
const scaleFontSize = (size) => (width / 375) * size; // 375 is the base width (e.g., iPhone X)

export const HEADER_FONT_SIZE = scaleFontSize(15);
