import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { Artwork } from "../../design/Artwork";
import { Button, Chip, Input, Label } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, ui } from "../Shell";

export function Auth() {
  const m = useMusic(),
    [mode, setMode] = useState<"login" | "register" | "recover">("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [validation, setValidation] = useState("");
  const submit = () => {
    if (
      !/^\S+@\S+\.\S+$/.test(email) ||
      (mode !== "recover" && password.length < 10) ||
      (mode === "register" && !name.trim())
    ) {
      setValidation(
        "Enter a valid email, a password of at least 10 characters, and your name when registering.",
      );
      return;
    }
    void m
      .run(
        async () => ({
          message: await m.data.auth(mode, email, password, name),
        }),
        mode === "recover" ? "Check your email for the next step." : undefined,
      )
      .then((value) => {
        if (value) {
          if (typeof value.message === "string") m.setNotice(value.message);
          if (mode !== "recover") router.replace("/home");
        }
        setPassword("");
      });
  };
  return (
    <Shell title="musify" eyebrow="KEEP YOUR OWN RHYTHM">
      <View style={ui.form}>
        <Artwork palette="clay" size={t.space[192]} />
        <Label type="display">Make room for{"\n"}your music.</Label>
        <Label color="text-muted">
          Choose a track. Keep a feeling. Make it yours.
        </Label>
        <View style={ui.wrap}>
          {(["login", "register", "recover"] as const).map((x) => (
            <Chip
              key={x}
              title={
                x === "login"
                  ? "Sign in"
                  : x === "register"
                    ? "Join Musify"
                    : "Recover"
              }
              selected={mode === x}
              onPress={() => {
                setMode(x);
                setValidation("");
              }}
            />
          ))}
        </View>
        {mode === "register" ? (
          <Input
            label="Your name"
            value={name}
            onChangeText={setName}
            maxLength={80}
          />
        ) : null}
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {mode !== "recover" ? (
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
          />
        ) : null}
        {validation ? (
          <Label accessibilityRole="alert" color="danger">
            {validation}
          </Label>
        ) : null}
        <Button
          title={
            mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create your account"
                : "Send recovery email"
          }
          busy={m.pending}
          onPress={submit}
        />
        {m.snapshot?.demoEnabled !== false ? (
          <Button
            title="Explore demo"
            variant="secondary"
            busy={m.pending}
            onPress={() => void m.run(() => m.data.auth("login", "", "", ""))}
          />
        ) : null}
      </View>
    </Shell>
  );
}
export function Recovery({
  tokenHash,
  type,
}: {
  tokenHash?: string;
  type?: string;
}) {
  const m = useMusic(),
    [password, setPassword] = useState(""),
    [validation, setValidation] = useState("");
  return (
    <Shell title={tokenHash ? "Verify your email" : "Set a new password"} back>
      <View style={ui.form}>
        {tokenHash ? (
          <>
            <Label>Continue with this one-time email link.</Label>
            <Button
              title="Verify email link"
              busy={m.pending}
              onPress={() =>
                void m
                  .run(async () => {
                    await m.data.verify(
                      tokenHash,
                      type === "recovery" ? "recovery" : "email",
                    );
                    return true;
                  })
                  .then((ok) => {
                    if (ok)
                      router.replace(
                        (type === "recovery" ? "/reset" : "/home") as never,
                      );
                  })
              }
            />
          </>
        ) : (
          <>
            <Input
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              error={validation}
            />
            <Button
              title="Save new password"
              busy={m.pending}
              onPress={() => {
                if (password.length < 10) {
                  setValidation("Use at least 10 characters.");
                  return;
                }
                void m
                  .run(async () => {
                    await m.data.updatePassword(password);
                    return true;
                  }, "Password updated")
                  .then((ok) => {
                    if (ok) {
                      setPassword("");
                      router.replace("/home");
                    }
                  });
              }}
            />
          </>
        )}
      </View>
    </Shell>
  );
}
