import { useSharedValue } from 'react-native-reanimated';

export function useScrollViewOffset(scrollRef) {
  const offset = useSharedValue(0);

  const scrollHandler = (event) => {
    offset.value = event.nativeEvent.contentOffset.y;
  };

  if (scrollRef.current) {
    scrollRef.current.scrollHandler = scrollHandler;
  }

  return offset;
}
