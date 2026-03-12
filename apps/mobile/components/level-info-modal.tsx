import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { ActionPillButton } from '@/components/ui';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

const OVERLAY_PH = 18;
const BACKDROP_PADDING = 6;
const BACKDROP_MAX_WIDTH = 410;
const BACKDROP_RATIO = 0.97;
const TOTAL_PAGES = 2;

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
  isMandatory?: boolean;
}

interface LevelInfoModalProps {
  visible: boolean;
  onClose: () => void;
  level: LevelInfoData | null;
  goals: GoalData[];
  fromCurrentScreen?: boolean;
}

export function LevelInfoModal({ visible, onClose, level, goals, fromCurrentScreen = false }: LevelInfoModalProps) {
  const { colors, isDark } = useCashouTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const backdropWidth = Math.min((screenWidth - OVERLAY_PH * 2) * BACKDROP_RATIO, BACKDROP_MAX_WIDTH);
  const pageWidth = backdropWidth - BACKDROP_PADDING * 2;

  // Height animation
  const pageHeights = useRef<number[]>([0, 0]);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const [measured, setMeasured] = useState(false);

  const animateToPage = useCallback((page: number) => {
    const targetHeight = pageHeights.current[page];
    if (targetHeight > 0) {
      Animated.spring(animatedHeight, {
        toValue: targetHeight,
        useNativeDriver: false,
        tension: 65,
        friction: 12,
      }).start();
    }
  }, [animatedHeight]);

  const handlePageLayout = useCallback((pageIndex: number, height: number) => {
    if (height <= 0) return;
    pageHeights.current[pageIndex] = height;
    // Once page 0 is measured, set height instantly and enable animated mode
    if (pageIndex === 0 && !measured) {
      animatedHeight.setValue(height);
      setMeasured(true);
    }
  }, [animatedHeight, measured]);

  // Reset to first page when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      setMeasured(false);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  if (!level) {
    return null;
  }

  // Default goals if none are provided
  const displayGoals = goals.length > 0
    ? goals
    : [
        { id: 1, title: 'Objectif principal', description: 'Complétez le niveau avec succès', isMandatory: true },
        { id: 2, title: 'Bonus', description: 'Atteignez les objectifs secondaires', isMandatory: false }
      ];

  const formatDuration = (duration: number | null): string => {
    if (!duration) return '30 jours';
    return `${duration} jours`;
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (page !== currentPage) {
      setCurrentPage(page);
      animateToPage(page);
    }
  };

  const isLastPage = currentPage === TOTAL_PAGES - 1;

  const handleButtonPress = () => {
    if (!isLastPage) {
      // Go to next slide
      const nextPage = currentPage + 1;
      scrollRef.current?.scrollTo({ x: nextPage * pageWidth, animated: true });
      setCurrentPage(nextPage);
      animateToPage(nextPage);
    } else {
      onClose();
    }
  };

  const buttonLabel = isLastPage
    ? (fromCurrentScreen ? 'Fermer' : 'Accéder au niveau')
    : 'Suivant';

  const buttonIcon = isLastPage
    ? (fromCurrentScreen
      ? <Ionicons name="close" size={17} color={colors.text} />
      : <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474L8.59662 21.6145C6.53435 22.736 4 21.2763 4 18.9671L4 5.0329C4 2.72368 6.53435 1.26402 8.59661 2.38548L21.4086 9.35258Z"
            fill={colors.text}
          />
        </Svg>
    )
    : <Ionicons name="chevron-forward" size={17} color={colors.text} />;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <BlurView
        intensity={60}
        tint={isDark ? 'dark' : 'light'}
        style={styles.levelInfoBlur}
      >
        <Pressable style={styles.levelInfoOverlay} onPress={onClose}>
          <View
            onStartShouldSetResponder={() => true}
            style={[styles.levelInfoCardBackdrop, { backgroundColor: colors.secondary }]}
          >
              <View style={[styles.levelInfoCard, { backgroundColor: colors.card, shadowColor: colors.border }]}>
                <Animated.View style={measured ? { height: animatedHeight, overflow: 'hidden' } : undefined}>
                  <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    style={styles.levelInfoScrollView}
                    contentContainerStyle={{ alignItems: 'flex-start' }}
                  >
                    {/* Page 0: Description */}
                    <View
                      style={[styles.levelInfoPage, { width: pageWidth }]}
                      onLayout={(e) => handlePageLayout(0, e.nativeEvent.layout.height)}
                    >
                      {/* Title */}
                      <Text style={[styles.levelInfoTitle, { color: colors.text }]}>
                        Niveau {level.number}
                      </Text>

                      {/* Subtitle */}
                      <Text style={[styles.levelInfoSubtitle, { color: colors.text }]}>
                        {level.title || 'Sans titre'}
                      </Text>

                      {/* Description */}
                      <Text style={[styles.levelInfoDescription, { color: colors.text }]}>
                        {level.description || 'Aucune description disponible pour ce niveau.'}
                      </Text>

                      {/* Info Cards */}
                      <View style={styles.levelInfoCardsRow}>
                        <View style={[styles.levelInfoInfoCard, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.levelInfoInfoLabel, { color: colors.text }]}>Durée</Text>
                          <Text style={[styles.levelInfoInfoValue, { color: colors.text }]}>
                            {formatDuration(level.duration)}
                          </Text>
                        </View>
                        <View style={[styles.levelInfoInfoCard, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.levelInfoInfoLabel, { color: colors.text }]}>Capital</Text>
                          <Text style={[styles.levelInfoInfoValue, { color: colors.text }]}>
                            {level.startBalance ?? 1000}€
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Page 1: Goals */}
                    <View
                      style={[styles.levelInfoPage, { width: pageWidth }]}
                      onLayout={(e) => handlePageLayout(1, e.nativeEvent.layout.height)}
                    >
                      {/* Title */}
                      <Text style={[styles.levelInfoTitle, { color: colors.text }]}>
                        Objectifs
                      </Text>

                      {/* Goals List */}
                      {displayGoals.map((goal, index) => {
                        const isMandatory = goal.isMandatory !== false;
                        return (
                          <View
                            key={goal.id}
                            style={[
                              styles.levelInfoGoalCard,
                              { backgroundColor: colors.secondary },
                              index < displayGoals.length - 1 && { marginBottom: 8 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.levelInfoGoalBadge,
                                { color: colors.text },
                                isMandatory && { color: colors.accent },
                              ]}
                            >
                              {isMandatory ? 'Objectif principal' : 'Bonus'}
                            </Text>
                            <Text style={[styles.levelInfoGoalTitle, { color: colors.text }]}>
                              {goal.title || `Objectif ${index + 1}`}
                            </Text>
                            <Text style={[styles.levelInfoGoalDescription, { color: colors.text }]}>
                              {goal.description || 'À accomplir'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </Animated.View>

                {/* Page Indicator */}
                <View style={styles.levelInfoDots}>
                  <View style={[styles.levelInfoDot, { backgroundColor: colors.progressBarBackground }, currentPage === 0 && { backgroundColor: colors.accent }]} />
                  <View style={[styles.levelInfoDot, { backgroundColor: colors.progressBarBackground }, currentPage === 1 && { backgroundColor: colors.accent }]} />
                </View>

                {/* Button */}
                <View style={styles.levelInfoActions}>
                  <ActionPillButton
                    label={buttonLabel}
                    customIcon={buttonIcon}
                    onPress={handleButtonPress}
                    // style={{ flex: 0, maxWidth: undefined, paddingHorizontal: 10 }}
                  />
                </View>
              </View>
            </View>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  levelInfoBlur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  levelInfoOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  levelInfoCardBackdrop: {
    width: '97%',
    maxWidth: 410,
    borderRadius: 36,
    padding: 6,
  },
  levelInfoCard: {
    width: '100%',
    borderRadius: 30,
    paddingTop: 24,
    paddingBottom: 20,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: 'hidden',
  },
  levelInfoScrollView: {
    flexGrow: 0,
  },
  levelInfoPage: {
    paddingHorizontal: 18,
  },
  levelInfoTitle: {
    fontSize: 28,
    fontFamily: 'Anybody',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  levelInfoSubtitle: {
    fontSize: 18,
    fontFamily: 'Anybody',
    textAlign: 'center',
    marginBottom: 12,
  },
  levelInfoDescription: {
    fontSize: 13,
    fontFamily: 'Anybody',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  levelInfoCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelInfoInfoCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  levelInfoInfoLabel: {
    fontSize: 12,
    fontFamily: 'Anybody',
    opacity: 0.7,
  },
  levelInfoInfoValue: {
    fontSize: 16,
    fontFamily: 'Anybody',
    fontWeight: '600',
    marginTop: 4,
  },
  levelInfoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
    paddingHorizontal: 18,
  },
  levelInfoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelInfoGoalCard: {
    borderRadius: 12,
    padding: 14,
  },
  levelInfoGoalBadge: {
    fontSize: 16,
    fontFamily: 'Anybody',
    fontWeight: '600',
    marginBottom: 4,
  },
  levelInfoGoalTitle: {
    fontSize: 14,
    fontFamily: 'Anybody',
    marginBottom: 4,
  },
  levelInfoGoalDescription: {
    fontSize: 13,
    fontFamily: 'Anybody',
    opacity: 0.7,
  },
  levelInfoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
});
