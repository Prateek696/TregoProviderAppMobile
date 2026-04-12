import React, { useRef, useEffect, memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

function LanguageToggle() {
  const { i18n } = useTranslation();
  const isEN = i18n.language === 'en';

  // Animated slider position (0 = EN, 1 = PT)
  const slide = useRef(new Animated.Value(isEN ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: isEN ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 120,
    }).start();
  }, [isEN, slide]);

  const toggle = () => setLanguage(isEN ? 'pt' : 'en');

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 28] });

  return (
    <TouchableOpacity style={s.btn} onPress={toggle} activeOpacity={0.7}>
      {/* Animated highlight pill */}
      <Animated.View style={[s.highlight, { transform: [{ translateX }] }]} />
      <View style={s.row}>
        <Text style={[s.label, isEN && s.active]}>EN</Text>
        <Text style={[s.label, !isEN && s.active]}>PT</Text>
      </View>
    </TouchableOpacity>
  );
}

export default memo(LanguageToggle);

const s = StyleSheet.create({
  btn: {
    width: 62,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    width: 32,
    height: 24,
    left: 2,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    width: 28,
    textAlign: 'center',
  },
  active: { color: '#ffffff' },
});
