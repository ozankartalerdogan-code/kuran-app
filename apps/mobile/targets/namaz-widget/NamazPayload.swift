import Foundation

enum PrayerKey: String, CaseIterable, Codable, Hashable, Sendable {
    case fajr = "Fajr"
    case sunrise = "Sunrise"
    case dhuhr = "Dhuhr"
    case asr = "Asr"
    case maghrib = "Maghrib"
    case isha = "Isha"
}

struct NamazPrayerItem: Codable, Equatable, Sendable {
    let key: PrayerKey
    let atMs: Double
    let time: String
}

struct NamazDayRecord: Codable, Equatable, Sendable {
    let date: String
    let hijri: String
    let prayers: [NamazPrayerItem]
}

struct NamazWidgetPayload: Codable, Equatable, Sendable {
    let v: Int
    let lang: String
    let theme: String?
    let city: String
    let tz: String
    let emptyText: String
    let focusHeading: String
    let nextLabel: String
    let a11yNext: String
    let names: [String: String]
    let toLabels: [String: String]
    let days: [NamazDayRecord]
    let writtenAtMs: Double?

    static let appGroupId = "group.com.kuranapp.mobile"
    static let defaultsKey = "namazWidgetV1"

    static func isPreferredTurkish() -> Bool {
        Locale.preferredLanguages.first?.hasPrefix("tr") == true
    }

    static func defaultEmptyText(isTurkish: Bool = isPreferredTurkish()) -> String {
        isTurkish ? "Vakitler için uygulamayı açın" : "Open the app to load prayer times"
    }

    static func loadFromSharedDefaults() -> NamazWidgetPayload? {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let raw = defaults.string(forKey: defaultsKey),
              let data = raw.data(using: .utf8)
        else {
            return nil
        }
        guard let decoded = try? JSONDecoder().decode(NamazWidgetPayload.self, from: data),
              decoded.v == 1
        else {
            return nil
        }
        return decoded
    }

    static func sample(now: Date = Date()) -> NamazWidgetPayload {
        let isTr = isPreferredTurkish()
        let nowMs = now.timeIntervalSince1970 * 1000.0
        // Anchor Asr at +72m (+5s buffer so floor((atMs - nowMs) / 60000) == 72)
        let asrMs = nowMs + 72.0 * 60_000.0 + 5_000.0
        let dhuhrMs = asrMs - 143.0 * 60_000.0
        let sunriseMs = dhuhrMs - 298.0 * 60_000.0
        let fajrMs = sunriseMs - 90.0 * 60_000.0
        let maghribMs = asrMs + 144.0 * 60_000.0
        let ishaMs = maghribMs + 84.0 * 60_000.0
        let tz = "Europe/Istanbul"
        let today = NamazCalculator.ymdString(from: now, timeZoneIdentifier: tz)

        let names: [String: String] = isTr
            ? [
                "Fajr": "İmsak",
                "Sunrise": "Güneş",
                "Dhuhr": "Öğle",
                "Asr": "İkindi",
                "Maghrib": "Akşam",
                "Isha": "Yatsı",
            ]
            : [
                "Fajr": "Fajr",
                "Sunrise": "Sunrise",
                "Dhuhr": "Dhuhr",
                "Asr": "Asr",
                "Maghrib": "Maghrib",
                "Isha": "Isha",
            ]

        let toLabels: [String: String] = isTr
            ? [
                "Fajr": "İmsak'a",
                "Sunrise": "Güneş'e",
                "Dhuhr": "Öğle'ye",
                "Asr": "İkindi'ye",
                "Maghrib": "Akşam'a",
                "Isha": "Yatsı'ya",
            ]
            : names

        let prayers: [NamazPrayerItem] = [
            NamazPrayerItem(key: .fajr, atMs: fajrMs, time: "06:31"),
            NamazPrayerItem(key: .sunrise, atMs: sunriseMs, time: "08:01"),
            NamazPrayerItem(key: .dhuhr, atMs: dhuhrMs, time: "12:59"),
            NamazPrayerItem(key: .asr, atMs: asrMs, time: "15:22"),
            NamazPrayerItem(key: .maghrib, atMs: maghribMs, time: "17:46"),
            NamazPrayerItem(key: .isha, atMs: ishaMs, time: "19:10"),
        ]

        let day = NamazDayRecord(
            date: today,
            hijri: isTr ? "14 Cemaziyelahir" : "14 Jumada al-thani",
            prayers: prayers
        )

        return NamazWidgetPayload(
            v: 1,
            lang: isTr ? "tr" : "en",
            theme: nil,
            city: isTr ? "İstanbul" : "Istanbul",
            tz: tz,
            emptyText: defaultEmptyText(isTurkish: isTr),
            focusHeading: isTr ? "SIRADAKİ · İSTANBUL" : "NEXT · ISTANBUL",
            nextLabel: isTr ? "SIRADAKİ" : "NEXT",
            a11yNext: isTr ? "Sıradaki vakit" : "Next prayer",
            names: names,
            toLabels: toLabels,
            days: [day],
            writtenAtMs: nowMs
        )
    }
}

