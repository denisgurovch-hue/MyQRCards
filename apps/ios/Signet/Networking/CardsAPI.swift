import Foundation

enum CardsAPI {
  struct UpsertBody: Encodable {
    var lastName: String?
    var firstName: String?
    var patronymic: String?
    var displayName: String?
    var jobTitle: String?
    var companyName: String?
    var summary: String?
    var phone: String?
    var email: String?
    var showEmail: Bool?
    var websiteUrl: String?
    var slug: String?
    var links: [CardLink]?
  }

  static func list() async throws -> CardsListResponse {
    try await APIClient.shared.request(
      method: "GET",
      path: "api/v1/cards?page=1&limit=50"
    )
  }

  static func get(id: String) async throws -> CardEnvelope {
    try await APIClient.shared.request(method: "GET", path: "api/v1/cards/\(id)")
  }

  static func create(_ body: UpsertBody) async throws -> CardEnvelope {
    try await APIClient.shared.request(method: "POST", path: "api/v1/cards", body: body)
  }

  static func update(id: String, _ body: UpsertBody) async throws -> CardEnvelope {
    try await APIClient.shared.request(method: "PATCH", path: "api/v1/cards/\(id)", body: body)
  }

  static func publish(id: String) async throws -> CardEnvelope {
    try await APIClient.shared.request(method: "POST", path: "api/v1/cards/\(id)/publish")
  }

  static func unpublish(id: String) async throws -> CardEnvelope {
    try await APIClient.shared.request(method: "POST", path: "api/v1/cards/\(id)/unpublish")
  }

  static func delete(id: String) async throws {
    try await APIClient.shared.requestVoid(method: "DELETE", path: "api/v1/cards/\(id)")
  }

  static func uploadPhoto(id: String, jpeg: Data) async throws -> CardEnvelope {
    try await APIClient.shared.upload(
      path: "api/v1/cards/\(id)/photo",
      fieldName: "photo",
      fileName: "avatar.jpg",
      mimeType: "image/jpeg",
      fileData: jpeg
    )
  }

  static func deletePhoto(id: String) async throws -> CardEnvelope {
    try await APIClient.shared.request(method: "DELETE", path: "api/v1/cards/\(id)/photo")
  }

  static func qrPNG(slug: String) async throws -> Data {
    try await APIClient.shared.downloadData(path: "api/v1/public/cards/\(slug)/qr.png")
  }
}
