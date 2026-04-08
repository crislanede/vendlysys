import { useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "@/utils/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(token: string | null) {
  const registered = useRef(false);

  useEffect(() => {
    if (!token || registered.current) return;
    if (Platform.OS === "web") return;
    if (!Device.isDevice) return;

    async function register() {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") return;

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "VendlySys",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#b8956f",
          });
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = tokenData.data;
        if (!pushToken) return;

        await api.post("/push-token", { push_token: pushToken }, token);
        registered.current = true;
      } catch {
      }
    }

    register();
  }, [token]);
}
