import { ScrollView, View, Text, useColorScheme as useRNColorScheme, StyleSheet } from 'react-native';
import { CashouHeader } from '@/components/cashou-header';
import { LevelCard } from '@/components/level-card';
import { DailyQuizCard } from '@/components/daily-quiz-card';
import { CashouTheme } from '@/constants/cashou-theme';

export default function HomeScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <CashouHeader
        showBackButton={true}
        onMenuPress={() => console.log('Menu pressed')}
      />

      {/* Content */}
      <ScrollView style={styles.scrollView}>
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text
            style={[styles.greeting, { fontFamily: CashouTheme.fonts.heading, color: theme.text }]}
          >
            Bonjour John 👋
          </Text>
          <Text
            style={[styles.message, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}
          >
            Tu as une partie en cours avec une action de ta part en attente.
          </Text>
          <Text
            style={[styles.message, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}
          >
            N'oublie pas le daily quiz du jour pour garder ta win streak !
          </Text>
        </View>

        {/* Level Card */}
        <LevelCard
          level={12}
          progression={86}
          currentReturn={28}
          status="in_progress"
        />

        {/* Daily Quiz Card */}
        <DailyQuizCard
          winStreak={2}
          timeRemaining="6h34m"
          status="todo"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  greetingSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  greeting: {
    fontSize: 30,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
  },
});
