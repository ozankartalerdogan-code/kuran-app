import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcTiltFromRotation, calcTiltFromAccel, calcMagneticMagnitude,
  createWarningState, stepTilt, stepMagnetic, stepAccuracy,
  setLocationStale, selectActiveWarning, isSensorUnreliable,
} from "./qiblaWarnings.ts";
import type { QiblaWarningState } from "./qiblaWarnings.ts";

const active = (state: QiblaWarningState) => selectActiveWarning(state, true);
const tilted = () => stepTilt(stepTilt(createWarningState(), 55, 0), 55, 800);
const magnetic = () => stepMagnetic(stepMagnetic(createWarningState(), 80, 0), 80, 1500);
const inaccurate = () => stepAccuracy(stepAccuracy(createWarningState(), 1, 0), 1, 1500);

test("rotation: flat, vertical, face down and combined tilt", () => {
  assert.equal(calcTiltFromRotation(0, 0), 0);
  assert.equal(calcTiltFromRotation(Math.PI / 2, 0), 90);
  assert.equal(calcTiltFromRotation(Math.PI, 0), 180);
  assert.ok(Math.abs(calcTiltFromRotation(Math.PI / 4, Math.PI / 4)! - 60) < 1e-10);
});

test("acceleration: Android and negative iOS z are flat; vertical is 90 degrees", () => {
  assert.equal(calcTiltFromAccel(0, 0, 1), 0);
  assert.equal(calcTiltFromAccel(0, 0, -1), 0);
  assert.equal(calcTiltFromAccel(1, 0, 0), 90);
  assert.ok(Math.abs(calcTiltFromAccel(0, Math.SQRT1_2, -Math.SQRT1_2)! - 45) < 1e-10);
});

test("acceleration: shaking and free fall are ignored, norm endpoints accepted", () => {
  for (const z of [0, 0.499, 1.501, -2]) assert.equal(calcTiltFromAccel(0, 0, z), null);
  for (const z of [0.5, 1.5, -0.5, -1.5]) assert.equal(calcTiltFromAccel(0, 0, z), 0);
});

test("magnetic magnitude uses all axes and accepts zero", () => {
  assert.equal(calcMagneticMagnitude(3, -4, 12), 13);
  assert.equal(calcMagneticMagnitude(0, 0, 0), 0);
  assert.equal(calcMagneticMagnitude(Number.MAX_VALUE, Number.MAX_VALUE, 0), null);
});

test("calculation helpers reject nonfinite values in every axis", () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.equal(calcTiltFromRotation(bad, 0), null);
    assert.equal(calcTiltFromRotation(0, bad), null);
    for (const axes of [[bad, 0, 1], [0, bad, 1], [0, 0, bad]]) {
      const [x, y, z] = axes;
      assert.equal(calcTiltFromAccel(x, y, z), null);
      assert.equal(calcMagneticMagnitude(x, y, z), null);
    }
  }
});

test("initial state has no warning", () => {
  assert.equal(active(createWarningState()), null);
});

for (const [degrees, delay] of [[55, 800], [74.999, 800], [75, 250], [90, 250]]) {
  test(`tilt ${degrees}: enters exactly after ${delay} ms`, () => {
    let state = stepTilt(createWarningState(), degrees, 0);
    state = stepTilt(state, degrees, delay - 1);
    assert.equal(active(state), null);
    assert.equal(active(stepTilt(state, degrees, delay)), "tilted");
  });
}

test("tilt below entry threshold never enters", () => {
  const state = stepTilt(createWarningState(), 54.999, 0);
  assert.equal(active(stepTilt(state, 54.999, 10000)), null);
});

test("tilt broken entry resets timer", () => {
  let state = stepTilt(createWarningState(), 55, 0);
  state = stepTilt(state, 54, 799);
  state = stepTilt(state, 55, 800);
  assert.equal(active(stepTilt(state, 55, 1599)), null);
  assert.equal(active(stepTilt(state, 55, 1600)), "tilted");
});

