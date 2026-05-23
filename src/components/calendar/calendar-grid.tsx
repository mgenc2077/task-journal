import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CalendarGridProps {
  year: number;
  month: number;
  taskDates: Set<string>;
  firstDayOfWeek: 'sunday' | 'monday';
  onDayPress: (date: string) => void;
}

const SUNDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDays(year: number, month: number, firstDayOfWeek: 'sunday' | 'monday') {
  const jsDay = new Date(year, month, 1).getDay();
  const offset = firstDayOfWeek === 'monday' ? (jsDay + 6) % 7 : jsDay;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: (null | { date: string; day: number })[] = [];

  for (let i = 0; i < offset; i++) {
    result.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    result.push({ date: formatDate(year, month, d), day: d });
  }
  return result;
}

function getToday(): string {
  const d = new Date();
  return formatDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export function CalendarGrid({ year, month, taskDates, firstDayOfWeek, onDayPress }: CalendarGridProps) {
  const theme = useTheme();
  const today = getToday();
  const days = getDays(year, month, firstDayOfWeek);
  const labels = firstDayOfWeek === 'monday' ? MONDAY_LABELS : SUNDAY_LABELS;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        {labels.map((label) => (
          <ThemedView key={label} style={styles.dayHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              {label}
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
      <ThemedView style={styles.grid}>
        {days.map((entry, i) => {
          if (!entry) {
            return <ThemedView key={`blank-${i}`} style={styles.cell} />;
          }
          const isToday = entry.date === today;
          const hasTasks = taskDates.has(entry.date);
          return (
            <Pressable
              key={entry.date}
              onPress={() => onDayPress(entry.date)}
              style={[
                styles.cell,
                isToday && [
                  styles.todayCell,
                  { borderColor: theme.text },
                ],
              ]}
            >
              <ThemedText
                type="small"
                style={[styles.dayNumber, isToday && styles.todayText]}
              >
                {entry.day}
              </ThemedText>
              {hasTasks && (
                <ThemedView
                  style={[styles.dot, { backgroundColor: theme.text }]}
                />
              )}
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

const cellSize = (Math.min(400, 360) - Spacing.four * 2) / 7;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: Spacing.one,
  },
  dayHeader: {
    width: cellSize,
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: cellSize,
    height: cellSize + Spacing.half,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.one,
  },
  todayCell: {
    borderWidth: 1.5,
  },
  dayNumber: {
    textAlign: 'center',
  },
  todayText: {
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
});
