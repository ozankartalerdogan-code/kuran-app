import { Animated, Easing as NativeEasing } from 'react-native';

type AnyFunction = (...args: any[]) => any;
type SharedValue<T> = { value: T };

const identity = <T,>(value: T): T => value;
const noop = (): void => {};

function immediateAnimation<T>(toValue: T): T {
  return toValue;
}

function makeSharedValue<T>(initialValue: T): SharedValue<T> {
  return { value: initialValue };
}

function makeNoopBuilder() {
  const builder = {
    delay: () => builder,
    duration: () => builder,
    easing: () => builder,
    springify: () => builder,
    damping: () => builder,
    mass: () => builder,
    stiffness: () => builder,
    overshootClamping: () => builder,
    restDisplacementThreshold: () => builder,
    restSpeedThreshold: () => builder,
    withCallback: () => builder,
    randomDelay: () => builder,
  };

  return builder;
}

export const Easing = NativeEasing;
export const Extrapolate = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const Extrapolation = Extrapolate;
export const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
export const SensorType = {};
export const KeyboardState = {};
export const InterfaceOrientation = {};
export const IOSReferenceFrame = {};
export const ReanimatedLogLevel = {};

export const createAnimatedComponent = Animated.createAnimatedComponent;
export const useSharedValue = makeSharedValue;
export const makeMutable = makeSharedValue;
export const useDerivedValue = (updater: AnyFunction) => makeSharedValue(updater());
export const useAnimatedStyle = (updater: AnyFunction) => updater();
export const useAnimatedProps = (updater: AnyFunction) => updater();
export const useAnimatedRef = () => ({ current: null });
export const useAnimatedReaction = noop;
export const useAnimatedKeyboard = () => ({ height: makeSharedValue(0), state: makeSharedValue(0) });
export const useAnimatedSensor = () => ({ sensor: makeSharedValue({}) });
export const useAnimatedScrollHandler = (handler: unknown) => handler;
export const useComposedEventHandler = (handler: unknown) => handler;
export const useEvent = (handler: unknown) => handler;
export const useFrameCallback = noop;
export const useHandler = () => ({ context: {}, doDependenciesDiffer: false });
export const useReducedMotion = () => false;
export const useScrollOffset = () => makeSharedValue(0);
export const useScrollViewOffset = useScrollOffset;
export const useInterpolateConfig = () => ({});

export const withTiming = immediateAnimation;
export const withSpring = immediateAnimation;
export const withDecay = immediateAnimation;
export const withDelay = (_delayMs: number, animation: unknown) => animation;
export const withRepeat = (animation: unknown) => animation;
export const withSequence = (...animations: unknown[]) => animations[animations.length - 1];
export const withClamp = (_config: unknown, animation: unknown) => animation;
export const cancelAnimation = noop;
export const defineAnimation = (_starting: unknown, factory: AnyFunction) => factory();

export const runOnJS = (handler: AnyFunction) => handler;
export const runOnUI = (handler: AnyFunction) => handler;
export const runOnRuntime = (_runtime: unknown, handler: AnyFunction) => handler;
export const executeOnUIRuntimeSync = (handler: AnyFunction) => handler();
export const createWorkletRuntime = () => ({});
export const isWorkletFunction = () => false;
export const makeShareableCloneRecursive = identity;

export const interpolate = (
  value: number,
  inputRange: number[],
  outputRange: number[],
): number => {
  if (inputRange.length < 2 || outputRange.length < 2) return outputRange[0] ?? value;
  const inputMin = inputRange[0];
  const inputMax = inputRange[inputRange.length - 1];
  const outputMin = outputRange[0];
  const outputMax = outputRange[outputRange.length - 1];
  if (inputMax === inputMin) return outputMin;
  const progress = (value - inputMin) / (inputMax - inputMin);
  return outputMin + progress * (outputMax - outputMin);
};

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
export const interpolateColor = (_value: number, _inputRange: number[], outputRange: string[]) => outputRange[0];
export const convertToRGBA = (color: string) => color;
export const isColor = (value: unknown) => typeof value === 'string';

export const dispatchCommand = noop;
export const getRelativeCoords = () => ({ x: 0, y: 0 });
export const getViewProp = () => undefined;
export const measure = () => null;
export const scrollTo = noop;
export const setGestureState = noop;
export const setNativeProps = noop;
export const enableLayoutAnimations = noop;
export const configureReanimatedLogger = noop;
export const isConfigured = () => false;
export const isReanimated3 = () => false;
export const startMapper = () => 0;
export const stopMapper = noop;
export const createAnimatedPropAdapter = identity;
export const getAnimatedStyle = () => ({});
export const setUpTests = noop;
export const withReanimatedTimer = (callback: AnyFunction) => callback();
export const advanceAnimationByFrame = noop;
export const advanceAnimationByTime = noop;
export const getUseOfValueInStyleWarning = () => '';
export const reanimatedVersion = 'shim';

export const ScreenTransition = {};
export const startScreenTransition = noop;
export const finishScreenTransition = noop;

export const BaseAnimationBuilder = makeNoopBuilder;
export const ComplexAnimationBuilder = makeNoopBuilder;
export const Keyframe = makeNoopBuilder;
export const FadeIn = makeNoopBuilder();
export const FadeInDown = makeNoopBuilder();
export const FadeInLeft = makeNoopBuilder();
export const FadeInRight = makeNoopBuilder();
export const FadeInUp = makeNoopBuilder();
export const FadeOut = makeNoopBuilder();
export const FadeOutDown = makeNoopBuilder();
export const FadeOutLeft = makeNoopBuilder();
export const FadeOutRight = makeNoopBuilder();
export const FadeOutUp = makeNoopBuilder();
export const SlideInDown = makeNoopBuilder();
export const SlideInLeft = makeNoopBuilder();
export const SlideInRight = makeNoopBuilder();
export const SlideInUp = makeNoopBuilder();
export const SlideOutDown = makeNoopBuilder();
export const SlideOutLeft = makeNoopBuilder();
export const SlideOutRight = makeNoopBuilder();
export const SlideOutUp = makeNoopBuilder();
export const Layout = makeNoopBuilder();
export const LinearTransition = makeNoopBuilder();
export const SequencedTransition = makeNoopBuilder();
export const CurvedTransition = makeNoopBuilder();
export const EntryExitTransition = makeNoopBuilder();
export const FadingTransition = makeNoopBuilder();

export default Animated;
