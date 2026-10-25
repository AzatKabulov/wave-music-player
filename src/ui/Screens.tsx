import { useLocalSearchParams, usePathname, useIsFocused } from "expo-router";
import { View, Platform } from "react-native";
import { useMusic } from "../data/MusicProvider";
import type { Track } from "../data/types";
import { Skeleton, StateView } from "../design/Primitives";
import { theme as t } from "../design/theme";
import { Shell, go, ui } from "./Shell";

import { Auth, Recovery } from "./screens/Auth";
import { Collection } from "./screens/Collection";
import { Home } from "./screens/Home";
import { LibraryScreen } from "./screens/Library";
import { Actions, QueueScreen } from "./screens/Playback";
import { Player } from "./player/NowPlaying";
import { PlaylistForm } from "./screens/PlaylistForm";
import { SearchScreen } from "./screens/Search";
import { Settings } from "./screens/Settings";
import { MusicList } from "./MusicList";
function Screens({ screen }: { screen?: string } = {}) {
  const path = usePathname(),
    parts = path.split("/").filter(Boolean),
    m = useMusic(),
    params = useLocalSearchParams<{
      id?: string;
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
  const [screenName, id] = screen ? [screen, params.id || ""] : parts;
  if (screenName === "home") return <Home />;
  if (screenName === "search") return <SearchScreen />;
  if (screenName === "library") return <LibraryScreen />;
  if (screenName === "liked")
    return (
      <Shell title="Liked tracks" back scroll={false}>
        <MusicList
          tracks={m.snapshot.library.tracks
            .map((id) => m.snapshot!.catalog.tracks.find((t) => t.id === id))
            .filter((x): x is Track => !!x)}
        />
      </Shell>
    );
  if (screenName === "recents")
    return (
      <Shell title="Recently played" back scroll={false}>
        <MusicList
          tracks={m.snapshot.recents
            .map((id) => m.snapshot!.catalog.tracks.find((t) => t.id === id))
            .filter((x): x is Track => !!x)}
        />
      </Shell>
    );
  if (
    screenName === "album" ||
    screenName === "artist" ||
    screenName === "playlist"
  )
    return <Collection key={id} type={screenName} id={id} />;
  if (screenName === "player") return <Player />;
  if (screenName === "queue") return <QueueScreen />;
  if (screenName === "actions" || screenName === "add")
    return <Actions id={id} picker={screenName === "add"} />;
  if (screenName === "create" || screenName === "edit")
    return (
      <PlaylistForm
        key={id || "new"}
        id={screenName === "edit" ? id : undefined}
        trackId={params.track}
      />
    );
  if (screenName === "settings") return <Settings />;
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

export default function RouteScreen(props: { screen?: string }) {
  const focused = useIsFocused();
  return (
    <View
      style={{
        flex: 1,
        display: Platform.OS === "web" && !focused ? "none" : "flex",
      }}
    >
      <Screens {...props} />
    </View>
  );
}
