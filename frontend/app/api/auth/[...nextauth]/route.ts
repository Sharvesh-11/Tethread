import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
  console.log("=== signIn fired ===", user.email);
  try {
    const res = await fetch("http://localhost:8000/api/v1/auth/google-jwt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        full_name: user.name,
        google_id: account?.providerAccountId,
      }),
    });
    const data = await res.json();
    console.log("=== backend response ===", data);
    if (data.access_token) {
      (user as any).jwt = data.access_token;
      (user as any).is_admin = data.is_admin; // ← THIS WAS MISSING
      console.log("=== JWT attached to user, is_admin:", data.is_admin);
    }
  } catch (e) {
    console.error("=== backend call failed ===", e);
  }
  return true;
},
    async jwt({ token, user }) {
      console.log("=== jwt callback ===", { hasUser: !!user, userJwt: (user as any)?.jwt });
      if (user) {
        token.id = user.id;
        token.jwt = (user as any).jwt;
        token.is_admin = (user as any).is_admin;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("=== session callback ===", { tokenJwt: token.jwt });
      (session.user as any).jwt = token.jwt;
      (session.user as any).is_admin = token.is_admin;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };