import { useEffect, useMemo, useState } from "react";
import { createStoredChoice } from "../data/storedChoice";
import { deviceStorage } from "../data/storage";

export const libraryFilters = [
  "All",
  "Playlists",
  "Albums",
  "Artists",
] as const;
type Filter = (typeof libraryFilters)[number];
type ViewState = { owner: string; grid: boolean; filter: Filter };
const defaults = (owner: string): ViewState => ({
  owner,
  grid: false,
  filter: "All",
});

export function useLibraryView(owner: string) {
  const [selection, setSelection] = useState(() => defaults(owner));
  const choices = useMemo(() => {
    const publish = (update: Partial<ViewState>) =>
      setSelection((previous) => ({
        ...(previous.owner === owner ? previous : defaults(owner)),
        ...update,
      }));
    return {
      grid: createStoredChoice<boolean>({
        storage: deviceStorage,
        key: `musify.library.grid.${owner}`,
        fallback: false,
        parse: (raw) => (raw === "1" ? true : raw === "0" ? false : undefined),
        encode: (value) => (value ? "1" : "0"),
        onValue: (grid) => publish({ grid }),
      }),
      filter: createStoredChoice<Filter>({
        storage: deviceStorage,
        key: `musify.library.filter.${owner}`,
        fallback: "All",
        parse: (raw) => libraryFilters.find((value) => value === raw),
        encode: String,
        onValue: (filter) => publish({ filter }),
      }),
    };
  }, [owner]);
  useEffect(() => {
    void choices.grid.load();
    void choices.filter.load();
    return () => {
      choices.grid.dispose();
      choices.filter.dispose();
    };
  }, [choices]);
  const view = selection.owner === owner ? selection : defaults(owner);
  return {
    grid: view.grid,
    filter: view.filter,
    setGrid: choices.grid.choose,
    setFilter: choices.filter.choose,
  };
}
