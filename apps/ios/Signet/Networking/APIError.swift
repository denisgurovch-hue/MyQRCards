import Foundation

struct APIErrorBody: Codable {
  struct Payload: Codable {
    let code: String
    let message: String
  }

  let error: Payload
}

enum APIError: LocalizedError, Equatable {
  case http(status: Int, code: String?, message: String)
  case decoding(String)
  case unauthorized
  case network(String)

  var errorDescription: String? {
    switch self {
    case let .http(_, _, message):
      return message
    case let .decoding(message):
      return message
    case .unauthorized:
      return "Требуется вход"
    case let .network(message):
      return message
    }
  }
}
