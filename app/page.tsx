import { MarketsPage } from "./components/MarketsPage";
import { getInitialMarkets } from "./lib/server/markets";

export default async function Home() {
  const initialMarkets = await getInitialMarkets();
  return <MarketsPage initialMarkets={initialMarkets} />;
}
