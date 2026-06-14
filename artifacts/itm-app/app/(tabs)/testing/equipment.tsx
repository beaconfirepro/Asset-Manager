import React, { useState } from "react";
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
import { useColors } from "@/hooks/useColors";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TestEquipmentTable } from "@/components/testing/TestEquipmentTable";
import { CalibrationModal } from "@/components/testing/CalibrationModal";
import { useTestEquipment, useCalibrationRecords, useCreateEquipment, useCreateCalibration } from "@/hooks/useTestEquipment";
import { useCreateCrewShift, useMaintenance } from "@/hooks/useMaintenance";
import type { TestEquipment } from "@/db/schema";

export default function EquipmentScreen() {
  const colors = useColors();
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [calTarget, setCalTarget] = useState<TestEquipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<TestEquipment | null>(null);
  const [showCrewShiftModal, setShowCrewShiftModal] = useState(false);
  const [crewJobTitle, setCrewJobTitle] = useState("Maintenance Technician");
  const [crewLocation, setCrewLocation] = useState("Site");
  const [crewDuration, setCrewDuration] = useState("4");
  const [crewNotes, setCrewNotes] = useState("");
  const [crewLoading, setCrewLoading] = useState(false);

  const { data: equipment = [], isLoading: eqLoading, refetch: refetchEq } = useTestEquipment();
  const { data: calRecords = [], isLoading: calLoading } = useCalibrationRecords();
  const { data: maintenance = [] } = useMaintenance();
  const createEquipment = useCreateEquipment();
  const createCalibration = useCreateCalibration();
  const createCrewShift = useCreateCrewShift();

  const isLoading = eqLoading || calLoading;

  const expiredCount = equipment.filter(
    (e) => e.calibration_status === "EXPIRED" || e.calibration_status === "OVERDUE",
  ).length;
  const dueSoonCount = equipment.filter((e) => e.calibration_status === "DUE_SOON").length;

  const [newName, setNewName] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newMfg, setNewMfg] = useState("");

  const handleAddEquipment = async () => {
    if (!newName.trim()) {
      Alert.alert("Validation", "Instrument name is required.");
      return;
    }
    await createEquipment.mutateAsync({
      name: newName.trim(),
      model: newModel.trim() || null,
      serial_number: newSerial.trim() || null,
      manufacturer: newMfg.trim() || null,
    });
    setNewName("");
    setNewModel("");
    setNewSerial("");
    setNewMfg("");
    setShowAddEquipment(false);
  };

  const actionableMaintenance = maintenance.filter(
    (m) => (m.status === "SCHEDULED" || m.status === "IN_PROGRESS") && !m.connecteam_shift_id,
  );

  const handleCrewShift = async (maintRecord: typeof maintenance[0]) => {
    setCrewJobTitle("Maintenance Technician");
    setCrewLocation(maintRecord.hubspot_asset_id);
    setCrewDuration("4");
    setCrewNotes(maintRecord.description ?? "");
    setSelectedEquipment(null);
    setShowCrewShiftModal(true);
    return maintRecord;
  };

  const submitCrewShift = async (maintId: string, assetId: string, scheduledAt: string) => {
    setCrewLoading(true);
    try {
      await createCrewShift.mutateAsync({
        maintenanceRecordId: maintId,
        hubspotAssetId: assetId,
        jobTitle: crewJobTitle,
        location: crewLocation,
        scheduledAt,
        durationHours: parseFloat(crewDuration) || 4,
        notes: crewNotes || undefined,
      });
      Alert.alert("Crew Shift Queued", "Connecteam shift push has been enqueued and will sync when online.");
      setShowCrewShiftModal(false);
    } catch {
      Alert.alert("Error", "Failed to queue crew shift. Please try again.");
    } finally {
      setCrewLoading(false);
    }
  };

  const [pendingCrewMaint, setPendingCrewMaint] = useState<typeof maintenance[0] | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetchEq} tintColor={colors.primary} />}
      >
        {(expiredCount > 0 || dueSoonCount > 0) && (
          <Card style={{ borderWidth: 1, borderColor: expiredCount > 0 ? colors.destructive + "66" : colors.warning + "66" }}>
            <CardContent>
              <View style={styles.alertRow}>
                <Feather
                  name="alert-triangle"
                  size={16}
                  color={expiredCount > 0 ? colors.destructive : colors.warning}
                />
                <Text
                  style={[
                    styles.alertText,
                    { color: expiredCount > 0 ? colors.destructive : colors.warning },
                  ]}
                >
                  {expiredCount > 0
                    ? `${expiredCount} instrument${expiredCount !== 1 ? "s" : ""} with expired calibration — do not use`
                    : `${dueSoonCount} instrument${dueSoonCount !== 1 ? "s" : ""} due for calibration within 30 days`}
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Test Instruments"
            subtitle={`${equipment.length} instruments · ${expiredCount} expired`}
          />
          <CardContent>
            <TestEquipmentTable
              equipment={equipment}
              onLogCalibration={(eq) => setCalTarget(eq)}
            />
          </CardContent>
        </Card>

        {actionableMaintenance.length > 0 && (
          <Card>
            <CardHeader
              title="Create Crew Shift"
              subtitle="Maintenance orders awaiting Connecteam handoff"
            />
            <CardContent>
              {actionableMaintenance.map((m, idx) => (
                <View
                  key={m.id}
                  style={[
                    styles.shiftRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: idx < actionableMaintenance.length - 1 ? 1 : 0,
                    },
                  ]}
                >
                  <View style={styles.shiftInfo}>
                    <Text style={[styles.shiftAsset, { color: colors.foreground }]}>
                      {m.hubspot_asset_id} · {m.maintenance_type}
                    </Text>
                    {m.description && (
                      <Text style={[styles.shiftDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {m.description}
                      </Text>
                    )}
                    <Text style={[styles.shiftDate, { color: colors.mutedForeground }]}>
                      {m.scheduled_at ? m.scheduled_at.slice(0, 10) : "No date"}
                    </Text>
                  </View>
                  <StatusBadge status={m.status} size="sm" />
                  <Button
                    label="Assign Crew"
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      setPendingCrewMaint(m);
                      setCrewJobTitle("Maintenance Technician");
                      setCrewLocation(m.hubspot_asset_id);
                      setCrewDuration("4");
                      setCrewNotes(m.description ?? "");
                      setShowCrewShiftModal(true);
                    }}
                    style={{ marginLeft: 10 }}
                  />
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {calRecords.length > 0 && (
          <Card>
            <CardHeader
              title="Calibration History"
              subtitle={`${calRecords.length} records`}
            />
            <CardContent>
              {[...calRecords]
                .sort((a, b) => b.calibrated_at.localeCompare(a.calibrated_at))
                .slice(0, 10)
                .map((rec, idx) => {
                  const eq = equipment.find((e) => e.id === rec.equipment_id);
                  return (
                    <View
                      key={rec.id}
                      style={[
                        styles.calRow,
                        {
                          borderBottomColor: colors.border,
                          borderBottomWidth: idx < Math.min(calRecords.length, 10) - 1 ? 1 : 0,
                        },
                      ]}
                    >
                      <View style={styles.calBody}>
                        <Text style={[styles.calName, { color: colors.foreground }]}>
                          {eq?.name ?? rec.equipment_id}
                        </Text>
                        <Text style={[styles.calMeta, { color: colors.mutedForeground }]}>
                          {rec.calibrated_at.slice(0, 10)} → {rec.expires_at.slice(0, 10)}
                          {rec.technician ? ` · ${rec.technician}` : ""}
                        </Text>
                        {rec.certificate_number && (
                          <Text style={[styles.calCert, { color: colors.mutedForeground }]}>
                            Cert: {rec.certificate_number}
                          </Text>
                        )}
                      </View>
                      <StatusBadge status={rec.result} size="sm" />
                    </View>
                  );
                })}
            </CardContent>
          </Card>
        )}
      </ScrollView>

      <Pressable
        onPress={() => setShowAddEquipment(true)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Feather name="plus" size={22} color="#fff" />
      </Pressable>

      <CalibrationModal
        visible={!!calTarget}
        equipment={calTarget}
        onClose={() => setCalTarget(null)}
        onSubmit={async (data) => {
          await createCalibration.mutateAsync(data);
        }}
      />

      <Modal
        visible={showAddEquipment}
        onClose={() => setShowAddEquipment(false)}
        title="Add Instrument"
      >
        <Input label="Name *" value={newName} onChangeText={setNewName} placeholder="e.g. Digital Pitot Gauge" containerStyle={styles.field} />
        <Input label="Model" value={newModel} onChangeText={setNewModel} placeholder="e.g. DPG-350" containerStyle={styles.field} />
        <Input label="Serial Number" value={newSerial} onChangeText={setNewSerial} placeholder="SN-2026-0001" containerStyle={styles.field} />
        <Input label="Manufacturer" value={newMfg} onChangeText={setNewMfg} placeholder="e.g. Reed Instruments" containerStyle={styles.field} />
        <View style={styles.actions}>
          <Button label="Cancel" variant="outline" onPress={() => setShowAddEquipment(false)} style={styles.actionBtn} />
          <Button
            label={createEquipment.isPending ? "Saving…" : "Add Instrument"}
            onPress={handleAddEquipment}
            disabled={createEquipment.isPending}
            style={styles.actionBtn}
          />
        </View>
      </Modal>

      <Modal
        visible={showCrewShiftModal}
        onClose={() => setShowCrewShiftModal(false)}
        title="Assign Crew Shift"
        size="lg"
      >
        <Text style={[styles.crewNote, { color: colors.mutedForeground }]}>
          This will enqueue a Connecteam shift push via the sync outbox. The crew will be notified when connectivity is restored.
        </Text>
        {pendingCrewMaint && (
          <View style={[styles.crewRecord, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.crewRecordTitle, { color: colors.foreground }]}>
              {pendingCrewMaint.maintenance_type} · {pendingCrewMaint.hubspot_asset_id}
            </Text>
            {pendingCrewMaint.description && (
              <Text style={[styles.crewRecordDesc, { color: colors.mutedForeground }]}>
                {pendingCrewMaint.description}
              </Text>
            )}
          </View>
        )}
        <Input label="Job Title" value={crewJobTitle} onChangeText={setCrewJobTitle} containerStyle={styles.field} />
        <Input label="Location / Asset ID" value={crewLocation} onChangeText={setCrewLocation} containerStyle={styles.field} />
        <Input
          label="Duration (hours)"
          value={crewDuration}
          onChangeText={setCrewDuration}
          keyboardType="decimal-pad"
          containerStyle={styles.field}
        />
        <Input label="Notes (optional)" value={crewNotes} onChangeText={setCrewNotes} multiline containerStyle={styles.field} />
        <View style={styles.actions}>
          <Button label="Cancel" variant="outline" onPress={() => setShowCrewShiftModal(false)} style={styles.actionBtn} />
          <Button
            label={crewLoading ? "Queuing…" : "Queue Shift"}
            onPress={() => {
              if (pendingCrewMaint) {
                submitCrewShift(
                  pendingCrewMaint.id,
                  pendingCrewMaint.hubspot_asset_id,
                  pendingCrewMaint.scheduled_at ?? new Date().toISOString(),
                );
              }
            }}
            disabled={crewLoading || !pendingCrewMaint}
            style={styles.actionBtn}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 120, gap: 12 },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  shiftRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 8 },
  shiftInfo: { flex: 1 },
  shiftAsset: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shiftDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  shiftDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  calRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, gap: 10 },
  calBody: { flex: 1 },
  calName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  calMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  calCert: { fontSize: 11, fontFamily: "Inter_400Regular" },
  field: { marginBottom: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionBtn: { flex: 1 },
  fab: {
    position: "absolute",
    bottom: 96,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  crewNote: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 18 },
  crewRecord: { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 14 },
  crewRecordTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  crewRecordDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
