import SwiftUI
import WidgetKit

struct NamazTimelineEntry: TimelineEntry {
    let date: Date
    let payload: NamazWidgetPayload?
}

struct NamazTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> NamazTimelineEntry {
        let now = Date()
        return NamazTimelineEntry(date: now, payload: NamazWidgetPayload.sample(now: now))
    }

    func getSnapshot(in context: Context, completion: @escaping (NamazTimelineEntry) -> Void) {
        let now = Date()
        if context.isPreview {
            completion(NamazTimelineEntry(date: now, payload: NamazWidgetPayload.sample(now: now)))
            return
        }
        let payload = NamazWidgetPayload.loadFromSharedDefaults() ?? NamazWidgetPayload.sample(now: now)
        completion(NamazTimelineEntry(date: now, payload: payload))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NamazTimelineEntry>) -> Void) {
        let now = Date()
        let payload = NamazWidgetPayload.loadFromSharedDefaults()

        guard let validPayload = payload,
              NamazCalculator.compute(now: now, payload: validPayload).prayer != nil
        else {
            let entry = NamazTimelineEntry(date: now, payload: payload)
            completion(Timeline(entries: [entry], policy: .never))
            return
        }

        var entries: [NamazTimelineEntry] = []
        entries.reserveCapacity(180)
        entries.append(NamazTimelineEntry(date: now, payload: validPayload))

        let nextMinuteStart = floor(now.timeIntervalSince1970 / 60.0) * 60.0 + 60.0
        for minuteOffset in 0..<179 {
            let entryDate = Date(timeIntervalSince1970: nextMinuteStart + Double(minuteOffset) * 60.0)
            entries.append(NamazTimelineEntry(date: entryDate, payload: validPayload))
        }

        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

private enum NamazWidgetStrings {
    static var isTurkish: Bool {
        NamazWidgetPayload.isPreferredTurkish()
    }

    static var displayName: String {
        isTurkish ? "Namaz Vakitleri" : "Prayer Times"
    }

    static var description: String {
        isTurkish ? "Sıradaki vakit ve geri sayım" : "Next prayer and countdown"
    }
}

struct NamazWidget: Widget {
    let kind: String = "NamazWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NamazTimelineProvider()) { entry in
            NamazWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(NamazWidgetStrings.displayName)
        .description(NamazWidgetStrings.description)
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryInline,
            .accessoryRectangular,
            .accessoryCircular,
        ])
    }
}

@main
struct KuranYoluWidgets: WidgetBundle {
    var body: some Widget {
        NamazWidget()
    }
}
