export const QR_STYLES = {
  DEFAULT: {
    size: 280,
    padding: 20,
    codeStyle: 'circle',  // 'circle', 'dot', 'square', 'sharp'
    logo: {
      source: require('../../assets/images/mm-logo.png'),
      scale: 0.26,
      mode: 'circle',
      background: 'white'
    },
    backgroundOptions: {
      color: 'white',
    },
    innerEyeStyle: 'circle',
    outerEyeStyle: 'circle',
    dotColors: ['black'],
    maskPattern: 0,
  },
  DARK: {
    // Remove DARK theme for now
  }
}; 