import Foundation

enum AuthAPI {
  struct RegisterBody: Encodable {
    let email: String
    let password: String
    let lastName: String
    let firstName: String
    let patronymic: String?
  }

  struct LoginBody: Encodable {
    let email: String
    let password: String
  }

  struct PasswordBody: Encodable {
    let currentPassword: String
    let newPassword: String
  }

  struct UpdateMeBody: Encodable {
    var displayName: String
  }

  struct DeleteAccountBody: Encodable {
    let confirmation: String
  }

  static func register(_ body: RegisterBody) async throws -> AuthTokensResponse {
    try await APIClient.shared.request(
      method: "POST",
      path: "api/v1/auth/register",
      body: body,
      authorized: false,
      includeAuthTokensHeader: true
    )
  }

  static func login(_ body: LoginBody) async throws -> AuthTokensResponse {
    try await APIClient.shared.request(
      method: "POST",
      path: "api/v1/auth/login",
      body: body,
      authorized: false,
      includeAuthTokensHeader: true
    )
  }

  static func me() async throws -> UserEnvelope {
    try await APIClient.shared.request(method: "GET", path: "api/v1/auth/me")
  }

  static func updateMe(_ body: UpdateMeBody) async throws -> UserEnvelope {
    try await APIClient.shared.request(method: "PATCH", path: "api/v1/auth/me", body: body)
  }

  static func changePassword(_ body: PasswordBody) async throws -> AuthTokensResponse {
    try await APIClient.shared.request(
      method: "POST",
      path: "api/v1/auth/password",
      body: body,
      includeAuthTokensHeader: true
    )
  }

  static func logout() async throws {
    struct Body: Encodable { let refreshToken: String? }
    try await APIClient.shared.requestVoid(
      method: "POST",
      path: "api/v1/auth/logout",
      body: Body(refreshToken: KeychainStore.get(.refreshToken)),
      authorized: false
    )
  }

  static func deleteAccount() async throws {
    try await APIClient.shared.requestVoid(
      method: "POST",
      path: "api/v1/auth/account/delete",
      body: DeleteAccountBody(confirmation: "Удалить")
    )
  }
}
