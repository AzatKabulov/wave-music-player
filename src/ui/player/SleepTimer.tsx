import { Moon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useMusic, usePlaybackStatus } from "../../data/MusicProvider";
import { sleepMinutes, sleepRemainingMs } from "../../data/sleepTimer";
import { Touch, useMotion } from "../../design/Motion";
import { Button, Label } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { useLocale } from "../../i18n/LocaleProvider";

const clock = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export function SleepTimerButton() {
  const { tx } = useLocale();
  const { reduced } = useMotion();
  const m = useMusic();
  const status = usePlaybackStatus();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => Date.now());
  const armed = m.sleep.kind !== "off";
  // Repaint the countdown each second even while paused, when status updates stop.
  useEffect(() => {
    if (!armed) return;
    const timer = setInterval(() => setSeen(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [armed]);
  // A reading older than the moment the timer was armed would overstate the time left.
  const now =
    m.sleep.kind === "duration"
      ? Math.max(seen, m.sleep.deadline - m.sleep.minutes * 60_000)
      : seen;
  const entry = m.queue.entries[status.currentIndex];
  const remaining = sleepRemainingMs(m.sleep, {
    now,
    entryId: entry?.id ?? null,
    positionSec: status.currentTime,
    durationSec: status.duration,
  });
  const summary =
    m.sleep.kind === "track"
      ? tx("End of track")
      : remaining === null
        ? ""
        : clock(remaining);
  const text = armed && summary ? summary : tx("Sleep timer");
  const choose = (start: () => void) => {
    start();
    setOpen(false);
  };
  return (
    <>
      <Touch
        accessibilityRole="button"
        accessibilityLabel={
          armed && summary
            ? `${tx("Sleep timer")} ${summary}`
            : tx("Sleep timer")
        }
        onPress={() => setOpen(true)}
        style={s.button}
      >
        <Moon size={22} color={armed ? t.color.accent : t.color.text} />
        <Label type="sm" color={armed ? "accent" : "text"}>
          {text}
        </Label>
      </Touch>
      <Modal
        transparent
        visible={open}
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.backdrop}>
          <View style={s.dialog} accessibilityViewIsModal>
            <Label i18n type="xl" accessibilityRole="header">
              Sleep timer
            </Label>
            {sleepMinutes.map((minutes) => (
              <Button
                key={minutes}
                title={tx("{minutes} minutes", { minutes })}
                variant={
                  m.sleep.kind === "duration" && m.sleep.minutes === minutes
                    ? "secondary"
                    : "quiet"
                }
                onPress={() => choose(() => m.startSleep(minutes))}
              />
            ))}
            <Button
              i18n
              title="End of track"
              variant={m.sleep.kind === "track" ? "secondary" : "quiet"}
              disabled={!entry}
              onPress={() => choose(() => m.startSleep("track"))}
            />
            {armed ? (
              <Button
                i18n
                title="Turn off timer"
                variant="danger"
                onPress={() => choose(m.cancelSleep)}
              />
            ) : null}
            <Button
              i18n
              title="Dismiss"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  backdrop: {
    flex: 1,
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: t.color.surface,
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
});
