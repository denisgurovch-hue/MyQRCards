import Foundation

enum AppConfig {
  /// Nest listens on API_PORT (default 3001). Simulator shares the Mac loopback.
  private static let localAPIFallback = URL(string: "http://127.0.0.1:3001")!
  private static let localWebFallback = URL(string: "http://127.0.0.1:3000")!

  static var apiBaseURL: URL {
    resolvedURL(infoKey: "API_BASE_URL") ?? localAPIFallback
  }

  static var publicWebBaseURL: URL {
    resolvedURL(infoKey: "PUBLIC_WEB_BASE_URL") ?? localWebFallback
  }

  static func publicCardURL(slug: String) -> URL {
    publicWebBaseURL.appendingPathComponent("u").appendingPathComponent(slug)
  }

  private static func resolvedURL(infoKey: String) -> URL? {
    guard let raw = Bundle.main.object(forInfoDictionaryKey: infoKey) as? String else {
      return nil
    }
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    // Reject missing build settings / unexpanded xcconfig placeholders.
    guard !trimmed.isEmpty,
          !trimmed.contains("$("),
          !trimmed.contains("example.com"),
          let url = URL(string: trimmed),
          url.scheme == "http" || url.scheme == "https"
    else {
      return nil
    }
    return url
  }
}
