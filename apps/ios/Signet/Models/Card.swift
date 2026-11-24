import Foundation

struct CardLink: Codable, Identifiable, Equatable, Hashable {
  var id: String { "\(type ?? "link")-\(url)" }
  var type: String?
  var url: String
  var label: String?
}

struct Card: Codable, Identifiable, Equatable {
  let id: String
  var displayName: String
  var lastName: String?
  var firstName: String?
  var patronymic: String?
  var showPatronymic: Bool?
  var slug: String
  var status: String
  var jobTitle: String?
  var companyName: String?
  var summary: String?
  var phone: String?
  var email: String?
  var showEmail: Bool?
  var websiteUrl: String?
  var photoUrl: String?
  var coverImageUrl: String?
  var links: [CardLink]?
}

struct CardsListResponse: Codable {
  let items: [Card]
  let total: Int
}

struct CardEnvelope: Codable {
  let card: Card
}

extension Card {
  var statusLabel: String {
    switch status.lowercased() {
    case "published": return "Опубликовано"
    case "archived": return "Архив"
    default: return "Черновик"
    }
  }

  var isPublished: Bool { status.lowercased() == "published" }
}
