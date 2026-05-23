import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getSetting, setSetting } from '@/db/settings';
import { performSync } from '@/db/sync';
import { getLastSyncAt, getSyncUrl, setSyncUrl } from '@/db/sync-settings';
import { useTheme } from '@/hooks/use-theme';
import type { SyncResult } from '@/db/sync';

type FirstDay = 'sunday' | 'monday';

const OPTIONS: { value: FirstDay; label: string }[] = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
];

function formatLastSync(ms: number): string {
  if (ms === 0) return 'Never';
  const d = new Date(ms);
  return d.toLocaleString();
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();

  const [firstDay, setFirstDay] = useState<FirstDay>('sunday');
  const [syncUrl, setSyncUrlState] = useState('');
  const [lastSync, setLastSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    async function load() {
      const [fd, url, ls] = await Promise.all([
        getSetting(db, 'first_day_of_week', 'sunday'),
        getSyncUrl(db),
        getLastSyncAt(db),
      ]);
      setFirstDay(fd as FirstDay);
      setSyncUrlState(url);
      setLastSync(ls);
    }
    load();
  }, [db]);

  async function handleChange(value: FirstDay) {
    setFirstDay(value);
    await setSetting(db, 'first_day_of_week', value);
  }

  async function handleSaveUrl() {
    await setSyncUrl(db, syncUrl);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    const result = await performSync(db, syncUrl);
    setSyncResult(result);
    setSyncing(false);
    if (result.success) {
      const ls = await getLastSyncAt(db);
      setLastSync(ls);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.heading}>
          Settings
        </ThemedText>

        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>First day of the week</ThemedText>
          {OPTIONS.map((option) => {
            const active = firstDay === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleChange(option.value)}
                style={[styles.optionRow, active && styles.optionRowActive]}
              >
                <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                {active && (
                  <ThemedText style={styles.checkmark}>✓</ThemedText>
                )}
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Sync</ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
            Server URL
          </ThemedText>
          <View style={styles.urlRow}>
            <TextInput
              style={[styles.urlInput, { color: theme.text, borderColor: theme.textSecondary }]}
              placeholder="http://192.168.1.x:42061"
              placeholderTextColor={theme.textSecondary}
              value={syncUrl}
              onChangeText={setSyncUrlState}
              onBlur={handleSaveUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />
          </View>

          <Pressable
            onPress={handleSync}
            disabled={syncing || syncUrl.trim().length === 0}
            style={[styles.syncBtn, (syncing || syncUrl.trim().length === 0) && styles.syncBtnDisabled]}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.syncBtnText}>Sync Now</ThemedText>
            )}
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.syncInfo}>
            Last sync: {formatLastSync(lastSync)}
          </ThemedText>

          {syncResult && !syncResult.success && (
            <ThemedText type="small" style={styles.syncError}>
              {syncResult.error}
            </ThemedText>
          )}
          {syncResult && syncResult.success && (
            <ThemedText type="small" style={styles.syncSuccess}>
              Synced successfully
            </ThemedText>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  heading: {
    marginBottom: Spacing.four,
  },
  section: {
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  optionRowActive: {
    paddingHorizontal: Spacing.three,
  },
  optionLabel: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
  fieldLabel: {
    marginBottom: Spacing.one,
  },
  urlRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  syncBtn: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  syncBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  syncInfo: {
    marginBottom: Spacing.one,
  },
  syncError: {
    color: '#ff3b30',
  },
  syncSuccess: {
    color: '#34c759',
  },
});