enum PrayerSegmentState: Equatable, Sendable {
    case past
    case current(fraction: Double)
    case future
}

struct PrayerSegment: Identifiable, Equatable, Sendable {
    let id: Int
    let state: PrayerSegmentState
}

struct PrayerCell: Identifiable, Equatable, Sendable {
    let id: PrayerKey
    let name: String
    let time: String
    let isNext: Bool
    let isPast: Bool
}

struct ComputedPrayerState: Equatable, Sendable {
    let city: String
    let nextLabel: String
    let heading: String
    let name: String
    let time: String
    let remainingLabel: String
    let countdown: String
    let shortCountdown: String
    let accessibilityLabel: String
    let cells: [PrayerCell]
    let segments: [PrayerSegment]
}

struct NamazViewState: Equatable, Sendable {
    let lang: String
    let theme: String?
    let emptyText: String
    let prayer: ComputedPrayerState?
}

enum NamazCalculator {
    static func compute(now: Date, payload: NamazWidgetPayload?) -> NamazViewState {
        let fallbackLang = NamazWidgetPayload.isPreferredTurkish() ? "tr" : "en"
        guard let payload = payload else {
            return NamazViewState(
                lang: fallbackLang,
                theme: nil,
                emptyText: NamazWidgetPayload.defaultEmptyText(isTurkish: fallbackLang == "tr"),
                prayer: nil
            )
        }

        let resolvedEmptyText = payload.emptyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? NamazWidgetPayload.defaultEmptyText(isTurkish: payload.lang == "tr")
            : payload.emptyText

        let trimmedCity = payload.city.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedCity.isEmpty else {
            return NamazViewState(
                lang: payload.lang,
                theme: payload.theme,
                emptyText: resolvedEmptyText,
                prayer: nil
            )
        }

        let nowMs = now.timeIntervalSince1970 * 1000.0
        guard let match = nextPrayer(in: payload.days, nowMs: nowMs),
              let nextIndex = match.day.prayers.firstIndex(where: { $0.key == match.prayer.key && $0.atMs == match.prayer.atMs })
        else {
            return NamazViewState(
                lang: payload.lang,
                theme: payload.theme,
                emptyText: resolvedEmptyText,
                prayer: nil
            )
        }

        let display = match.day
        let next = match.prayer
        let current = nextIndex == 0 ? 5 : nextIndex - 1

        let todayYmd = ymdString(from: now, timeZoneIdentifier: payload.tz)
        let todayHijri = payload.days.first(where: { $0.date == todayYmd })?.hijri ?? ""
        let heading = [trimmedCity, todayHijri].filter { !$0.isEmpty }.joined(separator: " · ")

        let name = payload.names[next.key.rawValue] ?? next.key.rawValue
        let toLabel = payload.toLabels[next.key.rawValue] ?? name
        let remaining = formatRemaining(remainingMs: next.atMs - nowMs, lang: payload.lang)
        let remainingLabel = formatRemainingLabel(remaining: remaining, lang: payload.lang)
        let countdown = formatCountdown(name: name, toLabel: toLabel, remaining: remaining, lang: payload.lang)
        let shortCountdown = formatShortCountdown(remainingMs: next.atMs - nowMs)
        let accessibilityLabel = "\(trimmedCity). \(payload.a11yNext): \(name), \(next.time). \(remainingLabel)."

        let cells: [PrayerCell] = display.prayers.map { item in
            let cellName = payload.names[item.key.rawValue] ?? item.key.rawValue
            return PrayerCell(
                id: item.key,
                name: cellName,
                time: item.time,
                isNext: item.key == next.key && item.atMs == next.atMs,
                isPast: item.atMs <= nowMs
            )
        }

        let segments = focusSegments(
            days: payload.days,
            display: display,
            next: next,
            nextIndex: nextIndex,
            current: current,
            nowMs: nowMs
        )

        return NamazViewState(
            lang: payload.lang,
            theme: payload.theme,
            emptyText: resolvedEmptyText,
            prayer: ComputedPrayerState(
                city: trimmedCity,
                nextLabel: payload.nextLabel,
                heading: heading,
                name: name,
                time: next.time,
                remainingLabel: remainingLabel,
                countdown: countdown,
                shortCountdown: shortCountdown,
                accessibilityLabel: accessibilityLabel,
                cells: cells,
                segments: segments
            )
        )
    }

