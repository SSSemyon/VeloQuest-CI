import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AchievementSnapshot } from '../backend/achievements';
import { useTheme, useThemedStyles } from '../theme';

export function AchievementsPanel({
  snapshot,
  loading,
  onRefresh,
}: {
  snapshot: AchievementSnapshot;
  loading: boolean;
  onRefresh: () => void;
}) {
  const styles = useThemedStyles(baseStyles);
  const { colors } = useTheme();
  const unlockedCount = snapshot.items.filter((item) => item.unlocked).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>ДОСТИЖЕНИЯ</Text>
          <Text style={styles.meta}>{unlockedCount} из {snapshot.items.length} открыто</Text>
        </View>
        <Pressable disabled={loading} hitSlop={10} onPress={onRefresh}>
          {loading
            ? <ActivityIndicator size="small" color={colors.green} />
            : <Ionicons name="refresh-outline" size={20} color={colors.green} />}
        </Pressable>
      </View>

      {snapshot.items.length === 0 ? (
        <Text style={styles.empty}>Прогресс появится после первой подтверждённой поездки.</Text>
      ) : snapshot.items.map((item) => {
        const percentage = Math.min(100, Math.max(0, item.progressValue / Math.max(1, item.targetValue) * 100));
        return (
          <View key={item.code} style={styles.item}>
            <View style={[styles.icon, item.unlocked && styles.iconUnlocked]}>
              <Ionicons name={item.unlocked ? 'ribbon' : 'lock-closed-outline'} size={17} color={item.unlocked ? '#FFFFFF' : colors.green} />
            </View>
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{item.displayName}</Text>
                {item.unlocked && <Text style={styles.unlocked}>Открыто</Text>}
              </View>
              <Text style={styles.description}>{item.description}</Text>
              <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(item.unlocked ? 100 : 3, percentage)}%` }]} /></View>
              <Text style={styles.progress}>{Math.min(item.progressValue, item.targetValue).toFixed(0)} / {item.targetValue.toFixed(0)} · одноразово +{item.xpReward} XP</Text>
            </View>
          </View>
        );
      })}

      {snapshot.cosmetics.length > 0 && (
        <View style={styles.collection}>
          <Text style={styles.collectionTitle}>Коллекция наград</Text>
          {snapshot.cosmetics.map((reward) => (
            <View key={reward.code} style={styles.reward}>
              <Ionicons name="sparkles-outline" size={16} color={colors.green} />
              <Text style={styles.rewardText}>{reward.displayName}</Text>
              <Text style={styles.rewardKind}>{reward.kind}</Text>
            </View>
          ))}
          <Text style={styles.note}>Косметика VeloQuest Bike не является реальным компонентом велосипеда.</Text>
        </View>
      )}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: { marginTop: 16, borderRadius: 18, padding: 16, backgroundColor: '#F4F2EB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  kicker: { color: '#174C2C', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  meta: { color: '#696D68', fontSize: 12, marginTop: 3 },
  empty: { color: '#696D68', fontSize: 13, lineHeight: 19, paddingVertical: 8 },
  item: { flexDirection: 'row', gap: 11, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D9D8D0' },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5EBDD' },
  iconUnlocked: { backgroundColor: '#174C2C' },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, color: '#141714', fontSize: 14, fontWeight: '800' },
  unlocked: { color: '#174C2C', fontSize: 10, fontWeight: '800' },
  description: { color: '#696D68', fontSize: 11, lineHeight: 16, marginTop: 2 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: '#D9D8D0', marginTop: 8 },
  fill: { height: 5, borderRadius: 3, backgroundColor: '#174C2C' },
  progress: { color: '#696D68', fontSize: 10, marginTop: 5 },
  collection: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D9D8D0' },
  collectionTitle: { color: '#141714', fontSize: 13, fontWeight: '800', marginBottom: 7 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5 },
  rewardText: { flex: 1, color: '#141714', fontSize: 12, fontWeight: '700' },
  rewardKind: { color: '#696D68', fontSize: 10 },
  note: { color: '#777B76', fontSize: 9, lineHeight: 14, marginTop: 7 },
});