test("fast tilt resets independently while normal tilt remains continuous", () => {
  let state = stepTilt(createWarningState(), 75, 0);
  state = stepTilt(state, 60, 249);
  state = stepTilt(state, 75, 300);
  assert.equal(active(stepTilt(state, 75, 549)), null);
  assert.equal(active(stepTilt(state, 75, 550)), "tilted");
  state = stepTilt(createWarningState(), 60, 0);
  state = stepTilt(state, 75, 700);
  assert.equal(active(stepTilt(state, 60, 800)), "tilted");
});

test("tilt dead band preserves active state; exit requires uninterrupted 600 ms", () => {
  let state = stepTilt(tilted(), 50, 1000);
  assert.equal(active(stepTilt(state, 50, 5000)), "tilted");
  state = stepTilt(state, 45, 5000);
  assert.equal(active(stepTilt(state, 45, 5599)), "tilted");
  state = stepTilt(state, 45.001, 5599);
  state = stepTilt(state, 45, 5600);
  assert.equal(active(stepTilt(state, 45, 6199)), "tilted");
  assert.equal(active(stepTilt(state, 45, 6200)), null);
});

for (const field of [19.999, 75.001]) {
  test(`magnetic ${field}: enters only after 1500 ms`, () => {
    const state = stepMagnetic(createWarningState(), field, 100);
    assert.equal(active(stepMagnetic(state, field, 1599)), null);
    assert.equal(active(stepMagnetic(state, field, 1600)), "magnetic_interference");
  });
}

test("magnetic entry bounds and dead bands do not trigger", () => {
  for (const field of [20, 22, 24, 45, 70, 73, 75]) {
    const state = stepMagnetic(createWarningState(), field, 0);
    assert.equal(active(stepMagnetic(state, field, 10000)), null);
  }
});

test("magnetic broken entry resets timer, even in dead band", () => {
  let state = stepMagnetic(createWarningState(), 19, 0);
  state = stepMagnetic(state, 22, 1499);
  state = stepMagnetic(state, 80, 1500);
  assert.equal(active(stepMagnetic(state, 80, 2999)), null);
  assert.equal(active(stepMagnetic(state, 80, 3000)), "magnetic_interference");
});

for (const safeField of [24, 70]) {
  test(`magnetic exit at ${safeField}: safe bounds inclusive, dead band resets exit`, () => {
    let state = magnetic();
    for (const field of [20, 23.999, 70.001, 75]) {
      state = stepMagnetic(state, field, 2000);
      assert.equal(active(stepMagnetic(state, field, 10000)), "magnetic_interference");
    }
    state = stepMagnetic(state, safeField, 10000);
    assert.equal(active(stepMagnetic(state, safeField, 11999)), "magnetic_interference");
    state = stepMagnetic(state, 23, 11999);
    state = stepMagnetic(state, safeField, 12000);
    assert.equal(active(stepMagnetic(state, safeField, 13999)), "magnetic_interference");
    assert.equal(active(stepMagnetic(state, safeField, 14000)), null);
  });
}

for (const [accuracy, delay] of [[-1, 1200], [0, 1200], [1, 1500]]) {
  test(`accuracy ${accuracy}: enters exactly after ${delay} ms`, () => {
    const state = stepAccuracy(createWarningState(), accuracy, 0);
    assert.equal(active(stepAccuracy(state, accuracy, delay - 1)), null);
    assert.equal(active(stepAccuracy(state, accuracy, delay)), "low_accuracy");
  });
}

for (const accuracy of [2, 3]) {
  test(`accuracy ${accuracy}: no entry and exits only after continuous 1500 ms`, () => {
    const initial = stepAccuracy(createWarningState(), accuracy, 0);
    assert.equal(active(stepAccuracy(initial, accuracy, 10000)), null);
    let state = stepAccuracy(inaccurate(), accuracy, 2000);
    assert.equal(active(stepAccuracy(state, accuracy, 3499)), "low_accuracy");
    state = stepAccuracy(state, 1, 3499);
    state = stepAccuracy(state, accuracy, 3500);
    assert.equal(active(stepAccuracy(state, accuracy, 4999)), "low_accuracy");
    assert.equal(active(stepAccuracy(state, accuracy, 5000)), null);
  });
}

