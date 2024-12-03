import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export function useBottomTabOverflow() {
  const { bottom } = useSafeAreaInsets();
  return Platform.select({
    ios: bottom + 80,
    android: bottom + 60,
    default: bottom + 60,
  });
}
