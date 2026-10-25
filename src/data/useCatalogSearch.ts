import { useEffect, useRef, useState } from "react";
import { useMusic } from "./MusicProvider";
import type { SearchKind, SearchPage } from "./types";

export function useCatalogSearch(query: string, kind: SearchKind) {
  const { search, snapshot } = useMusic();
  const owner = snapshot?.profile?.id;
  const key = `${owner}:${query}:${kind}`;
  const [state, setState] = useState<{
    key: string;
    page?: SearchPage;
    busy: boolean;
    error: string;
  }>({ key: "", busy: false, error: "" });
  const [retry, setRetry] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const morePending = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    morePending.current = false;
    if (!query) return () => abort.abort();
    const timer = setTimeout(() => {
      setState({ key, busy: true, error: "" });
      void search(query, kind, abort.signal)
        .then((page) => {
          if (!abort.signal.aborted)
            setState({ key, page, busy: false, error: "" });
        })
        .catch((error) => {
          if (!abort.signal.aborted)
            setState({
              key,
              busy: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Search could not load. Try again.",
            });
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, kind, owner, key, search, retry]);
  const current =
    state.key === key
      ? state
      : { key, busy: !!query, error: "", page: undefined };
  const loadMore = async () => {
    const abort = controller.current;
    const cursor = current.page?.nextCursor;
    if (!cursor || !abort || abort.signal.aborted || morePending.current)
      return;
    morePending.current = true;
    setState((previous) => ({ ...previous, busy: true, error: "" }));
    try {
      const next = await search(query, kind, abort.signal, cursor);
      if (!abort.signal.aborted)
        setState((previous) => {
          if (previous.key !== key || !previous.page) return previous;
          const seen = new Set(
            previous.page.data.map(
              (result) => `${result.kind}:${result.item.id}`,
            ),
          );
          return {
            key,
            busy: false,
            error: "",
            page: {
              ...next,
              data: [
                ...previous.page.data,
                ...next.data.filter(
                  (result) => !seen.has(`${result.kind}:${result.item.id}`),
                ),
              ],
            },
          };
        });
    } catch (error) {
      if (!abort.signal.aborted)
        setState((previous) => ({
          ...previous,
          busy: false,
          error:
            error instanceof Error
              ? error.message
              : "Search could not load. Try again.",
        }));
    } finally {
      if (controller.current === abort) morePending.current = false;
    }
  };
  return { ...current, loadMore, retry: () => setRetry((value) => value + 1) };
}
