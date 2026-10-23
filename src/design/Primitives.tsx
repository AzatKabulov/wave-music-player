import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { theme as t, type ColorRole, type TypeRole } from './theme';

export function Label({ type = 'base', color = 'text', style, ...props }: TextProps & { type?: TypeRole; color?: ColorRole }) {
  return <Text {...props} style={[t.type[type], { color: t.color[color] }, style]} />;
}

export function Button({ title, onPress, variant = 'primary', disabled, busy, icon: Icon, style }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean; busy?: boolean; icon?: LucideIcon; style?: ViewStyle;
}) {
  const [focused, setFocused] = useState(false);
  const foreground = variant === 'primary' ? t.color['on-accent'] : variant === 'danger' ? t.color.danger : t.color.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.button, variant === 'primary' ? styles.primary : variant === 'quiet' ? styles.quiet : styles.secondary,
      pressed && styles.pressed, focused && styles.focus, (disabled || busy) && styles.disabled, style]}>
    {busy ? <ActivityIndicator color={foreground} /> : Icon ? <Icon color={foreground} size={t.icon.sm} strokeWidth={t.stroke} /> : null}
    <Label type="base" style={{ color: foreground, fontWeight: '600' }}>{title}</Label>
  </Pressable>;
}

export function IconButton({ icon: Icon, label, onPress, selected, disabled, filled, size = 'base' }: {
  icon: LucideIcon; label: string; onPress: () => void; selected?: boolean; disabled?: boolean; filled?: boolean; size?: keyof typeof t.icon;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.iconButton, filled && styles.primary, pressed && styles.pressed, focused && styles.focus, disabled && styles.disabled]}>
    <Icon size={t.icon[size]} strokeWidth={t.stroke} color={filled ? t.color['on-accent'] : selected ? t.color.accent : t.color.text} />
  </Pressable>;
}

export function Chip({ title, selected, onPress }: { title: string; selected?: boolean; onPress: () => void }) {
  return <Button title={title} onPress={onPress} variant={selected ? 'primary' : 'secondary'} style={styles.chip} />;
}

export function Input({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.inputGroup}>
    <Label type="sm" color="text-muted">{label}</Label>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={t.color['text-muted']}
      onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
      style={[styles.input, focused && styles.focus, error && styles.invalid, style]} />
    {error ? <Label type="sm" color="danger" accessibilityRole="alert">{error}</Label> : null}
  </View>;
}

export function StateView({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void }) {
  return <View style={styles.state}>
    <Label type="xl" accessibilityRole="header">{title}</Label>
    <Label color="text-muted" style={styles.stateMessage}>{message}</Label>
    {action && onAction ? <Button title={action} onPress={onAction} /> : null}
  </View>;
}

export function Skeleton({ height = t.layout.trackRow }: { height?: number }) {
  return <View accessibilityLabel="Loading content" accessibilityRole="progressbar" style={[styles.skeleton, { height }]} />;
}

const styles = StyleSheet.create({
  button: { minHeight: t.layout.touch, paddingHorizontal: t.space[20], paddingVertical: t.space[12], borderRadius: t.radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space[8], borderWidth: t.layout.focusWidth, borderColor: 'transparent' },
  primary: { backgroundColor: t.color.accent }, secondary: { backgroundColor: t.color['surface-raised'] }, quiet: { backgroundColor: 'transparent' },
  pressed: { opacity: t.opacity.veil }, disabled: { opacity: t.opacity.disabled }, focus: { borderColor: t.color.focus },
  iconButton: { minWidth: t.layout.touch, minHeight: t.layout.touch, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: t.layout.focusWidth, borderColor: 'transparent' },
  chip: { paddingHorizontal: t.space[16], paddingVertical: t.space[8] }, inputGroup: { gap: t.space[8] },
  input: { ...t.type.base, color: t.color.text, backgroundColor: t.color.surface, borderColor: t.color['border-input'], borderWidth: t.layout.focusWidth,
    minHeight: t.layout.touch, paddingHorizontal: t.space[16], paddingVertical: t.space[12], borderRadius: t.radius.md },
  invalid: { borderColor: t.color.danger }, state: { alignItems: 'center', padding: t.space[32], gap: t.space[16] },
  stateMessage: { textAlign: 'center', maxWidth: t.space[400] }, skeleton: { backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md },
});
