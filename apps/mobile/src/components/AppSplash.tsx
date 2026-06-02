import React, { useRef, useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";

const { width, height } = Dimensions.get("window");

interface AppSplashProps {
  onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const videoRef = useRef<Video>(null);

  const handleStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      onFinish();
    }
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require("../../assets/splash.mp4")}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handleStatus}
        isMuted={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
    backgroundColor: "#0a1628",
  },
  video: {
    width,
    height,
  },
});
