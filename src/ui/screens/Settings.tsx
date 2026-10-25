import { Check, Clock3, LogOut } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { useMotion } from "../../design/Motion";
import { Button, Label } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { useLocale } from "../../i18n/LocaleProvider";
import { Shell, go, ui } from "../Shell";

export function Settings() {
  const m = useMusic(),
    sn = m.snapshot!;
  const { tx, choice, setChoice } = useLocale();
  const { reduced, haptics, setHaptics } = useMotion();
  const [confirm, setConfirm] = useState(false);
  return (
    <Shell title="Settings" back>
      <View style={s.page}>
        <View style={s.profile}>
          <View style={s.avatar}>
            <Label style={s.initial}>
              {sn.profile?.displayName.slice(0, 1).toUpperCase() || "M"}
            </Label>
          </View>
          <View style={ui.grow}>
            <Label testID="profile-name" type="xl">
              {sn.profile?.displayName}
            </Label>
            <Label type="sm" color="text-muted">
              {sn.profile?.email || tx("Your music")}
            </Label>
          </View>
        </View>
        <Button
          i18n
          title="Recently played"
          icon={Clock3}
          variant="secondary"
          onPress={() => go("/recents")}
        />
        <View style={s.section}>
          <Label i18n type="lg">
            Playback
          </Label>
          <View style={s.setting}>
            <View style={ui.grow}>
              <Label i18n>Allow explicit tracks</Label>
              <Label i18n type="sm" color="text-muted">
                Applies when starting music and to media access.
              </Label>
            </View>
            <Switch
              accessibilityLabel={tx("Allow explicit tracks")}
              value={sn.preferences.explicitAllowed}
              disabled={m.pending}
              onValueChange={(value) =>
                void m.run(() =>
                  m.data.preferences({
                    ...sn.preferences,
                    explicitAllowed: value,
                  }),
                )
              }
              trackColor={{ false: t.color.border, true: t.color.accent }}
              thumbColor={t.color.text}
            />
          </View>
          <View style={s.setting}>
            <View style={ui.grow}>
              <Label i18n>Haptic feedback</Label>
              <Label i18n type="sm" color="text-muted">
                Subtle feedback for important actions.
              </Label>
            </View>
            <Switch
              accessibilityLabel={tx("Haptic feedback")}
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ false: t.color.border, true: t.color.accent }}
              thumbColor={t.color.text}
            />
          </View>
          <View style={s.setting}>
            <View style={ui.grow}>
              <Label i18n>Reduce motion</Label>
              <Label i18n type="sm" color="text-muted">
                Following your phone’s accessibility setting.
              </Label>
            </View>
            <Label i18n type="sm" color="text-muted">
              {reduced ? "Enabled" : "Disabled"}
            </Label>
          </View>
        </View>
        <View style={s.section}>
          <Label i18n type="lg">
            Language
          </Label>
          {(
            [
              { value: "system", name: tx("Follow phone language") },
              { value: "tk", name: "Türkmençe" },
              { value: "ru", name: "Русский" },
              { value: "en", name: "English" },
            ] as const
          ).map((option) => (
            <Button
              key={option.value}
              title={option.name}
              icon={choice === option.value ? Check : undefined}
              variant={choice === option.value ? "secondary" : "quiet"}
              onPress={() => setChoice(option.value)}
              style={s.language}
            />
          ))}
        </View>
        <View style={s.section}>
          <Label i18n type="lg">
            Account
          </Label>
          <Button
            i18n
            title="Sign out everywhere"
            icon={LogOut}
            variant="secondary"
            busy={m.pending}
            onPress={() => void m.signOut()}
          />
          {confirm ? (
            <View style={ui.card}>
              <Label i18n>
                Delete your account and personal library? This cannot be undone.
              </Label>
              <Button
                i18n
                title="Confirm account deletion"
                variant="danger"
                busy={m.pending}
                onPress={() => void m.deleteAccount()}
              />
              <Button
                i18n
                title="Keep my account"
                variant="quiet"
                onPress={() => setConfirm(false)}
              />
            </View>
          ) : (
            <Button
              i18n
              title="Delete account"
              variant="danger"
              onPress={() => setConfirm(true)}
            />
          )}
        </View>
        <Label type="sm" color="text-muted" style={s.footer}>
          Musify · 0.2
        </Label>
      </View>
    </Shell>
  );
}
const s = StyleSheet.create({
  page: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: 24,
    paddingBottom: 24,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.accent,
  },
  initial: { color: t.color["on-accent"], fontSize: 26, fontWeight: "700" },
  section: { gap: 12 },
  setting: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.color.surface,
  },
  language: { justifyContent: "flex-start" },
  footer: { textAlign: "center", paddingTop: 8 },
});
