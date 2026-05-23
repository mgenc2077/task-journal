import { Dimensions, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Task } from '@/types/task';
import { useTheme } from '@/hooks/use-theme';

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDate: string | null;
  tasksByDate: Record<string, Task[]>;
  firstDayOfWeek: 'sunday' | 'monday';
  onDayPress: (date: string) => void;
}

const MAX_VISIBLE_TASKS = 2;

const SUNDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = (SCREEN_WIDTH - Spacing.one * 2) / 7;

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

export function CalendarGrid({ year, month, selectedDate, tasksByDate, firstDayOfWeek, onDayPress }: CalendarGridProps) {
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
          const isSelected = entry.date === selectedDate;
          const tasks = tasksByDate[entry.date] ?? [];
          const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
          const overflow = tasks.length - MAX_VISIBLE_TASKS;
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
                isSelected && [
                  styles.selectedCell,
                  { backgroundColor: theme.backgroundSelected },
                ],
              ]}
            >
              <ThemedText
                style={[styles.dayNumber, isToday && styles.todayText]}
              >
                {entry.day}
              </ThemedText>
              {visibleTasks.map((task) => (
                <ThemedText
                  key={task.id}
                  style={styles.taskTitle}
                  numberOfLines={1}
                >
                  {task.title}
                </ThemedText>
              ))}
              {overflow > 0 && (
                <ThemedText style={styles.overflowText}>
                  +{overflow} more
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.half,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: Spacing.one,
  },
  dayHeader: {
    width: CELL_WIDTH,
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_WIDTH,
    minHeight: CELL_WIDTH * 0.9,
    padding: Spacing.one,
    alignItems: 'center',
    borderRadius: Spacing.one,
  },
  todayCell: {
    borderWidth: 1.5,
  },
  selectedCell: {
    borderRadius: Spacing.one,
  },
  dayNumber: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.half,
  },
  todayText: {
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 10,
    lineHeight: 13,
    width: '100%',
    textAlign: 'center',
    overflow: 'hidden',
  },
  overflowText: {
    fontSize: 9,
    opacity: 0.6,
  },
});
