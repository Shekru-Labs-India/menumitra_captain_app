import React from 'react';
import { Image } from 'native-base';

const iconMap = {
  // Navigation Icons
  'arrow-back': require('../assets/icons/arrow-back.png'),
  'menu': require('../assets/icons/menu.png'),
  'notification': require('../assets/icons/notification.png'),
  
  // Action Icons
  'plus': require('../assets/icons/plus.png'),
  'minus': require('../assets/icons/minus.png'),
  'search': require('../assets/icons/search.png'),
  'filter': require('../assets/icons/filter.png'),
  
  // Status Icons
  'check': require('../assets/icons/check.png'),
  'close': require('../assets/icons/close.png'),
  'info': require('../assets/icons/info.png'),
  
  // Common Icons
  'user': require('../assets/icons/user.png'),
  'calendar': require('../assets/icons/calendar.png'),
  'clock': require('../assets/icons/clock.png'),
  'location': require('../assets/icons/location.png'),
};

const BoxIcon = ({ name, size = 24, color = "black", ...props }) => {
  const iconSource = iconMap[name];
  
  if (!iconSource) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }

  return (
    <Image
      source={iconSource}
      alt={name}
      width={size}
      height={size}
      tintColor={color}
      resizeMode="contain"
      {...props}
    />
  );
};

export default BoxIcon;
