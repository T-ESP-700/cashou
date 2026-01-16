import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { Card, Button } from '@/components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LevelInfoData {
  id: number;
  title: string | null;
  number: number | null;
  description: string | null;
  duration: number | null;
  speed: number | null;
  startBalance: number | null;
}

interface GoalData {
  id: number;
  title: string | null;
  description: string | null;
}

interface LevelInfoModalProps {
  visible: boolean;
  onClose: () => void;
  level: LevelInfoData | null;
  goals: GoalData[];
}

export function LevelInfoModal({ visible, onClose, level, goals }: LevelInfoModalProps) {
  const { colors, fonts, spacing, isDark } = useCashouTheme();
  const [currentPage, setCurrentPage] = useState(0);

  // Reset to first page when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentPage(0);
    }
  }, [visible]);

  if (!level) {
    return null;
  }

  // Default goals if none are provided
  const displayGoals = goals.length > 0
    ? goals
    : [
        { id: 1, title: 'Objectif principal', description: 'Complétez le niveau avec succès' },
        { id: 2, title: 'Bonus', description: 'Atteignez les objectifs secondaires' }
      ];

  const handleNext = () => {
    setCurrentPage(1);
  };

  const handlePrevious = () => {
    setCurrentPage(0);
  };

  const formatSpeed = (speed: number | null): string => {
    if (!speed) return '1x';
    return `${speed}x`;
  };

  const formatDuration = (duration: number | null): string => {
    if (!duration) return '30 jours';
    return `${duration} jours`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Card
            variant="elevated"
            padding="lg"
            style={{
              width: SCREEN_WIDTH - 48,
              maxWidth: 400,
              maxHeight: '80%',
            }}
          >
            {currentPage === 0 ? (
              // Page 0: Description
              <>
                {/* Header Icon */}
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: `${colors.accent}20`,
                    marginBottom: spacing.md,
                    alignSelf: 'center',
                  }}
                >
                  <Ionicons name="information-circle" size={36} color={colors.accent} />
                </View>

                {/* Title */}
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: fonts.heading,
                    color: colors.text,
                    textAlign: 'center',
                    marginBottom: spacing.xs,
                  }}
                >
                  Niveau {level.number}
                </Text>

                {/* Subtitle */}
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: fonts.subheading,
                    color: colors.text,
                    textAlign: 'center',
                    marginBottom: spacing.md,
                    opacity: 0.9,
                  }}
                >
                  {level.title || 'Sans titre'}
                </Text>

                {/* Description */}
                <ScrollView style={{ maxHeight: 150, marginBottom: spacing.md }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: fonts.body,
                      color: colors.text,
                      textAlign: 'center',
                      lineHeight: 22,
                      opacity: 0.85,
                    }}
                  >
                    {level.description || 'Aucune description disponible pour ce niveau.'}
                  </Text>
                </ScrollView>

                {/* Info Cards */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.secondary,
                      borderRadius: 12,
                      padding: spacing.sm,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: fonts.body, color: colors.text, opacity: 0.7 }}>
                      Durée
                    </Text>
                    <Text style={{ fontSize: 16, fontFamily: fonts.subheading, color: colors.text, marginTop: 4 }}>
                      {formatDuration(level.duration)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.secondary,
                      borderRadius: 12,
                      padding: spacing.sm,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: fonts.body, color: colors.text, opacity: 0.7 }}>
                      Vitesse
                    </Text>
                    <Text style={{ fontSize: 16, fontFamily: fonts.subheading, color: colors.text, marginTop: 4 }}>
                      {formatSpeed(level.speed)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.secondary,
                      borderRadius: 12,
                      padding: spacing.sm,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: fonts.body, color: colors.text, opacity: 0.7 }}>
                      Capital
                    </Text>
                    <Text style={{ fontSize: 16, fontFamily: fonts.subheading, color: colors.text, marginTop: 4 }}>
                      {level.startBalance ?? 1000}€
                    </Text>
                  </View>
                </View>

                {/* Page Indicator */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.md }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.accent,
                    }}
                  />
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.border,
                    }}
                  />
                </View>

                {/* Button */}
                <Button
                  title="Suivant"
                  variant="primary"
                  onPress={handleNext}
                  fullWidth
                />
              </>
            ) : (
              // Page 1: Goals
              <>
                {/* Header Icon */}
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: `${colors.accent}20`,
                    marginBottom: spacing.md,
                    alignSelf: 'center',
                  }}
                >
                  <Ionicons name="flag" size={36} color={colors.accent} />
                </View>

                {/* Title */}
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: fonts.heading,
                    color: colors.text,
                    textAlign: 'center',
                    marginBottom: spacing.md,
                  }}
                >
                  Objectifs
                </Text>

                {/* Goals List */}
                <ScrollView style={{ maxHeight: 250, marginBottom: spacing.md }}>
                  {displayGoals.map((goal, index) => (
                    <View
                      key={goal.id}
                      style={{
                        backgroundColor: colors.secondary,
                        borderRadius: 12,
                        padding: spacing.md,
                        marginBottom: index < displayGoals.length - 1 ? spacing.sm : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: fonts.body,
                          color: colors.text,
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        {goal.title || `Objectif ${index + 1}`}
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontFamily: fonts.subheading,
                          color: colors.text,
                        }}
                      >
                        {goal.description || 'À accomplir'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Page Indicator */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.md }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.border,
                    }}
                  />
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.accent,
                    }}
                  />
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', width: '100%', gap: spacing.sm + 4 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Précédent"
                      variant="outline"
                      onPress={handlePrevious}
                      fullWidth
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Fermer"
                      variant="primary"
                      onPress={onClose}
                      fullWidth
                    />
                  </View>
                </View>
              </>
            )}
          </Card>
        </View>
      </BlurView>
    </Modal>
  );
}
