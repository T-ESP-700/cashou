import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    useColorScheme as useRNColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useCashouTheme } from "@/hooks/use-cashou-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderOptions } from "@/hooks/use-header";
import { CashouTheme } from "@/constants/cashou-theme";
import { trpcClient } from "@/lib/trpc";
import { Card } from "@/components/ui";

interface UserLevelEntry {
    level: { id: number; number: number | null; title: string | null };
    stars: number;
    unlocked: boolean;
}

export default function LevelsScreen() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const { colors, special, fonts, spacing, borderRadius } = useCashouTheme();
    const insets = useSafeAreaInsets();
    const colorScheme = useRNColorScheme();
    const isDark = colorScheme === "dark";
    const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

    const [userLevels, setUserLevels] = useState<UserLevelEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const handleBackPress = useCallback(() => {
        router.replace("/(tabs)/profile");
    }, [router]);

    useHeaderOptions({ showBackButton: true, onBackPress: handleBackPress });

    useEffect(() => {
        if (!user?.id) {
            setUserLevels([]);
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        trpcClient.level.getUserLevels
            .query({ userId: user.id })
            .then((data: any) => {
                if (!cancelled) {
                    setUserLevels((data as UserLevelEntry[]) ?? []);
                }
            })
            .catch(() => {
                if (!cancelled) setUserLevels([]);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    if (authLoading || !user) {
        return (
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.background },
                ]}
            >
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.background },
                ]}
            >
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={[styles.loadingText, { color: theme.text }]}>
                        Chargement des niveaux...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 24 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.screenTitle, { color: theme.text }]}>
                    Ma progression
                </Text>
                <Text style={[styles.screenSubtitle, { color: theme.text }]}>
                    {userLevels.reduce((sum, l) => sum + l.stars, 0)} /{" "}
                    {userLevels.length * 3} étoiles
                </Text>

                {userLevels.map((entry) => (
                    <Card
                        key={entry.level.id}
                        variant="outlined"
                        padding="md"
                        style={[
                            styles.levelCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <View style={styles.levelRow}>
                            <View style={styles.levelLeft}>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.levelNumber,
                                            { color: theme.text },
                                        ]}
                                    >
                                        Niveau{" "}
                                        {entry.level.number ?? entry.level.id}
                                    </Text>
                                    {!entry.unlocked && (
                                        <Ionicons
                                            name="lock-closed"
                                            size={18}
                                            color={
                                                colors.iconMuted ?? "#9CA3AF"
                                            }
                                        />
                                    )}
                                </View>
                                {entry.level.title && (
                                    <Text
                                        style={[
                                            styles.levelTitle,
                                            { color: theme.text, opacity: 0.9 },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {entry.level.title}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.starsRow}>
                                {[1, 2, 3].map((i) => (
                                    <Ionicons
                                        key={i}
                                        name={
                                            i <= entry.stars
                                                ? "star"
                                                : "star-outline"
                                        }
                                        size={22}
                                        color={
                                            i <= entry.stars
                                                ? special.gold
                                                : (colors.iconMuted ??
                                                  "#9CA3AF")
                                        }
                                    />
                                ))}
                            </View>
                        </View>
                    </Card>
                ))}

                {userLevels.length === 0 && (
                    <View style={styles.empty}>
                        <Text style={[styles.emptyText, { color: theme.text }]}>
                            Aucun niveau pour le moment.
                        </Text>
                    </View>
                )}
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
    scrollContent: {
        padding: 16,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        opacity: 0.8,
    },
    screenTitle: {
        fontSize: 24,
        fontFamily: "Roboto-Bold",
        marginBottom: 4,
    },
    screenSubtitle: {
        fontSize: 16,
        opacity: 0.8,
        marginBottom: 20,
    },
    levelCard: {
        marginBottom: 12,
        borderWidth: 2,
        borderRadius: 16,
    },
    levelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    levelLeft: {
        flex: 1,
        gap: 2,
    },
    levelNumber: {
        fontSize: 18,
        fontFamily: "Roboto-Bold",
    },
    levelTitle: {
        fontSize: 14,
        fontFamily: "Roboto",
    },
    starsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    empty: {
        paddingVertical: 32,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        opacity: 0.7,
    },
});
