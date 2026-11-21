import { router } from "expo-router";
import { TasbihScreen } from "../src/components/ZikirMatik";

export default function TespihScreen() {
  return <TasbihScreen onClose={() => router.back()} />;
}
