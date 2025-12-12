import React from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, View, Alert, Text, useColorScheme as useRNColorScheme, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { CashouTheme } from '@/constants/cashou-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function UserProfile() {
  const { user, isLoading, logout } = useAuth();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // Get user initials for avatar
  const getInitials = (): string => {
    if (user?.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = (): string => {
    return user?.name || user?.username || 'Investisseur';
  };

  // Calculate level progress (assuming levels go from 1-10, adjust as needed)
  const getLevelProgress = (): number => {
    if (!user?.levelId) return 0;
    const level = parseInt(user.levelId, 10);
    return Math.min((level / 10) * 100, 100);
  };

  // Check if stats section has content
  const hasStatsContent = (): boolean => {
    const hasPoints = !!(user?.points !== undefined && user.points !== null && user.points > 0);
    const hasCurrentStreak = !!(user?.currentStreak !== undefined && user.currentStreak > 0);
    const hasMaxStreak = !!(user?.maxStreak !== undefined && user.maxStreak > 0);
    return hasPoints || hasCurrentStreak || hasMaxStreak;
  };

  // Check if achievements section has content
  const hasAchievementsContent = (): boolean => {
    const hasStreak7 = !!(user?.currentStreak !== undefined && user.currentStreak >= 7);
    const hasStreak30 = !!(user?.currentStreak !== undefined && user.currentStreak >= 30);
    const hasPoints1000 = !!(user?.points && user.points >= 1000);
    const hasPoints5000 = !!(user?.points && user.points >= 5000);
    const hasLevel5 = !!(user?.levelId && parseInt(user.levelId, 10) >= 5);
    return hasStreak7 || hasStreak30 || hasPoints1000 || hasPoints5000 || hasLevel5;
  };

  // Check if account info section has content
  const hasAccountInfoContent = (): boolean => {
    return !!(user?.username || user?.createdAt);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + CashouTheme.spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header Section */}
      <View style={[styles.heroSection, { backgroundColor: theme.card }]}>
        {/* Avatar Circle */}
        <View style={[styles.avatarContainer, { borderColor: theme.accent }]}>
          {user.image ? (
            <View style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: theme.accent }]}>
              {getInitials()}
            </Text>
          )}
        </View>

        {/* User Name */}
        <Text style={[styles.userName, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
          {getDisplayName()}
        </Text>

        {/* User Email */}
        <Text style={[styles.userEmail, { color: theme.text, opacity: 0.7 }]}>
          {user.email}
        </Text>
      </View>

      {/* Stats Cards Grid */}
      {hasStatsContent() && (
        <View style={styles.statsGrid}>
          {/* Points Card */}
          {(user.points !== undefined && user.points !== null && user.points > 0) && (
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.statIconContainer, { backgroundColor: `${theme.accent}20` }]}>
                <Ionicons name="trophy" size={24} color={theme.accent} />
              </View>
              <Text style={[styles.statValue, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                {user.points}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text, opacity: 0.7 }]}>
                Points
              </Text>
            </View>
          )}

          {/* Current Streak Card */}
          {(user.currentStreak !== undefined && user.currentStreak > 0) && (
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#E87F0020' }]}>
                <Ionicons name="flame" size={24} color="#E87F00" />
              </View>
              <Text style={[styles.statValue, { color: '#E87F00', fontFamily: CashouTheme.fonts.subheading }]}>
                {user.currentStreak}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text, opacity: 0.7 }]}>
                Jours
              </Text>
            </View>
          )}

          {/* Best Streak Card */}
          {(user.maxStreak !== undefined && user.maxStreak > 0) && (
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FFD70020' }]}>
                <Ionicons name="star" size={24} color="#FFD700" />
              </View>
              <Text style={[styles.statValue, { color: '#FFD700', fontFamily: CashouTheme.fonts.subheading }]}>
                {user.maxStreak}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text, opacity: 0.7 }]}>
                Record
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Level Progress Card */}
      {user.levelId && (
        <View style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.progressHeader}>
            <View style={styles.progressHeaderLeft}>
              <Ionicons name="trending-up" size={20} color={theme.accent} />
              <Text style={[styles.progressTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                Niveau actuel
              </Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: theme.accent }]}>
              <Text style={[styles.levelBadgeText, { fontFamily: CashouTheme.fonts.subheading }]}>
                Niveau {user.levelId}
              </Text>
            </View>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#3A3D55' : '#E0E0E0' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: theme.accent,
                  width: `${getLevelProgress()}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressSubtext, { color: theme.text, opacity: 0.6 }]}>
            Progression vers le niveau suivant
          </Text>
        </View>
      )}

      {/* Achievements Section */}
      {hasAchievementsContent() && (
        <View style={[styles.achievementsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.achievementsHeader}>
            <Ionicons name="medal" size={24} color={theme.accent} />
            <Text style={[styles.achievementsTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
              Réalisations
            </Text>
          </View>
          <View style={styles.achievementsGrid}>
            {/* Streak Achievement */}
            {user.currentStreak !== undefined && user.currentStreak >= 7 && (
              <View style={[styles.achievementBadge, { backgroundColor: `${theme.accent}20` }]}>
                <Ionicons name="flame" size={20} color={theme.accent} />
                <Text style={[styles.achievementText, { color: theme.text }]}>
                  Série de 7 jours
                </Text>
              </View>
            )}
            {user.currentStreak !== undefined && user.currentStreak >= 30 && (
              <View style={[styles.achievementBadge, { backgroundColor: `${theme.accent}20` }]}>
                <Ionicons name="trophy" size={20} color={theme.accent} />
                <Text style={[styles.achievementText, { color: theme.text }]}>
                  Maître de la régularité
                </Text>
              </View>
            )}
            {/* Points Achievement */}
            {user.points && user.points >= 1000 && (
              <View style={[styles.achievementBadge, { backgroundColor: `${theme.accent}20` }]}>
                <Ionicons name="star" size={20} color={theme.accent} />
                <Text style={[styles.achievementText, { color: theme.text }]}>
                  1000+ points
                </Text>
              </View>
            )}
            {user.points && user.points >= 5000 && (
              <View style={[styles.achievementBadge, { backgroundColor: `${theme.accent}20` }]}>
                <Ionicons name="diamond" size={20} color={theme.accent} />
                <Text style={[styles.achievementText, { color: theme.text }]}>
                  Expert investisseur
                </Text>
              </View>
            )}
            {/* Level Achievement */}
            {user.levelId && parseInt(user.levelId, 10) >= 5 && (
              <View style={[styles.achievementBadge, { backgroundColor: `${theme.accent}20` }]}>
                <Ionicons name="rocket" size={20} color={theme.accent} />
                <Text style={[styles.achievementText, { color: theme.text }]}>
                  Niveau 5 atteint
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Account Info Card */}
      {hasAccountInfoContent() && (
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="person-circle-outline" size={24} color={theme.text} />
            <Text style={[styles.infoTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
              Informations du compte
            </Text>
          </View>
          {user.username && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.text, opacity: 0.7 }]}>
                Nom d'utilisateur
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {user.username}
              </Text>
            </View>
          )}
          {user.createdAt && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.text, opacity: 0.7 }]}>
                Membre depuis
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: '#F44336', borderColor: '#D32F2F' }]}
        onPress={handleLogout}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.logoutButtonText}>
            Se déconnecter
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: CashouTheme.spacing.md,
    gap: CashouTheme.spacing.lg,
  },
  heroSection: {
    borderRadius: CashouTheme.borderRadius.xl,
    padding: CashouTheme.spacing.xl,
    alignItems: 'center',
    marginTop: CashouTheme.spacing.sm,
    borderWidth: CashouTheme.borderWidth.thin,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: CashouTheme.borderWidth.thick,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: CashouTheme.spacing.md,
    backgroundColor: 'transparent',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: CashouTheme.fonts.subheading,
  },
  userName: {
    fontSize: 28,
    marginBottom: CashouTheme.spacing.xs,
    textAlign: 'center',
    fontFamily: CashouTheme.fonts.subheading,
  },
  userEmail: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: CashouTheme.fonts.body,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: CashouTheme.spacing.md,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: CashouTheme.borderRadius.lg,
    padding: CashouTheme.spacing.md,
    alignItems: 'center',
    borderWidth: CashouTheme.borderWidth.thin,
    gap: CashouTheme.spacing.sm,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: CashouTheme.spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: CashouTheme.fonts.subheading,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: CashouTheme.fonts.body,
  },
  progressCard: {
    borderRadius: CashouTheme.borderRadius.lg,
    padding: CashouTheme.spacing.lg,
    borderWidth: CashouTheme.borderWidth.thin,
    gap: CashouTheme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CashouTheme.spacing.sm,
  },
  progressTitle: {
    fontSize: 18,
    fontFamily: CashouTheme.fonts.subheading,
  },
  levelBadge: {
    paddingHorizontal: CashouTheme.spacing.md,
    paddingVertical: CashouTheme.spacing.xs + 2,
    borderRadius: CashouTheme.borderRadius.md,
  },
  levelBadgeText: {
    color: '#1C1E33',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: CashouTheme.fonts.subheading,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: CashouTheme.borderRadius.sm - 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: CashouTheme.borderRadius.sm - 2,
  },
  progressSubtext: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: CashouTheme.fonts.body,
  },
  achievementsCard: {
    borderRadius: CashouTheme.borderRadius.lg,
    padding: CashouTheme.spacing.lg,
    borderWidth: CashouTheme.borderWidth.thin,
    gap: CashouTheme.spacing.md,
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CashouTheme.spacing.sm,
  },
  achievementsTitle: {
    fontSize: 18,
    fontFamily: CashouTheme.fonts.subheading,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CashouTheme.spacing.sm,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CashouTheme.spacing.md,
    paddingVertical: CashouTheme.spacing.sm,
    borderRadius: 20,
    gap: CashouTheme.spacing.xs + 2,
  },
  achievementText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: CashouTheme.fonts.body,
  },
  infoCard: {
    borderRadius: CashouTheme.borderRadius.lg,
    padding: CashouTheme.spacing.lg,
    borderWidth: CashouTheme.borderWidth.thin,
    gap: CashouTheme.spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CashouTheme.spacing.sm,
    marginBottom: CashouTheme.spacing.xs,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: CashouTheme.fonts.subheading,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: CashouTheme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: CashouTheme.fonts.body,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: CashouTheme.fonts.body,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: CashouTheme.spacing.md,
    borderRadius: CashouTheme.borderRadius.lg,
    gap: CashouTheme.spacing.sm,
    borderWidth: CashouTheme.borderWidth.medium,
    marginTop: CashouTheme.spacing.sm,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: CashouTheme.fonts.subheading,
  },
});
