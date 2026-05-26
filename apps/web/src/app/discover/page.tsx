import { Suspense } from "react";
import { DiscoverContent } from "./DiscoverContent";
import { DuaKategorileri } from "./DuaKategorileri";
import { NamazKategorileri } from "../namaz/NamazKategorileri";
import { NamazVakitTablosu } from "../namaz/NamazVakitTablosu";

export const metadata = { title: "Keşfet — KuranApp" };

export default function DiscoverPage() {
  return (
    <DiscoverContent
      duaBolumu={
        <Suspense fallback={null}>
          <DuaKategorileri />
        </Suspense>
      }
      namazBolumu={
        <>
          <Suspense fallback={null}>
            <NamazVakitTablosu />
          </Suspense>
          <Suspense fallback={null}>
            <NamazKategorileri />
          </Suspense>
        </>
      }
    />
  );
}
