import getCurrentUser from "@/actions/getCurrentUser";
import TravelAssistantClient from "./TravelAssistantClient";

export const metadata = {
  title: "AI Travel Assistant | TRACAL",
  description: "Plan smart trip budgets, discover your AI travel personality, and explore local attractions with TRACAL.",
};

export default async function TravelAssistantPage() {
  const currentUser = await getCurrentUser();

  return <TravelAssistantClient currentUser={currentUser} />;
}

