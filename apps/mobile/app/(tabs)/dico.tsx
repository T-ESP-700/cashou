import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useHeaderOptions } from '@/hooks/use-header';

// Dictionary entry type (matches API response)
interface DicoEntry {
  id: number;
  term: string;
  definition: string;
  createdAt: Date;
  updatedAt: Date;
}

// Group entries by first letter
const groupByLetter = (entries: DicoEntry[]): Record<string, DicoEntry[]> => {
  return entries.reduce((acc, entry) => {
    const firstLetter = entry.term[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(entry);
    return acc;
  }, {} as Record<string, DicoEntry[]>);
};

export default function DicoScreen() {
  const { colors: theme, isDark } = useCashouTheme();
  const insets = useSafeAreaInsets();

  // Configure header for this screen (no back button for main tab screens)
  useHeaderOptions({ showBackButton: false, title: 'Dico' });

  // Bottom sheet ref
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // State for data fetching
  const [entries, setEntries] = useState<DicoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DicoEntry | null>(null);

  // Fetch all entries from API
  const fetchEntries = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await trpcClient.dicoEntry.getAll.query();
      setEntries(data as DicoEntry[]);
    } catch (err) {
      console.error('Error fetching dico entries:', err);
      setError('Impossible de charger le dictionnaire. Vérifie ta connexion.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Don't show loading indicator on focus refresh
      fetchEntries(true);
    }, [fetchEntries])
  );

  // Handle pull to refresh
  const handleRefresh = useCallback(() => {
    fetchEntries(true);
  }, [fetchEntries]);

  // Filter entries based on search query (local filtering for responsiveness)
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries;
    }
    const query = searchQuery.toLowerCase().trim();
    return entries.filter(
      (entry) =>
        entry.term.toLowerCase().includes(query) ||
        entry.definition.toLowerCase().includes(query)
    );
  }, [searchQuery, entries]);

  // Group filtered entries by letter
  const groupedEntries = useMemo(() => {
    return groupByLetter(filteredEntries);
  }, [filteredEntries]);

  // Sort letters alphabetically
  const sortedLetters = useMemo(() => {
    return Object.keys(groupedEntries).sort();
  }, [groupedEntries]);

  // Handle entry press - open bottom sheet
  const handleEntryPress = useCallback((entry: DicoEntry) => {
    setSelectedEntry(entry);
    bottomSheetRef.current?.present();
  }, []);

  // Handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      // Sheet is closed, clear selection after a small delay
      setTimeout(() => setSelectedEntry(null), 100);
    }
  }, []);

  // Render backdrop
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Loading state
  if (isLoading && entries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text
            style={[
              styles.loadingText,
              { color: theme.text, fontFamily: CashouTheme.fonts.body },
            ]}
          >
            Chargement du dictionnaire...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && entries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons
            name="cloud-offline-outline"
            size={64}
            color={theme.iconMuted}
          />
          <Text
            style={[
              styles.errorText,
              { color: theme.text, fontFamily: CashouTheme.fonts.body },
            ]}
          >
            {error}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.accent }]}
            onPress={() => fetchEntries()}
          >
            <Text
              style={[
                styles.retryButtonText,
                { fontFamily: CashouTheme.fonts.body },
              ]}
            >
              Réessayer
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          {/* <Text
            style={[
              styles.title,
              { color: theme.text, fontFamily: CashouTheme.fonts.heading },
            ]}
          >
            Dico
          </Text> */}

          {/* Search Bar */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark ? theme.card : theme.secondary,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.iconMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: theme.text,
                  fontFamily: CashouTheme.fonts.body,
                },
              ]}
              placeholder="Rechercher un terme..."
              placeholderTextColor={theme.iconMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.iconMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Dictionary List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.accent}
                colors={[theme.accent]}
              />
            }
          >
            {entries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="book-outline"
                  size={64}
                  color={theme.iconMuted}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.text, fontFamily: CashouTheme.fonts.body },
                  ]}
                >
                  Le dictionnaire est vide.
                </Text>
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: theme.text, fontFamily: CashouTheme.fonts.body },
                  ]}
                >
                  Tire vers le bas pour rafraîchir.
                </Text>
              </View>
            ) : sortedLetters.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={theme.iconMuted}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.text, fontFamily: CashouTheme.fonts.body },
                  ]}
                >
                  Aucun résultat pour "{searchQuery}"
                </Text>
              </View>
            ) : (
              sortedLetters.map((letter) => (
                <View key={letter} style={styles.letterSection}>
                  {/* Letter Header */}
                  <Text
                    style={[
                      styles.letterHeader,
                      { color: theme.text, fontFamily: CashouTheme.fonts.subheading },
                    ]}
                  >
                    {letter}
                  </Text>

                  {/* Entries for this letter */}
                  {groupedEntries[letter].map((entry) => (
                    <TouchableOpacity
                      key={entry.id}
                      style={[
                        styles.entryCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => handleEntryPress(entry)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.entryTerm,
                          { color: theme.text, fontFamily: CashouTheme.fonts.body },
                        ]}
                      >
                        {entry.term}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>

      </View>

      {/* Bottom Sheet for Definition - Dynamic sizing (rendered via portal above tab bar) */}
      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing
        onChange={handleSheetChanges}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        maxDynamicContentSize={600}
        backgroundStyle={{
          backgroundColor: theme.background,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.borderLight,
          width: 40,
        }}
      >
        <BottomSheetView
          style={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {selectedEntry && (
            <>
              {/* Term Title */}
              <Text
                style={[
                  styles.sheetTitle,
                  { color: theme.text, fontFamily: CashouTheme.fonts.heading },
                ]}
              >
                {selectedEntry.term}
              </Text>

              {/* Definition Card */}
              <View
                style={[
                  styles.definitionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.definitionText,
                    { color: theme.text, fontFamily: CashouTheme.fonts.body },
                  ]}
                >
                  {selectedEntry.definition}
                </Text>
              </View>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    marginBottom: 16,
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CashouTheme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  letterSection: {
    marginBottom: 16,
  },
  letterHeader: {
    fontSize: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  entryCard: {
    borderRadius: CashouTheme.borderRadius.md,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  entryTerm: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.5,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: CashouTheme.borderRadius.md,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Bottom Sheet styles
  sheetContent: {
    paddingHorizontal: 20,
  },
  sheetTitle: {
    fontSize: 24,
    marginBottom: 16,
  },
  definitionCard: {
    borderRadius: CashouTheme.borderRadius.md,
    borderWidth: 1,
    padding: 16,
  },
  definitionText: {
    fontSize: 15,
    lineHeight: 24,
  },
});
