import SwiftUI
import WidgetKit

struct NamazPalette {
    let bg: Color
    let textSecondary: Color
    let muted: Color
    let accent: Color
    let soft: Color
    let onSoft: Color
    let track: Color
    let past: Color

    static let light = NamazPalette(
        bg: Color(hex: 0xfffdf6),
        textSecondary: Color(hex: 0x44403c),
        muted: Color(hex: 0x78716c),
        accent: Color(hex: 0x047857),
        soft: Color(hex: 0xd1fae5),
        onSoft: Color(hex: 0x065f46),
        track: Color(hex: 0xece5d5),
        past: Color(hex: 0xa8a29e)
    )

    static let dark = NamazPalette(
        bg: Color(hex: 0x1c1917),
        textSecondary: Color(hex: 0xd6d3d1),
        muted: Color(hex: 0xa8a29e),
        accent: Color(hex: 0x10b981),
        soft: Color(hex: 0x064e3b),
        onSoft: Color(hex: 0xa7f3d0),
        track: Color(hex: 0x34302d),
        past: Color(hex: 0x57534e)
    )

    static func resolve(theme: String?, colorScheme: ColorScheme) -> NamazPalette {
        if theme == "light" { return .light }
        if theme == "dark" { return .dark }
        return colorScheme == .dark ? .dark : .light
    }
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1.0)
    }
}

struct NamazWidgetEntryView: View {
    let entry: NamazTimelineEntry

    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme

    private static let appURL = URL(string: "kuranyolu://")

    var body: some View {
        let state = NamazCalculator.compute(now: entry.date, payload: entry.payload)
        let palette = NamazPalette.resolve(theme: state.theme, colorScheme: colorScheme)

        content(state: state, palette: palette)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(state.prayer?.accessibilityLabel ?? state.emptyText)
            .widgetURL(Self.appURL)
            .containerBackground(for: .widget) {
                switch family {
                case .accessoryInline, .accessoryRectangular, .accessoryCircular:
                    Color.clear
                case .systemSmall, .systemMedium, .systemLarge, .systemExtraLarge:
                    palette.bg
                @unknown default:
                    palette.bg
                }
            }
    }

    @ViewBuilder
    private func content(state: NamazViewState, palette: NamazPalette) -> some View {
        switch family {
        case .systemSmall:
            SmallNamazView(state: state, palette: palette)
        case .systemMedium:
            MediumNamazView(state: state, palette: palette)
        case .accessoryInline:
            AccessoryInlineNamazView(state: state)
        case .accessoryRectangular:
            AccessoryRectangularNamazView(state: state)
        case .accessoryCircular:
            AccessoryCircularNamazView(state: state)
        case .systemLarge, .systemExtraLarge:
            MediumNamazView(state: state, palette: palette)
        @unknown default:
            SmallNamazView(state: state, palette: palette)
        }
    }
}

struct SmallNamazView: View {
    let state: NamazViewState
    let palette: NamazPalette

