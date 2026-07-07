// Shim: gerçek kütüphanenin serbest fonksiyon imzalarını taklit eder — any bilinçli
// (unknown, tipli handler'ların atanmasını contravariance yüzünden reddeder).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

const identity = <T,>(value: T): T => value;
const noop = (): void => {};

export enum RuntimeKind {
  ReactNative = 'ReactNative',
  UI = 'UI',
  Worker = 'Worker',
  Worklet = 'Worklet',
}

export const UIRuntimeId = 0;
export const WorkletsModule = {};

export const callMicrotasks = noop;
export const createSerializable = identity;
export const createShareable = identity;
export const createSynchronizable = <T,>(value: T) => ({ value });
export const createWorkletRuntime = () => ({});
export const executeOnUIRuntimeSync = (handler: AnyFunction) => handler();
export const getDynamicFeatureFlag = () => false;
export const getRuntimeKind = () => RuntimeKind.ReactNative;
export const getStaticFeatureFlag = () => false;
export const getUIRuntimeHolder = () => ({});
export const getUISchedulerHolder = () => ({});
export const isRNRuntime = () => true;
export const isSerializableRef = () => false;
export const isShareable = () => false;
export const isShareableRef = () => false;
export const isSynchronizable = () => false;
export const isUIRuntime = () => false;
export const isWorkerRuntime = () => false;
export const isWorkletFunction = () => false;
export const isWorkletRuntime = () => false;
export const makeShareable = identity;
export const makeShareableCloneOnUIRecursive = identity;
export const makeShareableCloneRecursive = identity;
export const registerCustomSerializable = noop;
export const runOnJS = (handler: AnyFunction) => handler;
export const runOnRuntime = (_runtime: unknown, handler: AnyFunction) => handler;
export const runOnRuntimeAsync = (_runtime: unknown, handler: AnyFunction) => Promise.resolve(handler());
export const runOnRuntimeSync = (_runtime: unknown, handler: AnyFunction) => handler();
export const runOnRuntimeSyncWithId = (_runtimeId: unknown, handler: AnyFunction) => handler();
export const runOnUI = (handler: AnyFunction) => handler;
export const runOnUIAsync = (handler: AnyFunction) => Promise.resolve(handler());
export const runOnUISync = (handler: AnyFunction) => handler();
export const scheduleOnRN = (handler: AnyFunction) => handler();
export const scheduleOnRuntime = (_runtime: unknown, handler: AnyFunction) => handler();
export const scheduleOnRuntimeWithId = (_runtimeId: unknown, handler: AnyFunction) => handler();
export const scheduleOnUI = (handler: AnyFunction) => handler();
export const setDynamicFeatureFlag = noop;
export const shareableMappingCache = new WeakMap<object, unknown>();
export const serializableMappingCache = new WeakMap<object, unknown>();
