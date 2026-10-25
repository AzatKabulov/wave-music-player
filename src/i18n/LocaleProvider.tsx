import { getLocales } from "expo-localization";
import { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { deviceStorage } from "../data/storage";
import { resolveLocale, translateMessage, type Locale } from "./locale";
import { messages } from "./messages";

type Choice = Locale | "system";
const LocaleContext = createContext({
  locale: "en" as Locale,
  choice: "system" as Choice,
  setChoice: (_choice: Choice) => {},
  tx: (message: string, _values?: Record<string, string | number>) => message,
});
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [choice, updateChoice] = useState<Choice>("system");
  const [device, setDevice] = useState<Locale>("en");
  useEffect(() => {
    let active = true;
    const readDevice = () =>
      setDevice(resolveLocale(getLocales()[0]?.languageCode));
    readDevice();
    void deviceStorage.getItem("musify.language").then((value) => {
      if (active && (value === "en" || value === "ru" || value === "tk"))
        updateChoice(value);
    });
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") readDevice();
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  const locale = choice === "system" ? device : choice;
  const setChoice = (next: Choice) => {
    updateChoice(next);
    void deviceStorage.setItem("musify.language", next).catch(() => {});
  };
  const tx = (message: string, values?: Record<string, string | number>) =>
    translateMessage(messages[locale], message, values);
  return (
    <LocaleContext.Provider value={{ locale, choice, setChoice, tx }}>
      {children}
    </LocaleContext.Provider>
  );
}
export const useLocale = () => useContext(LocaleContext);
