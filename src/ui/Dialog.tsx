import { Modal, StyleSheet, View } from "react-native";
import { Button, Label } from "../design/Primitives";
import { useMotion } from "../design/Motion";
import { theme as t } from "../design/theme";

export function ConfirmDialog({
  visible,
  title,
  message,
  action,
  cancel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  action: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { reduced } = useMotion();
  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onCancel}
    >
      <View style={s.backdrop}>
        <View style={s.dialog} accessibilityViewIsModal>
          <Label i18n type="xl" accessibilityRole="header">
            {title}
          </Label>
          <Label i18n color="text-muted">
            {message}
          </Label>
          <Button i18n title={cancel} variant="secondary" onPress={onCancel} />
          <Button i18n title={action} variant="danger" onPress={onConfirm} />
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
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
    gap: 16,
  },
});
