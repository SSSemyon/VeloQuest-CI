import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'veloquest.theme.v1';

const lightColors = {
  ivory: '#FBFAF6',
  paper: '#F4F2EB',
  graphite: '#141714',
  muted: '#696D68',
  line: '#DCDBD3',
  sage: '#E5EBDD',
  green: '#174C2C',
  orange: '#F05B11',
  white: '#FFFFFF',
};

const darkColors = {
  ivory: '#101512',
  paper: '#171D19',
  graphite: '#EEF3EF',
  muted: '#ADB8B0',
  line: '#354139',
  sage: '#26342B',
  green: '#8FC79D',
  orange: '#FF9552',
  white: '#18201B',
};

type ThemeContextValue = {
  dark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: typeof lightColors;
};

const ThemeContext = createContext<ThemeContextValue>({ dark: false, mode: 'light', setMode: () => undefined, colors: lightColors });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setModeState(stored);
    });
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    void AsyncStorage.setItem(STORAGE_KEY, nextMode);
  };
  const value = useMemo<ThemeContextValue>(() => ({
    dark: mode === 'dark',
    mode,
    setMode,
    colors: mode === 'dark' ? darkColors : lightColors,
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

function luminance(hex: string) {
  const value = hex.slice(1);
  if (!/^[0-9a-f]{6}$/i.test(value)) return 0.5;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  return channels.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function darkColor(property: string, value: unknown) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return value;
  const normalized = value.toUpperCase();
  if (normalized === '#F05B11' || normalized === '#EF7311' || normalized === '#B7460D') return property === 'backgroundColor' ? '#A94717' : darkColors.orange;
  if (normalized === '#174C2C' || normalized === '#113C22') return property === 'backgroundColor' ? '#245D38' : darkColors.green;
  if (normalized === '#9A3D25' || normalized === '#7D3827') return '#FFAA91';
  if (property === 'backgroundColor') {
    if (luminance(normalized) > 0.9) return darkColors.ivory;
    if (luminance(normalized) > 0.72) return darkColors.paper;
    return value;
  }
  if (property === 'borderColor' || property === 'borderTopColor' || property === 'borderBottomColor') {
    if (luminance(normalized) > 0.55) return darkColors.line;
    return value;
  }
  if (property === 'color') {
    if (luminance(normalized) < 0.45) return darkColors.graphite;
    if (luminance(normalized) < 0.75) return darkColors.muted;
  }
  return value;
}

export function useThemedStyles<T extends Record<string, unknown>>(baseStyles: T): T {
  const { dark } = useTheme();
  return useMemo(() => {
    if (!dark) return baseStyles;
    return Object.fromEntries(Object.entries(baseStyles).map(([name, value]) => {
      const flattened = StyleSheet.flatten(value as never) as Record<string, unknown> | undefined;
      if (!flattened) return [name, value];
      const themed = Object.fromEntries(Object.entries(flattened).map(([property, propertyValue]) => [property, darkColor(property, propertyValue)]));
      return [name, themed];
    })) as T;
  }, [baseStyles, dark]);
}
