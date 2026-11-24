import Foundation

struct User: Codable, Identifiable, Equatable {
  let id: String
  let email: String?
  var displayName: String?
  var lastName: String?
  var firstName: String?
  var patronymic: String?
}

struct UserEnvelope: Codable {
  let user: User
}

struct AuthTokensResponse: Codable {
  let user: User
  let accessToken: String?
  let refreshToken: String?
}
