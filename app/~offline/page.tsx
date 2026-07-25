import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
};

export default function Page() {
  return (
    <>
      <h1>You&apos;re offline</h1>
      <h2>
        This page is shown when a route can&apos;t be reached without a
        network connection.
      </h2>
    </>
  );
}
