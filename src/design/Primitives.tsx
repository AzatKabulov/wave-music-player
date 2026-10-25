import type { LucideIcon } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { theme as t, type ColorRole, type TypeRole } from "./theme";
import { Touch } from "./Motion";
import { useLocale } from "../i18n/LocaleProvider";

export function Label({
  type = "base",
  color = "text",
  style,
  i18n = false,
  children,
  ...props
}: TextProps & { type?: TypeRole; color?: ColorRole; i18n?: boolean }) {
  const { tx } = useLocale();
  const content =
    i18n && typeof children === "string"
      ? tx(children.trim()) + (children.endsWith(" ") ? " " : "")
      : children;
  return (
    <Text {...props} style={[t.type[type], { color: t.color[color] }, style]}>
      {content}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  busy,
  icon: Icon,
  style,
  i18n = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  disabled?: boolean;
  busy?: boolean;
  icon?: LucideIcon;
  style?: ViewStyle;
  i18n?: boolean;
}) {
  const { tx } = useLocale();
  const displayTitle = i18n ? tx(title) : title;
  const [focused, setFocused] = useState(false);
  const foreground =
    variant === "primary"
      ? t.color["on-accent"]
      : variant === "danger"
        ? t.color.danger
        : t.color.text;
  return (
    <Touch
      accessibilityRole="button"
      accessibilityLabel={displayTitle}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.button,
        variant === "primary"
          ? styles.primary
          : variant === "quiet"
            ? styles.quiet
            : styles.secondary,
        focused && styles.focus,
        (disabled || busy) && styles.disabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : Icon ? (
        <Icon color={foreground} size={t.icon.sm} strokeWidth={t.stroke} />
      ) : null}
      <Label type="base" style={{ color: foreground, fontWeight: "600" }}>
        {displayTitle}
      </Label>
    </Touch>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  selected,
  disabled,
  filled,
  size = "base",
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  filled?: boolean;
  size?: keyof typeof t.icon;
}) {
  const { tx } = useLocale();
  const [focused, setFocused] = useState(false);
  return (
    <Touch
      haptic={selected !== undefined}
      accessibilityRole="button"
      accessibilityLabel={tx(label)}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.iconButton,
        filled && styles.primary,
        focused && styles.focus,
        disabled && styles.disabled,
      ]}
    >
      <Icon
        size={t.icon[size]}
        strokeWidth={t.stroke}
        color={
          filled
            ? t.color["on-accent"]
            : selected
              ? t.color.accent
              : t.color.text
        }
      />
    </Touch>
  );
}

export function Chip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      i18n
      title={title}
      onPress={onPress}
      variant={selected ? "primary" : "secondary"}
      style={styles.chip}
    />
  );
}

export function Input({
  label,
  error,
  style,
  i18n = false,
  ...props
}: TextInputProps & { label: string; error?: string; i18n?: boolean }) {
  const { tx } = useLocale();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Label type="sm" color="text-muted">
        {i18n ? tx(label) : label}
      </Label>
      <TextInput
        {...props}
        accessibilityLabel={i18n ? tx(label) : label}
        placeholder={props.placeholder ? tx(props.placeholder) : undefined}
        placeholderTextColor={t.color["text-muted"]}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          focused && styles.focus,
          error && styles.invalid,
          style,
        ]}
      />
      {error ? (
        <Label type="sm" color="danger" accessibilityRole="alert">
          {tx(error)}
        </Label>
      ) : null}
    </View>
  );
}

export function StateView({
  title,
  message,
  action,
  onAction,
}: {
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.state}>
      <Label i18n type="xl" accessibilityRole="header">
        {title}
      </Label>
      <Label i18n color="text-muted" style={styles.stateMessage}>
        {message}
      </Label>
      {action && onAction ? (
        <Button i18n title={action} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function Skeleton({ height = t.layout.trackRow }: { height?: number }) {
  return (
    <View
      accessibilityLabel="Loading content"
      accessibilityRole="progressbar"
      style={[styles.skeleton, { height }]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: t.layout.touch,
    paddingHorizontal: t.space[20],
    paddingVertical: t.space[12],
    borderRadius: t.radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.space[8],
    borderWidth: t.layout.focusWidth,
    borderColor: "transparent",
  },
  primary: { backgroundColor: t.color.accent },
  secondary: { backgroundColor: t.color["surface-raised"] },
  quiet: { backgroundColor: "transparent" },
  pressed: { opacity: t.opacity.veil },
  disabled: { opacity: t.opacity.disabled },
  focus: { borderColor: t.color.focus },
  iconButton: {
    minWidth: t.layout.touch,
    minHeight: t.layout.touch,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: t.layout.focusWidth,
    borderColor: "transparent",
  },
  chip: { paddingHorizontal: t.space[16], paddingVertical: t.space[8] },
  inputGroup: { gap: t.space[8] },
  input: {
    ...t.type.base,
    color: t.color.text,
    backgroundColor: t.color.surface,
    borderColor: t.color["border-input"],
    borderWidth: t.layout.focusWidth,
    minHeight: t.layout.touch,
    paddingHorizontal: t.space[16],
    paddingVertical: t.space[12],
    borderRadius: t.radius.md,
  },
  invalid: { borderColor: t.color.danger },
  state: { alignItems: "center", padding: t.space[32], gap: t.space[16] },
  stateMessage: { textAlign: "center", maxWidth: t.space[400] },
  skeleton: {
    backgroundColor: t.color["surface-raised"],
    borderRadius: t.radius.md,
  },
});
