import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useInspectionContracts, useUpdateContract, useDeleteContract } from "@/hooks/useInspectionContracts";
import { useInspectionSchedules, useRescheduleVisit } from "@/hooks/useInspectionSchedules";
import { useAssets } from "@/hooks/useAssets";
import { InspectionContractFormModal } from "@/components/contracts/InspectionContractFormModal";
import { RescheduleModal } from "@/components/contracts/RescheduleModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { SystemTypeBadge } from "@/components/assets/SystemTypeBadge";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import type { InspectionSchedule, InspectionContract } from "@/db/schema";

function freqLabel(days: number) {
  if (days === 30) return "Monthly";
  if (days === 90) return "Quarterly";
  if (days === 180) return "Semi-Annual";
  if (days === 365) return "Annual";
  return `Every ${days} days`;
}

function ScheduleRow({
  schedule,
  onReschedule,
  onStartInspection,
}: {
  schedule: InspectionSchedule;
  onReschedule: (s: InspectionSchedule) => void;
  onStartInspection: (scheduleId: string) => void;
}) {
  const colors = useColors();
  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const d = schedule.scheduled_date.slice(0, 10);

  const statusColor =
    schedule.status === "CANCELLED"
      ? colors.mutedForeground
      : d < today
      ? colors.destructive
      : d <= in14
      ? colors.warning
      : colors.info;

  const statusLabel =
    schedule.status === "CANCELLED"
      ? "Cancelled"
      : d < today
      ? "Overdue"
      : d <= in14
      ? "Due soon"
      : "On track";

  return (
    <View style={[styles.scheduleRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={styles.scheduleBody}>
        <Text style={[styles.scheduleDate, { color: colors.foreground }]}>{d}</Text>
        {schedule.rescheduled_from && (
          <Text style={[styles.scheduleFrom, { color: colors.mutedForeground }]}>
            Rescheduled from {schedule.rescheduled_from}
          </Text>
        )}
        {schedule.hubspot_inspection_ticket_id && (
          <Text style={[styles.scheduleTicket, { color: colors.mutedForeground }]}>
            Ticket: {schedule.hubspot_inspection_ticket_id}
          </Text>
        )}
      </View>
      <Badge label={statusLabel} variant={d < today && schedule.status !== "CANCELLED" ? "destructive" : "muted"} size="sm" />
      {schedule.status !== "CANCELLED" && (
        <Pressable onPress={() => onReschedule(schedule)} hitSlop={10} style={{ marginLeft: 8 }}>
          <Feather name="edit-2" size={14} color={colors.primary} />
        </Pressable>
      )}
      {schedule.status !== "CANCELLED" && d >= today && (
        <Pressable
          onPress={() => onStartInspection(schedule.id)}
          hitSlop={10}
          style={{ marginLeft: 4 }}
        >
          <Feather name="play-circle" size={16} color={colors.success} />
        </Pressable>
      )}
    </View>
  );
}

export default function ContractDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orgId } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<InspectionSchedule | null>(null);

  const { data: allContract = [], isLoading: contractLoading, refetch } = useInspectionContracts();
  const { data: schedules = [], isLoading: schLoading } = useInspectionSchedules(id);
  const { data: assets = [] } = useAssets();
  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name }));
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const rescheduleVisit = useRescheduleVisit();

  const contract = allContract.find((s) => s.id === id);

  const sorted = useMemo(
    () => [...schedules].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [schedules],
  );

  const today = new Date().toISOString().slice(0, 10);
  const future = sorted.filter((s) => s.scheduled_date >= today && s.status !== "CANCELLED");
  const past = sorted.filter((s) => s.scheduled_date < today || s.status === "CANCELLED");

  const isLoading = contractLoading || schLoading;

  if (isLoading) {
    return (
      <ScreenWrapper safeTop={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!contract) {
    return (
      <ScreenWrapper safeTop={false}>
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>Contract not found.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Contract?",
      "Future visits will be cancelled. Past visit records are preserved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteContract.mutateAsync(contract.id);
            router.back();
          },
        },
      ],
    );
  };

  const futureShiftCount = rescheduleTarget
    ? sorted.filter(
        (s) =>
          s.scheduled_date >= (rescheduleTarget.scheduled_date.slice(0, 10)) &&
          s.status !== "CANCELLED",
      ).length
    : 0;

  return (
    <ScreenWrapper safeTop={false}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Card style={styles.heroCard}>
          <CardContent>
            <View style={styles.heroTop}>
              <View style={styles.heroTitle}>
                <Text style={[styles.name, { color: colors.foreground }]}>{contract.name}</Text>
                <Badge
                  label={contract.is_booked ? "Booked" : "Unbooked"}
                  variant={contract.is_booked ? "success" : "muted"}
                />
              </View>
              <View style={styles.heroActions}>
                <Pressable onPress={() => setShowEditModal(true)} hitSlop={10}>
                  <Feather name="edit-2" size={18} color={colors.primary} />
                </Pressable>
                <Pressable onPress={handleDelete} hitSlop={10}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            </View>

            <SystemTypeBadge systemType={contract.system_type} />

            <View style={styles.infoGrid}>
              {[
                { label: "Frequency", value: freqLabel(contract.frequency_days) },
                { label: "Asset ID", value: contract.hubspot_asset_id },
                { label: "Starts", value: contract.starts_at.slice(0, 10) },
                { label: "Ends", value: contract.ends_at?.slice(0, 10) ?? "Ongoing" },
                {
                  label: "Contracted",
                  value: contract.contracted_amount != null
                    ? `$${contract.contracted_amount.toLocaleString()}`
                    : "—",
                },
                { label: "Horizon", value: `${contract.generation_horizon_days} days` },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{row.value}</Text>
                </View>
              ))}
            </View>

            {contract.notes ? (
              <Text style={[styles.notes, { color: colors.mutedForeground }]}>{contract.notes}</Text>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming Visits"
            subtitle={`${future.length} scheduled`}
          />
          <CardContent>
            {future.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>No upcoming visits.</Text>
            ) : (
              future.map((s) => (
                <ScheduleRow key={s.id} schedule={s} onReschedule={setRescheduleTarget} onStartInspection={(sid) => router.push(`/inspections/${sid}` as any)} />
              ))
            )}
          </CardContent>
        </Card>

        {past.length > 0 && (
          <Card>
            <CardHeader title="Past Visits" subtitle={`${past.length} visits`} />
            <CardContent>
              {past.map((s) => (
                <ScheduleRow key={s.id} schedule={s} onReschedule={setRescheduleTarget} onStartInspection={(sid) => router.push(`/inspections/${sid}` as any)} />
              ))}
            </CardContent>
          </Card>
        )}

        <InspectionContractFormModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          mode="edit"
          initialValues={contract}
          assetOptions={assetOptions}
          onSubmit={async (data) => {
            await updateContract.mutateAsync({ id: contract.id, data });
          }}
        />

        {rescheduleTarget && (
          <RescheduleModal
            visible
            onClose={() => setRescheduleTarget(null)}
            currentDate={rescheduleTarget.scheduled_date.slice(0, 10)}
            futureShiftCount={futureShiftCount}
            onConfirm={async (newDate, reason) => {
              await rescheduleVisit.mutateAsync({
                scheduleId: rescheduleTarget.id,
                contractId: contract.id,
                oldDate: rescheduleTarget.scheduled_date.slice(0, 10),
                newDate,
                reason,
              });
              setRescheduleTarget(null);
            }}
          />
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroCard: {},
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  heroTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  name: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  heroActions: { flexDirection: "row", gap: 16, marginLeft: 8 },
  infoGrid: { gap: 0, marginTop: 12, borderRadius: 8, overflow: "hidden" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  notes: { marginTop: 10, fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleBody: { flex: 1 },
  scheduleDate: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scheduleFrom: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  scheduleTicket: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 20 },
});
