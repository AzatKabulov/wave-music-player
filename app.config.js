const { isIPv4 } = require("node:net");

// LAN HTTP is limited to the personal build. Production retains HTTPS defaults.
// https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/
module.exports = ({ config }) => {
  const personal = process.env.EXPO_PUBLIC_PERSONAL_TEST === "1";
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
      ...(personal ? { package: "com.local.musifytest" } : {}),
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
