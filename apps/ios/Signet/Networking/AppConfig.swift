import Foundation

enum AppConfig {
  static var apiBaseURL: URL {
    if let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
       let url = URL(string: raw), !raw.isEmpty, !raw.contains("example.com")
    {
      return url
    }
    // Local monorepo default (api Nest).
    return URL(string: "http://127.0.0.1:3001")!
  }

  static var publicWebBaseURL: URL {
    if let raw = Bundle.main.object(forInfoDictionaryKey: "PUBLIC_WEB_BASE_URL") as? String,
       let url = URL(string: raw), !raw.isEmpty, !raw.contains("example.com")
    {
      return url
    }
    return URL(string: "http://127.0.0.1:3000")!
  }

  static func publicCardURL(slug: String) -> URL {
    publicWebBaseURL.appendingPathComponent("u").appendingPathComponent(slug)
  }
}
