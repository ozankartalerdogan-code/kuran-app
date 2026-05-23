import { Suspense } from "react";
import { DiscoverContent } from "./DiscoverContent";
import { DuaKategorileri } from "./DuaKategorileri";

export const metadata = { title: "Keşfet — KuranApp" };

export default function DiscoverPage() {
  return (
    <DiscoverContent
      duaBolumu={
        <Suspense fallback={null}>
          <DuaKategorileri />
        </Suspense>
      }
    />
  );
}