    var body: some View {
        if let prayer = state.prayer {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    Text(prayer.nextLabel)
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(0.7)
                        .foregroundStyle(palette.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Spacer(minLength: 4)
                    Text(prayer.city)
                        .font(.system(size: 11))
                        .foregroundStyle(palette.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    if prayer.approximate {
                        Text("(~)")
                            .font(.system(size: 11))
                            .foregroundStyle(palette.muted)
                            .fixedSize(horizontal: true, vertical: false)
                            .layoutPriority(1)
                    }
                }

                Spacer(minLength: 0)

                VStack(alignment: .leading, spacing: 1) {
                    Text(prayer.name)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(palette.textSecondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(prayer.time)
                        .font(.system(size: 34, weight: .bold))
                        .monospacedDigit()
                        .tracking(-0.7)
                        .foregroundStyle(palette.accent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(prayer.remainingLabel)
                        .font(.system(size: 11))
                        .monospacedDigit()
                        .foregroundStyle(palette.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Spacer(minLength: 0)

                SegmentsBarView(
                    segments: prayer.segments,
                    height: 4,
                    pastColor: palette.past,
                    trackColor: palette.track,
                    fillColor: palette.accent
                )
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            Text(state.emptyText)
                .font(.system(size: 12))
                .foregroundStyle(palette.muted)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

struct MediumNamazView: View {
    let state: NamazViewState
    let palette: NamazPalette

    var body: some View {
        if let prayer = state.prayer {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    Text(prayer.heading)
                        .font(.system(size: 12))
                        .foregroundStyle(palette.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Spacer(minLength: 4)
                    Text(prayer.countdown)
                        .font(.system(size: 12, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(palette.accent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Spacer(minLength: 0)

                HStack(spacing: 4) {
                    ForEach(prayer.cells) { cell in
                        VStack(spacing: 4) {
                            Text(cell.name)
                                .font(.system(size: 11, weight: cell.isNext ? .semibold : .regular))
                                .foregroundStyle(cell.isNext ? palette.onSoft : palette.muted)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                            Text(cell.time)
                                .font(.system(size: 15, weight: cell.isNext ? .bold : (cell.isPast ? .regular : .medium)))
                                .monospacedDigit()
                                .foregroundStyle(cell.isNext ? palette.onSoft : (cell.isPast ? palette.muted : palette.textSecondary))
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(cell.isNext ? palette.soft : Color.clear)
                        )
                    }
                }

                Spacer(minLength: 0)

                SegmentsBarView(
                    segments: prayer.segments,
                    height: 4,
                    pastColor: palette.past,
                    trackColor: palette.track,
                    fillColor: palette.accent
                )
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            Text(state.emptyText)
                .font(.system(size: 12))
                .foregroundStyle(palette.muted)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

struct AccessoryInlineNamazView: View {
    let state: NamazViewState

    var body: some View {
        if let prayer = state.prayer {
            Text("\(prayer.name) \(prayer.time)")
                .monospacedDigit()
        } else {
            Text("—")
        }
    }
}

struct AccessoryRectangularNamazView: View {
    let state: NamazViewState

    var body: some View {
        if let prayer = state.prayer {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(prayer.name)
                        .font(.system(size: 13, weight: .semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Spacer(minLength: 4)
                    Text(prayer.approximate ? "\(prayer.time) (~)" : prayer.time)
                        .font(.system(size: 17, weight: .bold))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                Text(prayer.remainingLabel)
                    .font(.system(size: 12))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Spacer(minLength: 2)
                SegmentsBarView(
                    segments: prayer.segments,
                    height: 3,
                    pastColor: .primary.opacity(0.55),
                    trackColor: .primary.opacity(0.22),
                    fillColor: .primary
                )
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        } else {
            Text(state.emptyText)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .lineLimit(3)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
    }
}

struct AccessoryCircularNamazView: View {
    let state: NamazViewState

    var body: some View {
        if let prayer = state.prayer {
            let locale = Locale(identifier: state.lang == "tr" ? "tr_TR" : "en_US")
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 1) {
                    Text(prayer.name.uppercased(with: locale))
                        .font(.system(size: 10, weight: .semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(prayer.shortCountdown)
                        .font(.system(size: 17, weight: .bold))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .padding(.horizontal, 4)
            }
        } else {
            ZStack {
                AccessoryWidgetBackground()
                Text("—")
                    .font(.system(size: 17, weight: .bold))
            }
        }
    }
}

struct SegmentsBarView: View {
    let segments: [PrayerSegment]
    let height: CGFloat
    let pastColor: Color
    let trackColor: Color
    let fillColor: Color

    var body: some View {
        HStack(spacing: 3) {
            ForEach(segments) { segment in
                switch segment.state {
                case .past:
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(pastColor)
                        .frame(height: height)
                case .future:
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(trackColor)
                        .frame(height: height)
                case .current(let fraction):
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2, style: .continuous)
                                .fill(trackColor)
                            RoundedRectangle(cornerRadius: 2, style: .continuous)
                                .fill(fillColor)
                                .frame(width: max(0, geo.size.width * CGFloat(fraction)))
                        }
                    }
                    .frame(height: height)
                }
            }
        }
        .frame(height: height)
    }
}
