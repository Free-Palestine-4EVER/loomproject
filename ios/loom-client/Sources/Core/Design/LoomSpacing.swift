// LoomSpacing.swift — spacing scale and corner radius. One radius everywhere
// (18, from the site) keeps every card/button/sheet reading as one family.
import CoreGraphics

enum LoomSpacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

enum LoomRadius {
    /// The site's single corner radius. Use this for cards, buttons, sheets.
    static let standard: CGFloat = 18
    /// Smaller controls (chips, small buttons) read better slightly tighter.
    static let small: CGFloat = 12
    /// Full round (avatars, dots).
    static let pill: CGFloat = 999
}
