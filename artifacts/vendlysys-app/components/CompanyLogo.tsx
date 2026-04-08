import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";

type Props = {
  logoUrl?: string | null;
  nome?: string | null;
  size?: number;
  borderRadius?: number;
};

export default function CompanyLogo({ logoUrl, nome, size = 40, borderRadius }: Props) {
  const radius = borderRadius ?? size * 0.3;
  const fontSize = size * 0.38;
  const initials = nome
    ? nome
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  if (logoUrl) {
    return (
      <View style={{ width: 160, height: size, borderRadius: radius, overflow: "hidden" }}>
        <Image
          source={{ uri: logoUrl }}
          style={{ width: 160, height: size }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.initialsWrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.light.goldenLight,
          borderColor: colors.light.border,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initialsWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  initials: {
    fontFamily: "Inter_700Bold",
    color: colors.light.golden,
  },
});
