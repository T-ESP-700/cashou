import React from "react";
import { ActivityIndicator, View, Alert, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import { useCashouTheme } from "@/hooks/use-cashou-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Badge, Button } from "@/components/ui";
import { useState } from "react";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { Image } from "react-native";

export function UserProfile() {
  const { user, isLoading, logout } = useAuth();
  const {
    colors,
    status,
    special,
    fonts,
    spacing,
    borderRadius,
    borderWidth,
    isDark,
  } = useCashouTheme();
  const insets = useSafeAreaInsets();

  const [editModalVisible, setEditModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // Get user initials for avatar
  const getInitials = (): string => {
    if (user?.name) {
      const names = user.name.split(" ");
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
    return "U";
  };

  // Get display name
  const getDisplayName = (): string => {
    console.log("User name", user?.name);
    console.log("User username", user?.username);
    return user?.name || user?.username || "Investisseur";
  };

  // Calculate level progress (assuming levels go from 1-10, adjust as needed)
  const getLevelProgress = (): number => {
    if (!user?.levelId) return 0;
    const level = parseInt(user.levelId, 10);
    return Math.min((level / 10) * 100, 100);
  };

  // Check if stats section has content
  const hasStatsContent = (): boolean => {
    const hasPoints = !!(
      user?.points !== undefined &&
      user.points !== null &&
      user.points > 0
    );
    const hasCurrentStreak = !!(
      user?.currentStreak !== undefined && user.currentStreak > 0
    );
    const hasMaxStreak = !!(
      user?.maxStreak !== undefined && user.maxStreak > 0
    );
    return hasPoints || hasCurrentStreak || hasMaxStreak;
  };

  // Check if achievements section has content
  const hasAchievementsContent = (): boolean => {
    const hasStreak7 = !!(
      user?.currentStreak !== undefined && user.currentStreak >= 7
    );
    const hasStreak30 = !!(
      user?.currentStreak !== undefined && user.currentStreak >= 30
    );
    const hasPoints1000 = !!(user?.points && user.points >= 1000);
    const hasPoints5000 = !!(user?.points && user.points >= 5000);
    const hasLevel5 = !!(user?.levelId && parseInt(user.levelId, 10) >= 5);
    return (
      hasStreak7 || hasStreak30 || hasPoints1000 || hasPoints5000 || hasLevel5
    );
  };

  // Check if account info section has content
  const hasAccountInfoContent = (): boolean => {
    return !!(user?.username || user?.createdAt);
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.md,
        gap: spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header Section */}
      <Card
        variant="elevated"
        padding="lg"
        style={{
          marginTop: spacing.sm,
          paddingVertical: spacing.xl,
          alignItems: "center",
        }}
      >
        {/* Avatar Circle */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: borderWidth.thick,
            borderColor: colors.accent,
            marginBottom: spacing.md,
            overflow: "hidden", // ✅ Important pour que l'image respecte le borderRadius
          }}
        >
          {user.image ? (
            // ✅ Affiche l'image si elle existe
            <Image
              source={{ uri: user.image }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 50,
              }}
              resizeMode="cover"
            />
          ) : (
            // ✅ Fallback sur les initiales
            <Text
              style={{
                fontSize: 36,
                fontWeight: "bold",
                fontFamily: fonts.subheading,
                color: colors.accent,
              }}
            >
              {getInitials()}
            </Text>
          )}
        </View>

        {/* User Name */}
        <Text
          style={{
            fontSize: 28,
            fontFamily: fonts.subheading,
            color: colors.text,
            textAlign: "center",
            marginBottom: spacing.xs,
          }}
        >
          {getDisplayName()}
        </Text>

        {/* User Email */}
        <Text
          style={{
            fontSize: 14,
            fontFamily: fonts.body,
            color: colors.text,
            opacity: 0.7,
            textAlign: "center",
            marginBottom: spacing.md,
          }}
        >
          {user.email}
        </Text>

        {/* Edit Profile Button */}
        <Button
          title="Éditer"
          variant="outline"
          onPress={() => setEditModalVisible(true)}
          leftIcon={
            <Ionicons name="create-outline" size={18} color={colors.accent} />
          }
        />

        {/* 4. Add modal before closing tag */}
        <EditProfileModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
        />
      </Card>

      {/* Stats Cards Grid */}
      {hasStatsContent() && (
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}
        >
          {/* Points Card */}
          {user.points !== undefined &&
            user.points !== null &&
            user.points > 0 && (
              <Card
                variant="outlined"
                padding="md"
                style={{
                  flex: 1,
                  alignItems: "center",
                  minWidth: "30%",
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: `${colors.accent}20`,
                    marginBottom: spacing.xs,
                  }}
                >
                  <Ionicons name="trophy" size={24} color={colors.accent} />
                </View>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    fontFamily: fonts.subheading,
                    color: colors.text,
                  }}
                >
                  {user.points}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: fonts.body,
                    color: colors.text,
                    opacity: 0.7,
                    textAlign: "center",
                  }}
                >
                  Points
                </Text>
              </Card>
            )}

          {/* Current Streak Card */}
          {user.currentStreak !== undefined && user.currentStreak > 0 && (
            <Card
              variant="outlined"
              padding="md"
              style={{
                flex: 1,
                alignItems: "center",
                minWidth: "30%",
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: special.streakLight,
                  marginBottom: spacing.xs,
                }}
              >
                <Ionicons name="flame" size={24} color={special.streak} />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  fontFamily: fonts.subheading,
                  color: special.streak,
                }}
              >
                {user.currentStreak}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: fonts.body,
                  color: colors.text,
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                Jours
              </Text>
            </Card>
          )}

          {/* Best Streak Card */}
          {user.maxStreak !== undefined && user.maxStreak > 0 && (
            <Card
              variant="outlined"
              padding="md"
              style={{
                flex: 1,
                alignItems: "center",
                minWidth: "30%",
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: special.goldLight,
                  marginBottom: spacing.xs,
                }}
              >
                <Ionicons name="star" size={24} color={special.gold} />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  fontFamily: fonts.subheading,
                  color: special.gold,
                }}
              >
                {user.maxStreak}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: fonts.body,
                  color: colors.text,
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                Record
              </Text>
            </Card>
          )}
        </View>
      )}

      {/* Level Progress Card */}
      {user.levelId && (
        <Card variant="outlined" padding="lg" style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Ionicons name="trending-up" size={20} color={colors.accent} />
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: fonts.subheading,
                  color: colors.text,
                }}
              >
                Niveau actuel
              </Text>
            </View>
            <Badge label={`Niveau ${user.levelId}`} variant="accent" />
          </View>
          <View
            style={{
              height: 12,
              borderRadius: borderRadius.sm - 2,
              overflow: "hidden",
              backgroundColor: colors.progressBarBackground,
            }}
          >
            <View
              style={{
                height: "100%",
                borderRadius: borderRadius.sm - 2,
                backgroundColor: colors.accent,
                width: `${getLevelProgress()}%`,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 12,
              fontFamily: fonts.body,
              color: colors.text,
              opacity: 0.6,
              textAlign: "center",
            }}
          >
            Progression vers le niveau suivant
          </Text>
        </Card>
      )}

      {/* Achievements Section */}
      {hasAchievementsContent() && (
        <Card variant="outlined" padding="lg" style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <Ionicons name="medal" size={24} color={colors.accent} />
            <Text
              style={{
                fontSize: 18,
                fontFamily: fonts.subheading,
                color: colors.text,
              }}
            >
              Réalisations
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
          >
            {/* Streak Achievement */}
            {user.currentStreak !== undefined && user.currentStreak >= 7 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 20,
                  gap: spacing.xs + 2,
                  backgroundColor: `${colors.accent}20`,
                }}
              >
                <Ionicons name="flame" size={20} color={colors.accent} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    fontFamily: fonts.body,
                    color: colors.text,
                  }}
                >
                  Série de 7 jours
                </Text>
              </View>
            )}
            {user.currentStreak !== undefined && user.currentStreak >= 30 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 20,
                  gap: spacing.xs + 2,
                  backgroundColor: `${colors.accent}20`,
                }}
              >
                <Ionicons name="trophy" size={20} color={colors.accent} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    fontFamily: fonts.body,
                    color: colors.text,
                  }}
                >
                  Maître de la régularité
                </Text>
              </View>
            )}
            {/* Points Achievement */}
            {user.points && user.points >= 1000 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 20,
                  gap: spacing.xs + 2,
                  backgroundColor: `${colors.accent}20`,
                }}
              >
                <Ionicons name="star" size={20} color={colors.accent} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    fontFamily: fonts.body,
                    color: colors.text,
                  }}
                >
                  1000+ points
                </Text>
              </View>
            )}
            {user.points && user.points >= 5000 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 20,
                  gap: spacing.xs + 2,
                  backgroundColor: `${colors.accent}20`,
                }}
              >
                <Ionicons name="diamond" size={20} color={colors.accent} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    fontFamily: fonts.body,
                    color: colors.text,
                  }}
                >
                  Expert investisseur
                </Text>
              </View>
            )}
            {/* Level Achievement */}
            {user.levelId && parseInt(user.levelId, 10) >= 5 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 20,
                  gap: spacing.xs + 2,
                  backgroundColor: `${colors.accent}20`,
                }}
              >
                <Ionicons name="rocket" size={20} color={colors.accent} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    fontFamily: fonts.body,
                    color: colors.text,
                  }}
                >
                  Niveau 5 atteint
                </Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Account Info Card */}
      {hasAccountInfoContent() && (
        <Card variant="outlined" padding="lg" style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              marginBottom: spacing.xs,
            }}
          >
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={colors.text}
            />
            <Text
              style={{
                fontSize: 18,
                fontFamily: fonts.subheading,
                color: colors.text,
              }}
            >
              Informations du compte
            </Text>
          </View>
          {user.username && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: fonts.body,
                  color: colors.text,
                  opacity: 0.7,
                }}
              >
                Nom d'utilisateur
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: fonts.body,
                  color: colors.text,
                }}
              >
                {user.username}
              </Text>
            </View>
          )}
          {user.createdAt && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: fonts.body,
                  color: colors.text,
                  opacity: 0.7,
                }}
              >
                Membre depuis
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: fonts.body,
                  color: colors.text,
                }}
              >
                {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Logout Button */}
      <Button
        title="Se déconnecter"
        variant="danger"
        onPress={handleLogout}
        isLoading={isLoading}
        fullWidth
        leftIcon={
          <Ionicons name="log-out-outline" size={20} color={special.white} />
        }
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}
