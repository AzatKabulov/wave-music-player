import { useLocalSearchParams, usePathname } from "expo-router";
import { View } from "react-native";
import { useMusic } from "../data/MusicProvider";
import type { Track } from "../data/types";
import { Skeleton, StateView } from "../design/Primitives";
import { theme as t } from "../design/theme";
import { Shell, go, ui } from "./Shell";

import { Auth, Recovery } from "./screens/Auth";
import { Collection } from "./screens/Collection";
import { Home } from "./screens/Home";
import { LibraryScreen } from "./screens/Library";
import { Actions, Player, QueueScreen } from "./screens/Playback";
import { PlaylistForm } from "./screens/PlaylistForm";
import { SearchScreen } from "./screens/Search";
import { Settings } from "./screens/Settings";
import { Tracks } from "./screens/common";
export default function Screens() {
  const path = usePathname(),
    parts = path.split("/").filter(Boolean),
    m = useMusic(),
    params = useLocalSearchParams<{
      track?: string;
      token_hash?: string;
      type?: string;
    }>();
  if (m.loading)
    return (
      <Shell title="Opening your space">
        <View style={ui.section}>
          <Skeleton height={t.space[240]} />
          <Skeleton />
          <Skeleton />
        </View>
      </Shell>
    );
  if (!m.snapshot)
    return (
      <Shell title="Connection unavailable">
        <StateView
          title="Your music is a little out of reach"
          message="Check your connection, then try again."
          action="Retry"
          onAction={() => void m.run(m.refresh)}
        />
      </Shell>
    );
  if (parts[0] === "callback" || parts[0] === "reset")
    return <Recovery tokenHash={params.token_hash} type={params.type} />;
  if (!m.snapshot.profile) return <Auth />;
  const [screen, id] = parts;
  if (screen === "home") return <Home />;
  if (screen === "search") return <SearchScreen />;
  if (screen === "library") return <LibraryScreen />;
  if (screen === "liked")
    return (
      <Shell title="Liked tracks" back>
        <Tracks
          tracks={m.snapshot.library.tracks
            .map((id) => m.snapshot!.catalog.tracks.find((t) => t.id === id))
            .filter((x): x is Track => !!x)}
        />
      </Shell>
    );
  if (screen === "recents")
    return (
      <Shell title="Recently played" back>
        <Tracks
          tracks={m.snapshot.recents
            .map((id) => m.snapshot!.catalog.tracks.find((t) => t.id === id))
            .filter((x): x is Track => !!x)}
        />
      </Shell>
    );
  if (screen === "album" || screen === "artist" || screen === "playlist")
    return <Collection key={id} type={screen} id={id} />;
  if (screen === "player") return <Player />;
  if (screen === "queue") return <QueueScreen />;
  if (screen === "actions" || screen === "add")
    return <Actions id={id} picker={screen === "add"} />;
  if (screen === "create" || screen === "edit")
    return (
      <PlaylistForm
        key={id || "new"}
        id={screen === "edit" ? id : undefined}
        trackId={params.track}
      />
    );
  if (screen === "settings") return <Settings />;
  return (
    <Shell title="Page unavailable" back>
      <StateView
        title="Find your way back"
        message="This page is not part of your listening space."
        action="Home"
        onAction={() => go("/home")}
      />
    </Shell>
  );
}