    static func nextPrayer(in days: [NamazDayRecord], nowMs: Double) -> (day: NamazDayRecord, prayer: NamazPrayerItem)? {
        var bestDay: NamazDayRecord?
        var bestPrayer: NamazPrayerItem?

        for day in days {
            for prayer in day.prayers {
                if prayer.atMs > nowMs {
                    if let currentBest = bestPrayer {
                        if prayer.atMs < currentBest.atMs {
                            bestDay = day
                            bestPrayer = prayer
                        }
                    } else {
                        bestDay = day
                        bestPrayer = prayer
                    }
                }
            }
        }

        guard let foundDay = bestDay, let foundPrayer = bestPrayer else {
            return nil
        }
        return (foundDay, foundPrayer)
    }

    static func focusSegments(
        days: [NamazDayRecord],
        display: NamazDayRecord,
        next: NamazPrayerItem,
        nextIndex: Int,
        current: Int,
        nowMs: Double
    ) -> [PrayerSegment] {
        let end = next.atMs
        let start: Double?
        if nextIndex == 0 {
            if let prevYmd = previousYmd(from: display.date) {
                start = days.first(where: { $0.date == prevYmd })?.prayers.first(where: { $0.key == .isha })?.atMs
            } else {
                start = nil
            }
        } else if current >= 0 && current < display.prayers.count {
            start = display.prayers[current].atMs
        } else {
            start = nil
        }

        let fraction: Double
        if let startValue = start, end > startValue {
            fraction = min(1.0, max(0.0, (nowMs - startValue) / (end - startValue)))
        } else {
            fraction = 0.0
        }

        return (0..<6).map { index in
            if index == current {
                return PrayerSegment(id: index, state: .current(fraction: fraction))
            } else if nextIndex > 0 && index < current {
                return PrayerSegment(id: index, state: .past)
            } else {
                return PrayerSegment(id: index, state: .future)
            }
        }
    }

    static func formatRemaining(remainingMs: Double, lang: String) -> String {
        let minutes = max(0, Int(floor(remainingMs / 60_000.0)))
        if minutes < 1 {
            return lang == "tr" ? "şimdi" : "now"
        }
        let hours = minutes / 60
        let rest = minutes % 60
        if lang == "tr" {
            return hours > 0 ? "\(hours) sa \(rest) dk" : "\(minutes) dk"
        }
        return hours > 0 ? "\(hours)h \(rest)m" : "\(minutes)m"
    }

    static func formatRemainingLabel(remaining: String, lang: String) -> String {
        if remaining == "şimdi" || remaining == "now" {
            return remaining
        }
        return lang == "tr" ? "\(remaining) kaldı" : "in \(remaining)"
    }

    static func formatCountdown(name: String, toLabel: String, remaining: String, lang: String) -> String {
        if lang == "tr" {
            return "\(toLabel) \(remaining)"
        }
        return "\(name) in \(remaining)"
    }

    static func formatShortCountdown(remainingMs: Double) -> String {
        let minutes = max(0, Int(floor(remainingMs / 60_000.0)))
        let hours = minutes / 60
        let rest = minutes % 60
        return String(format: "%d:%02d", hours, rest)
    }

    static func ymdString(from date: Date, timeZoneIdentifier: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: timeZoneIdentifier) ?? TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static func previousYmd(from ymd: String) -> String? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        var calendar = Calendar(identifier: .gregorian)
        if let utc = TimeZone(secondsFromGMT: 0) {
            calendar.timeZone = utc
            formatter.timeZone = utc
        }
        formatter.calendar = calendar
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: ymd),
              let previous = calendar.date(byAdding: .day, value: -1, to: date)
        else {
            return nil
        }
        return formatter.string(from: previous)
    }
}
