import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

export type RemoteBikeImageSource = {
  url: string;
  sourceLabel: string;
};

type Props = {
  sources: RemoteBikeImageSource[];
  fallback: ImageSourcePropType;
};

export function RemoteBikeImage({ sources, fallback }: Props) {
  const validSources = useMemo(
    () => sources.filter((source) => /^https:\/\//i.test(source.url)),
    [sources],
  );
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(validSources.length > 0);

  useEffect(() => {
    setIndex(0);
    setLoading(validSources.length > 0);
  }, [validSources]);

  const current = validSources[index];
  const imageSource = current ? { uri: current.url } : fallback;

  return (
    <View style={styles.container}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="contain"
        onLoadStart={() => current && setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          if (index + 1 < validSources.length) setIndex((value) => value + 1);
          else setIndex(validSources.length);
        }}
      />
      {loading && current && <ActivityIndicator style={styles.loader} color="#174C2C" />}
      {current && <Text style={styles.source}>{current.sourceLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  loader: { position: 'absolute' },
  source: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(251,250,246,0.92)',
    color: '#73776F',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
