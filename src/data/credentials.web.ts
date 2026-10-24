// Web authentication is carried only by server-set httpOnly cookies.
export const credentials = {
  async read(): Promise<{ accessToken: string; refreshToken?: string } | null> {
    return null;
  },
  async write(_value: { accessToken: string; refreshToken?: string } | null) {},
};
