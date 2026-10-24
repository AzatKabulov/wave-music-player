import * as SecureStore from "expo-secure-store";
export const credentials = {
  async read() {
    const value = await SecureStore.getItemAsync("saz.credentials");
    return value
      ? (JSON.parse(value) as { accessToken: string; refreshToken?: string })
      : null;
  },
  async write(value: { accessToken: string; refreshToken?: string } | null) {
    if (value)
      await SecureStore.setItemAsync("saz.credentials", JSON.stringify(value));
    else await SecureStore.deleteItemAsync("saz.credentials");
  },
};
