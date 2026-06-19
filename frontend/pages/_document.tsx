import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head />
      <body className="antialiased bg-zinc-950 text-zinc-100">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
