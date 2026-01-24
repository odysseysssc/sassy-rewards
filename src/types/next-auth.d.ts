import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email?: string;
    dripAccountId?: string;
    wallet?: string;
    authType?: string;
    discordId?: string;
  }

  interface Session {
    user: {
      id: string;
      email?: string;
      dripAccountId?: string;
      wallet?: string;
      authType?: string;
      discordId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    email?: string;
    dripAccountId?: string;
    wallet?: string;
    authType?: string;
    discordId?: string;
  }
}
