const { isIPv4, isIP } = require("node:net");

// LAN HTTP is limited to the personal build. Production retains HTTPS defaults.
// https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/
module.exports = ({ config }) => {
  const personal = process.env.EXPO_PUBLIC_PERSONAL_TEST === "1";
  const online = process.env.EXPO_PUBLIC_ONLINE_TEST === "1";
  if (online && personal)
    throw Error("Online and LAN testing cannot be combined.");
  if (online) {
    let url;
    try {
      url = new URL(process.env.EXPO_PUBLIC_API_URL);
    } catch {
      /* validated below */
    }
    if (
      !url ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      isIP(url.hostname.replace(/[\[\]]/g, "")) ||
      !url.hostname.includes(".") ||
      /\.(local|localhost|internal|test|invalid)$/.test(url.hostname)
    )
      throw Error(
        "Online testing requires a public HTTPS API origin without credentials or query parameters.",
      );
  }
  if (personal) {
    const url = new URL(process.env.EXPO_PUBLIC_API_URL);
    const [a, b] = url.hostname.split(".").map(Number);
    if (
      url.protocol !== "http:" ||
      !isIPv4(url.hostname) ||
      !(
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      )
    )
      throw Error("Personal test builds require a private IPv4 API URL.");
  }
  return {
    ...config,
    android: {
      ...config.android,
      ...(personal || online ? { package: "com.local.musifytest" } : {}),
    },
    plugins: [
      ...config.plugins.filter(
        (p) => (Array.isArray(p) ? p[0] : p) !== "expo-build-properties",
      ),
      [
        "expo-build-properties",
        { android: { usesCleartextTraffic: personal } },
      ],
    ],
  };
};
