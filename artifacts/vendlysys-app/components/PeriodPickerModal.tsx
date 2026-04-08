import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export type DateRange = { inicio: string; fim: string };

function pad(n: number) { return String(n).padStart(2, "0"); }
function firstDay(y: number, m: number) { return `${y}-${pad(m + 1)}-01`; }
function lastDay(y: number, m: number) {
  return `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function MonthYearPicker({
  label,
  year,
  month,
  onYearChange,
  onMonthChange,
  minYear = 2023,
  maxYear = new Date().getFullYear(),
  disableAfter,
  disableBefore,
}: {
  label: string;
  year: number;
  month: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  minYear?: number;
  maxYear?: number;
  disableAfter?: { year: number; month: number };
  disableBefore?: { year: number; month: number };
}) {
  const now = new Date();
  const isTooFar = (y: number, m: number) => {
    if (disableAfter && (y > disableAfter.year || (y === disableAfter.year && m > disableAfter.month))) return true;
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return true;
    if (disableBefore && (y < disableBefore.year || (y === disableBefore.year && m < disableBefore.month))) return true;
    return false;
  };

  return (
    <View style={s.pickerSection}>
      <Text style={s.pickerLabel}>{label}</Text>
      <View style={s.yearRow}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onYearChange(year - 1); }}
          disabled={year <= minYear}
          style={[s.yearBtn, year <= minYear && s.yearBtnDisabled]}
        >
          <Feather name="chevron-left" size={18} color={year <= minYear ? colors.light.border : colors.light.golden} />
        </TouchableOpacity>
        <Text style={s.yearText}>{year}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onYearChange(year + 1); }}
          disabled={year >= maxYear}
          style={[s.yearBtn, year >= maxYear && s.yearBtnDisabled]}
        >
          <Feather name="chevron-right" size={18} color={year >= maxYear ? colors.light.border : colors.light.golden} />
        </TouchableOpacity>
      </View>
      <View style={s.monthGrid}>
        {MESES.map((m, i) => {
          const disabled = isTooFar(year, i);
          const active = i === month;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => { if (!disabled) { Haptics.selectionAsync(); onMonthChange(i); } }}
              disabled={disabled}
              style={[s.monthChip, active && s.monthChipActive, disabled && s.monthChipDisabled]}
            >
              <Text style={[s.monthText, active && s.monthTextActive, disabled && s.monthTextDisabled]}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  initialRange?: DateRange;
  onConfirm: (range: DateRange) => void;
};

export function PeriodPickerModal({ visible, onClose, initialRange, onConfirm }: Props) {
  const now = new Date();
  const parseDate = (s?: string) => {
    if (!s) return { y: now.getFullYear(), m: now.getMonth() };
    const [y, mo] = s.split("-").map(Number);
    return { y, m: mo - 1 };
  };

  const initIni = parseDate(initialRange?.inicio);
  const initFim = parseDate(initialRange?.fim);

  const [startYear, setStartYear] = useState(initIni.y);
  const [startMonth, setStartMonth] = useState(initIni.m);
  const [endYear, setEndYear] = useState(initFim.y);
  const [endMonth, setEndMonth] = useState(initFim.m);

  React.useEffect(() => {
    if (visible) {
      const ini = parseDate(initialRange?.inicio);
      const fim = parseDate(initialRange?.fim);
      setStartYear(ini.y); setStartMonth(ini.m);
      setEndYear(fim.y); setEndMonth(fim.m);
    }
  }, [visible]);

  function handleStartYearChange(y: number) {
    setStartYear(y);
    if (y > endYear || (y === endYear && startMonth > endMonth)) {
      setEndYear(y); setEndMonth(startMonth);
    }
  }
  function handleStartMonthChange(m: number) {
    setStartMonth(m);
    if (startYear > endYear || (startYear === endYear && m > endMonth)) {
      setEndYear(startYear); setEndMonth(m);
    }
  }

  function handleConfirm() {
    const inicio = firstDay(startYear, startMonth);
    const fim = endYear === now.getFullYear() && endMonth === now.getMonth()
      ? todayStr()
      : lastDay(endYear, endMonth);
    onConfirm({ inicio, fim });
    onClose();
  }

  const startLabel = `${MESES_FULL[startMonth]} ${startYear}`;
  const endLabel = `${MESES_FULL[endMonth]} ${endYear}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Selecionar Período</Text>
        <Text style={s.sheetSubtitle}>{startLabel} → {endLabel}</Text>

        <View style={s.pickersRow}>
          <MonthYearPicker
            label="De"
            year={startYear}
            month={startMonth}
            onYearChange={handleStartYearChange}
            onMonthChange={handleStartMonthChange}
          />
          <View style={s.divider} />
          <MonthYearPicker
            label="Até"
            year={endYear}
            month={endMonth}
            onYearChange={setEndYear}
            onMonthChange={setEndMonth}
            disableBefore={{ year: startYear, month: startMonth }}
          />
        </View>

        <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={s.confirmText}>Confirmar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.light.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    textAlign: "center",
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.golden,
    textAlign: "center",
    marginBottom: 20,
  },
  pickersRow: {
    flexDirection: "row",
    gap: 8,
  },
  divider: {
    width: 1,
    backgroundColor: colors.light.border,
    marginVertical: 4,
  },
  pickerSection: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.mutedForeground,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  yearBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.light.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  yearBtnDisabled: {
    opacity: 0.4,
  },
  yearText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  monthChip: {
    width: "30%",
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: colors.light.card,
    alignItems: "center",
  },
  monthChipActive: {
    backgroundColor: colors.light.golden,
    borderColor: colors.light.golden,
  },
  monthChipDisabled: {
    opacity: 0.35,
  },
  monthText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  monthTextActive: {
    color: "#fff",
  },
  monthTextDisabled: {
    color: colors.light.mutedForeground,
  },
  confirmBtn: {
    marginTop: 20,
    backgroundColor: colors.light.golden,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
