"use client";

import dynamicImport from "next/dynamic";

export const NoteEditor = dynamicImport(
  () => import("./NoteEditor").then((module) => module.NoteEditor),
  { ssr: false },
);

export const StreakTracker = dynamicImport(
  () => import("./StreakTracker").then((module) => module.StreakTracker),
  { ssr: false },
);
