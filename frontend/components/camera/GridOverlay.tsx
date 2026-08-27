import { StyleSheet, View } from 'react-native';

export function GridOverlay() {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Vertical lines */}
      <View style={[styles.line, styles.vertical, { left: '33.33%' }]} />
      <View style={[styles.line, styles.vertical, { left: '66.66%' }]} />
      {/* Horizontal lines */}
      <View style={[styles.line, styles.horizontal, { top: '33.33%' }]} />
      <View style={[styles.line, styles.horizontal, { top: '66.66%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  line: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    top: 0,
    bottom: 0,
  },
  horizontal: {
    height: StyleSheet.hairlineWidth,
    left: 0,
    right: 0,
  },
});