test("accuracy 0/1/2/3 transitions maintain independent entry timers", () => {
  let state = stepAccuracy(createWarningState(), 0, 0);
  state = stepAccuracy(state, 1, 1199);
  assert.equal(active(stepAccuracy(state, 1, 1200)), null);
  assert.equal(active(stepAccuracy(state, 1, 1500)), "low_accuracy");
  state = stepAccuracy(state, 2, 1300);
  state = stepAccuracy(state, 0, 1400);
  assert.equal(active(stepAccuracy(state, 0, 2599)), null);
  state = stepAccuracy(state, 0, 2600);
  assert.equal(active(state), "low_accuracy");
  state = stepAccuracy(state, 2, 2700);
  state = stepAccuracy(state, 3, 3000);
  assert.equal(active(stepAccuracy(state, 3, 4199)), "low_accuracy");
  assert.equal(active(stepAccuracy(state, 3, 4200)), null);
});

test("invalid samples leave all sensor states and pending timers unchanged", () => {
  const scenarios = [
    [stepTilt, stepTilt(createWarningState(), 55, 0), 55, 800],
    [stepMagnetic, stepMagnetic(createWarningState(), 80, 0), 80, 1500],
    [stepAccuracy, stepAccuracy(createWarningState(), 0, 0), 0, 1200],
  ] as const;
  for (const [step, state, value, delay] of scenarios) {
    for (const invalid of [null, NaN, Infinity, -Infinity]) {
      assert.equal(step(state, invalid, 100), state);
    }
    assert.notEqual(active(step(state, value, delay)), null);
  }
  assert.equal(stepTilt(createWarningState(), calcTiltFromAccel(0, 0, 2), 0).tilt.active, false);
});

test("priority falls through tilt, magnetic, accuracy, stale, then none", () => {
  let state = setLocationStale(createWarningState(), true);
  state = stepAccuracy(stepAccuracy(state, 0, 0), 0, 1200);
  state = stepMagnetic(stepMagnetic(state, 80, 0), 80, 1500);
  state = stepTilt(stepTilt(state, 75, 0), 75, 250);
  assert.equal(active(state), "tilted");
  state = stepTilt(stepTilt(state, 0, 2000), 0, 2600);
  assert.equal(active(state), "magnetic_interference");
  state = stepMagnetic(stepMagnetic(state, 45, 3000), 45, 5000);
  assert.equal(active(state), "low_accuracy");
  state = stepAccuracy(stepAccuracy(state, 3, 6000), 3, 7500);
  assert.equal(active(state), "stale_location");
  assert.equal(active(setLocationStale(state, false)), null);
});

test("without compass only stale location can be selected", () => {
  for (const state of [createWarningState(), tilted(), magnetic(), inaccurate()]) {
    assert.equal(selectActiveWarning(state, false), null);
    assert.equal(selectActiveWarning(setLocationStale(state, true), false), "stale_location");
  }
});

test("only sensor warnings pause alignment", () => {
  for (const kind of ["tilted", "magnetic_interference", "low_accuracy"] as const) {
    assert.equal(isSensorUnreliable(kind), true);
  }
  assert.equal(isSensorUnreliable("stale_location"), false);
  assert.equal(isSensorUnreliable(null), false);
});

test("transitions are deterministic and do not mutate frozen input", () => {
  const state = createWarningState();
  Object.freeze(state.tilt);
  Object.freeze(state.magnetic);
  Object.freeze(state.accuracy);
  Object.freeze(state);
  const before = structuredClone(state);
  for (const step of [stepTilt, stepMagnetic, stepAccuracy]) {
    const next = step(state, 0, 100);
    assert.notEqual(next, state);
    assert.deepEqual(next, step(state, 0, 100));
  }
  assert.equal(active(setLocationStale(state, true)), "stale_location");
  assert.deepEqual(state, before);
  const other = createWarningState();
  assert.notEqual(other.tilt, state.tilt);
  assert.notEqual(other.magnetic, state.magnetic);
  assert.notEqual(other.accuracy, state.accuracy);
});
