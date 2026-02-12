import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asylguiden - Information för asylsökande i Sverige",
  description:
    "Din guide till information om asylprocessen, rättigheter och vardagsliv i Sverige",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
