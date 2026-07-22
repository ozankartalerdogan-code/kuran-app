/* eslint-disable @typescript-eslint/no-var-requires */

import {
  buildNativeImageShareOptions,
  getImageShareResult,
  type ImageSharePlatform,
} from "./ayahImageShare";

type CaptureRefFn = (
  ref: unknown,
  options?: {
    format?: "png" | "jpg";
    quality?: number;
    result?: "tmpfile" | "base64" | "data-uri";
  },
) => Promise<string>;

type ShareOpenResult = {
  success: boolean;
  dismissedAction?: boolean;
};

type ShareOpenFn = (options: {
  url: string;
  type: "image/png";
  title: string;
  message: string;
  failOnCancel: false;
  useInternalStorage?: true;
}) => Promise<ShareOpenResult>;

let captureRefImpl: CaptureRefFn | null = null;
let shareOpenImpl: ShareOpenFn | null = null;

try {
  const viewShot = require("react-native-view-shot") as {
    captureRef?: CaptureRefFn;
  };
  captureRefImpl = viewShot.captureRef ?? null;
} catch {
  captureRefImpl = null;
}

try {
  const sharing = require("react-native-share") as {
    default?: { open?: ShareOpenFn };
    open?: ShareOpenFn;
  };
  shareOpenImpl = sharing.default?.open ?? sharing.open ?? null;
} catch {
  shareOpenImpl = null;
}

export const isImageShareAvailable =
  captureRefImpl !== null && shareOpenImpl !== null;

export type ImageShareResult = "shared" | "cancelled" | "error";

function getImageSharePlatform(): ImageSharePlatform {
  const reactNative = require("react-native") as {
    Platform?: { OS?: string };
  };

  return reactNative.Platform?.OS === "ios" ? "ios" : "android";
}

export async function captureAndShareView(
  ref: unknown,
  content: { title: string; message: string },
): Promise<ImageShareResult> {
  if (!captureRefImpl || !shareOpenImpl) {
    return "error";
  }

  try {
    const uri = await captureRefImpl(ref, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
    const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
    const result = await shareOpenImpl(
      buildNativeImageShareOptions({
        fileUri,
        title: content.title,
        message: content.message,
        platform: getImageSharePlatform(),
      }),
    );

    return getImageShareResult(result);
  } catch {
    return "error";
  }
}
