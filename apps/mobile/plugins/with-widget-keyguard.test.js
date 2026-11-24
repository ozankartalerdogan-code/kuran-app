const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setKeyguardCategory } = require('./with-widget-keyguard');

const SAMPLE_WIDGET_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="50dp"
    android:targetCellWidth="4"
    android:targetCellHeight="1"

    android:resizeMode="horizontal"

    android:description="@string/widget_namazserit_description"

    android:initialLayout="@layout/rn_widget"
    android:previewImage="@drawable/namazserit_preview"

    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen">
</appwidget-provider>
`;

describe('setKeyguardCategory', () => {
  it('home_screen değerini home_screen|keyguard yapar', () => {
    const result = setKeyguardCategory(SAMPLE_WIDGET_XML);
    assert.match(result, /android:widgetCategory="home_screen\|keyguard">/);
    assert.doesNotMatch(result, /android:widgetCategory="home_screen">/);
  });

  it('idempotent: ikinci çağrı aynı sonucu verir', () => {
    const once = setKeyguardCategory(SAMPLE_WIDGET_XML);
    const twice = setKeyguardCategory(once);
    assert.equal(twice, once);
  });

  it('widgetCategory olmayan XML içeriğini değiştirmez', () => {
    const withoutCategory = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="50dp"
    android:initialLayout="@layout/rn_widget"
    android:updatePeriodMillis="1800000">
</appwidget-provider>
`;
    assert.equal(setKeyguardCategory(withoutCategory), withoutCategory);
  });

  it('diğer öznitelikleri (minWidth, previewImage, updatePeriodMillis vb.) korur', () => {
    const result = setKeyguardCategory(SAMPLE_WIDGET_XML);
    assert.match(result, /android:minWidth="250dp"/);
    assert.match(result, /android:minHeight="50dp"/);
    assert.match(result, /android:targetCellWidth="4"/);
    assert.match(result, /android:targetCellHeight="1"/);
    assert.match(result, /android:resizeMode="horizontal"/);
    assert.match(result, /android:description="@string\/widget_namazserit_description"/);
    assert.match(result, /android:initialLayout="@layout\/rn_widget"/);
    assert.match(result, /android:previewImage="@drawable\/namazserit_preview"/);
    assert.match(result, /android:updatePeriodMillis="1800000"/);
  });
});
