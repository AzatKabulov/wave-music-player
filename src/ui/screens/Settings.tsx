import { Clock3, LogOut } from "lucide-react-native";
import { useState } from "react";
import { Switch, View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { Button, Label } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";

export function Settings() {
  const m = useMusic(),
    sn = m.snapshot!,
    [confirm, setConfirm] = useState(false);
  return (
    <Shell title="Your listening space" back>
      <View style={ui.form}>
        <View style={ui.card}>
          <Label type="xl">{sn.profile?.displayName || "Welcome"}</Label>
          <Label color="text-muted">
            {sn.profile?.email || "Your personal listening space"}
          </Label>
        </View>
        <Button
          title="Recently played"
          icon={Clock3}
          variant="secondary"
          onPress={() => go("/recents")}
        />
        <View style={[ui.card, ui.row]}>
          <View style={ui.grow}>
            <Label>Allow explicit tracks</Label>
            <Label type="sm" color="text-muted">
              Applies when starting music and to media access.
            </Label>
          </View>
          <Switch
            accessibilityLabel="Allow explicit tracks"
            value={sn.preferences.explicitAllowed}
            onValueChange={(value) =>
              void m.run(() =>
                m.data.preferences({
                  ...sn.preferences,
                  explicitAllowed: value,
                }),
              )
            }
            trackColor={{ false: t.color.border, true: t.color.accent }}
            thumbColor={t.color["on-accent"]}
          />
        </View>
        <Button
          title="Sign out everywhere"
          icon={LogOut}
          variant="secondary"
          onPress={() => void m.signOut()}
        />
        <Label type="sm" color="text-muted">
          Musify is a working name for this personal test. The demo catalog
          includes original synthesized recordings.
        </Label>
        {confirm ? (
          <View style={ui.card}>
            <Label>
              Delete your account and personal library? This cannot be undone.
            </Label>
            <Button
              title="Confirm account deletion"
              variant="danger"
              busy={m.pending}
              onPress={() => void m.deleteAccount()}
            />
            <Button
              title="Keep my account"
              variant="quiet"
              onPress={() => setConfirm(false)}
            />
          </View>
        ) : (
          <Button
            title="Delete account"
            variant="danger"
            onPress={() => setConfirm(true)}
          />
        )}
      </View>
    </Shell>
  );
}
