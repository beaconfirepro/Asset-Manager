import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useInspectionResult, usePreviousInspection, useStartInspection, useSaveAnswer, useEnqueueDeficiency, useAttachMedia, useSubmitInspection } from "@/hooks/useInspections";
import { useOutboxConflicts, useRetryOutboxItem } from "@/hooks/useSync";
import { useActiveForm } from "@/hooks/useInspectionForms";
import { useInspectionSchedules } from "@/hooks/useInspectionSchedules";
import { useInspectionSeries } from "@/hooks/useInspectionSeries";
import { OfflineSyncIndicator } from "@/components/inspections/OfflineSyncIndicator";
import { QuestionSetRenderer } from "@/components/inspections/QuestionSetRenderer";
import { AiSuggestionPanel } from "@/components/ai/AiSuggestionPanel";
import { CodeReferenceDrawer } from "@/components/ai/CodeReferenceDrawer";
import { Button } from "@/components/ui/Button";
import { FEATURES } from "@/lib/featureFlags";
import { useCreateAiSuggestion } from "@/hooks/useAiSuggestions";
import { getITMApiClient } from "@/lib/api";
import {
  parseFormSchema,
  parseFormData,
  computeProgress,
  type FormField,
} from "@/lib/inspections/formSchema";

export default function InspectionWorkspaceScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id: scheduleId } = useLocalSearchParams<{ id: string }>();
  const { orgId, session } = useAuth();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showCodeRef, setShowCodeRef] = useState(false);

  const { data: allSchedules = [] } = useInspectionSchedules();
  const { data: allSeries = [] } = useInspectionSeries();
  const { data: existingResult, isLoading: resultLoading } = useInspectionResult(scheduleId);

  const schedule = allSchedules.find((s) => s.id === scheduleId);
  const series = allSeries.find((s) => s.id === schedule?.series_id);
  const { data: previousResult } = usePreviousInspection(schedule?.hubspot_asset_id);

  const { data: activeForm, isLoading: formLoading } = useActiveForm(series?.system_type);

  const startInspection = useStartInspection();
  const saveAnswer = useSaveAnswer();
  const attachMedia = useAttachMedia();
  const submitInspection = useSubmitInspection();
  const retryOutboxItem = useRetryOutboxItem();
  const createAiSuggestion = useCreateAiSuggestion();

  const [result, setResult] = useState(existingResult ?? null);

  const { data: outboxConflicts = [] } = useOutboxConflicts(result?.id);

  useEffect(() => {
    if (existingResult && !result) setResult(existingResult);
  }, [existingResult]);

  useEffect(() => {
    if (!scheduleId || !activeForm || !schedule || !session || result) return;
    const inspectorId = session.user?.id ?? "inspector_local";
    startInspection
      .mutateAsync({
        scheduleId,
        formId: activeForm.id,
        hubspotAssetId: schedule.hubspot_asset_id,
        inspectorId,
      })
      .then((r) => {
        if (r) setResult(r);
      });
  }, [scheduleId, activeForm?.id, schedule?.id, session?.user?.id]);

  const schema = useMemo(
    () => (activeForm ? parseFormSchema(activeForm.form_schema) : { fields: [] }),
    [activeForm],
  );

  const formData = useMemo(
    () => parseFormData(result?.form_data ?? "{}"),
    [result?.form_data],
  );

  const reportedDeficiencies = useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(formData)) {
      if (key.startsWith("_def_enqueued_") && formData[key] === true) {
        set.add(key.replace("_def_enqueued_", ""));
      }
    }
    return set;
  }, [formData]);

  const progress = useMemo(() => computeProgress(schema, formData), [schema, formData]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const photoUrls: string[] = useMemo(() => {
    try {
      return JSON.parse(result?.photo_urls ?? "[]") as string[];
    } catch {
      return [];
    }
  }, [result?.photo_urls]);

  const enqueueDeficiency = useEnqueueDeficiency();

  const handleAnswer = useCallback(
    async (field: FormField, answer: string | boolean | string[] | null) => {
      if (!result) return;
      await saveAnswer.mutateAsync({
        resultId: result.id,
        field,
        answer,
        hubspotAssetId: result.hubspot_asset_id,
      });
      setResult((prev) =>
        prev
          ? {
              ...prev,
              form_data: JSON.stringify({ ...parseFormData(prev.form_data), [field.id]: answer }),
            }
          : prev,
      );
    },
    [result, saveAnswer],
  );

  const handleDeficiencyReport = useCallback(
    async (field: FormField, description: string, severity: string) => {
      if (!result) return;
      await enqueueDeficiency.mutateAsync({
        resultId: result.id,
        field,
        answer: formData[field.id] as string,
        hubspotAssetId: result.hubspot_asset_id,
        description,
        severity,
      });
    },
    [result, formData, enqueueDeficiency],
  );

  const handleAddPhoto = useCallback(
    async (uri: string) => {
      if (!result) return;
      await attachMedia.mutateAsync({
        resultId: result.id,
        scheduleId: scheduleId!,
        type: "photo",
        photoUrl: uri,
        currentPhotoUrls: result.photo_urls,
      });
      setResult((prev) =>
        prev
          ? {
              ...prev,
              photo_urls: JSON.stringify([...photoUrls, uri]),
            }
          : prev,
      );
      if (FEATURES.AI_CODE_INTELLIGENCE && orgId) {
        try {
          const api = getITMApiClient();
          const analysis = await api.analyzePhoto(orgId, uri, result.id);
          if (analysis.detected_issues.length > 0) {
            await createAiSuggestion.mutateAsync({
              suggestion_type: "PHOTO_DEFICIENCY",
              payload: {
                detected_issues: analysis.detected_issues,
                confidence: analysis.confidence,
                suggestion_text: analysis.suggestion_text,
                photo_url: uri,
              },
              context_type: "inspection_result",
              context_id: result.id,
              model_version: "vision-v1",
            });
          }
        } catch {
          // AI analysis is best-effort; photo attach already succeeded
        }
      }
    },
    [result, scheduleId, photoUrls, attachMedia, orgId, createAiSuggestion],
  );

  const handleRemovePhoto = useCallback(
    async (uri: string) => {
      if (!result) return;
      const updated = photoUrls.filter((u) => u !== uri);
      await attachMedia.mutateAsync({
        resultId: result.id,
        scheduleId: scheduleId!,
        type: "photo_remove",
        replacePhotoUrls: updated,
      });
      setResult((prev) => prev ? { ...prev, photo_urls: JSON.stringify(updated) } : prev);
    },
    [result, scheduleId, photoUrls, attachMedia],
  );

  const handleSaveSignature = useCallback(
    async (dataUri: string) => {
      if (!result) return;
      await attachMedia.mutateAsync({
        resultId: result.id,
        scheduleId: scheduleId!,
        type: "signature",
        signatureUrl: dataUri,
      });
      setResult((prev) => prev ? { ...prev, signature_url: dataUri } : prev);
    },
    [result, scheduleId, attachMedia],
  );

  const captureGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission is required to capture GPS coordinates.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (result) {
        await attachMedia.mutateAsync({
          resultId: result.id,
          scheduleId: scheduleId!,
          type: "gps",
          gpsLat: loc.coords.latitude,
          gpsLng: loc.coords.longitude,
        });
        setResult((prev) =>
          prev
            ? { ...prev, gps_lat: loc.coords.latitude, gps_lng: loc.coords.longitude }
            : prev,
        );
      }
    } catch {
      Alert.alert("Error", "Could not capture GPS location.");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!result) return;
    Alert.alert(
      "Submit Inspection",
      "This will send the inspection for QA review. You won't be able to edit answers after submitting.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            await submitInspection.mutateAsync({
              resultId: result.id,
              scheduleId: scheduleId!,
              clientUuid: result.client_uuid,
            });
            Alert.alert("Submitted", "Inspection submitted for QA review.", [
              { text: "OK", onPress: () => router.back() },
            ]);
          },
        },
      ],
    );
  };

  const isLoading = resultLoading || formLoading || startInspection.isPending;
  const isSubmitted = result?.status === "QA_REVIEW" || result?.status === "APPROVED";

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading workspace…</Text>
      </View>
    );
  }

  if (!activeForm) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.warning} />
        <Text style={[styles.loadingText, { color: colors.foreground }]}>No active form</Text>
        <Text style={[styles.subText, { color: colors.mutedForeground }]}>
          No active inspection form found for this system type ({series?.system_type ?? "unknown"}).
          Please ask an admin to activate a form.
        </Text>
        <Button label="Go Back" variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.workspaceHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {schema.title ?? activeForm.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {schedule?.scheduled_date ?? ""} · {series?.system_type?.replace(/_/g, " ") ?? ""}
          </Text>
        </View>

        {FEATURES.AI_CODE_INTELLIGENCE && (
          <Pressable
            onPress={() => setShowAiPanel((v) => !v)}
            style={[
              styles.aiHeaderBtn,
              showAiPanel && { backgroundColor: colors.primary + "22" },
            ]}
            hitSlop={8}
          >
            <Feather
              name="cpu"
              size={18}
              color={showAiPanel ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
        )}
        <OfflineSyncIndicator compact />
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: progress === 1 ? colors.success : colors.primary,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            },
          ]}
        />
      </View>

      <Text style={[styles.progressLabel, { color: colors.mutedForeground, alignSelf: "flex-end", marginRight: 16 }]}>
        {Math.round(progress * 100)}% complete
      </Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contextBar}>
            <OfflineSyncIndicator />
          </View>

          <View style={[styles.contextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.contextLabel, { color: colors.mutedForeground }]}>Asset</Text>
            <Text style={[styles.contextValue, { color: colors.foreground }]}>{result?.hubspot_asset_id ?? schedule?.hubspot_asset_id ?? "—"}</Text>

            {previousResult && (
              <View style={[styles.historyRow, { backgroundColor: colors.info + "11", borderColor: colors.info + "33" }]}>
                <Feather name="clock" size={11} color={colors.info} />
                <Text style={[styles.historyText, { color: colors.info }]}>
                  Last inspection: {previousResult.submitted_at?.slice(0, 10) ?? previousResult.created_at?.slice(0, 10) ?? "unknown date"} · {previousResult.status}
                </Text>
              </View>
            )}

            <View style={styles.gpsRow}>
              {result?.gps_lat ? (
                <Text style={[styles.gpsText, { color: colors.success }]}>
                  GPS: {result.gps_lat.toFixed(5)}, {result.gps_lng?.toFixed(5)}
                </Text>
              ) : (
                <Pressable onPress={captureGps} disabled={gpsLoading || isSubmitted}>
                  <Text style={[styles.gpsCapture, { color: colors.primary }]}>
                    {gpsLoading ? "Getting location…" : "📍 Capture GPS"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <QuestionSetRenderer
            schema={schema}
            formData={formData}
            photoUrls={photoUrls}
            signatureUrl={result?.signature_url ?? null}
            onAnswer={handleAnswer}
            onDeficiencyReport={handleDeficiencyReport}
            onAddPhoto={handleAddPhoto}
            onRemovePhoto={handleRemovePhoto}
            onSaveSignature={handleSaveSignature}
            reportedDeficiencies={reportedDeficiencies}
            disabled={isSubmitted}
          />

          {FEATURES.AI_CODE_INTELLIGENCE && showAiPanel && result && (
            <View style={[styles.aiPanelSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.aiPanelHeader}>
                <Feather name="cpu" size={14} color={colors.primary} />
                <Text style={[styles.aiPanelTitle, { color: colors.foreground }]}>AI Assist</Text>
                <Pressable onPress={() => setShowCodeRef(true)} hitSlop={8} style={styles.codeRefBtn}>
                  <Feather name="book-open" size={13} color={colors.primary} />
                  <Text style={[styles.codeRefLink, { color: colors.primary }]}>Code Refs</Text>
                </Pressable>
              </View>
              <AiSuggestionPanel
                contextType="inspection_result"
                contextId={result.id}
                showTitle={false}
              />
            </View>
          )}

          {outboxConflicts.length > 0 && (
            <View style={[styles.conflictSection, { borderColor: colors.warning + "55" }]}>
              <View style={styles.conflictHeader}>
                <Feather name="wifi-off" size={14} color={colors.warning} />
                <Text style={[styles.conflictTitle, { color: colors.warning }]}>
                  {outboxConflicts.length} sync item{outboxConflicts.length > 1 ? "s" : ""} failed to upload
                </Text>
              </View>
              {outboxConflicts.map((item) => (
                <View key={item.id} style={[styles.conflictCard, { backgroundColor: colors.warning + "11", borderColor: colors.warning + "33" }]}>
                  <Text style={[styles.conflictItemType, { color: colors.foreground }]}>
                    {item.entity_type.replace(/_/g, " ")} · {item.operation}
                  </Text>
                  {item.error && (
                    <Text style={[styles.conflictError, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {item.error}
                    </Text>
                  )}
                  <Text style={[styles.conflictAttempts, { color: colors.mutedForeground }]}>
                    Attempts: {item.attempts} · Status: {item.status}
                  </Text>
                  <Button
                    label={retryOutboxItem.isPending ? "Retrying…" : "Retry Upload"}
                    size="sm"
                    variant="outline"
                    onPress={() => retryOutboxItem.mutate({ outboxItemId: item.id, entityId: item.entity_id })}
                    disabled={retryOutboxItem.isPending}
                    style={{ marginTop: 4 }}
                  />
                </View>
              ))}
            </View>
          )}

          {isSubmitted ? (
            <View style={[styles.submittedBanner, { backgroundColor: colors.success + "22", borderColor: colors.success + "44" }]}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.submittedText, { color: colors.success }]}>
                Inspection submitted — pending QA review.
              </Text>
            </View>
          ) : (
            <Button
              label={submitInspection.isPending ? "Submitting…" : "Submit for QA Review"}
              onPress={handleSubmit}
              disabled={submitInspection.isPending || progress < 0.5}
              style={styles.submitBtn}
            />
          )}

          {!isSubmitted && progress < 0.5 && (
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Complete at least 50% of required fields to submit.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {FEATURES.AI_CODE_INTELLIGENCE && (
        <CodeReferenceDrawer visible={showCodeRef} onClose={() => setShowCodeRef(false)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  loadingText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" },
  subText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  workspaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 2 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  progressBar: { height: 4, width: "100%" },
  progressFill: { height: 4 },
  progressLabel: { fontSize: 11, fontFamily: "Inter_500Medium", paddingTop: 2, paddingBottom: 4 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 48 },
  contextBar: { marginBottom: 4 },
  contextCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  contextLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  contextValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 6, borderRadius: 6, borderWidth: 1, marginTop: 2 },
  historyText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  gpsRow: { marginTop: 4 },
  gpsText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  gpsCapture: { fontSize: 12, fontFamily: "Inter_500Medium" },
  submittedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  submittedText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  submitBtn: { marginTop: 12 },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  conflictSection: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  conflictHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  conflictTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  conflictCard: { borderRadius: 8, borderWidth: 1, padding: 10, gap: 4 },
  conflictItemType: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  conflictError: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  conflictAttempts: { fontSize: 11, fontFamily: "Inter_400Regular" },
  aiHeaderBtn: { padding: 6, borderRadius: 8 },
  aiPanelSection: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  aiPanelHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiPanelTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  codeRefBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  codeRefLink: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
