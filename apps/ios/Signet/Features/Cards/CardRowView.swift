import SwiftUI

struct CardRowView: View {
  let card: Card
  var onPublish: () -> Void
  var onUnpublish: () -> Void
  var onDelete: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Text(card.displayName).font(.headline)
        Spacer()
        Text(card.statusLabel)
          .font(.caption.weight(.semibold))
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(card.isPublished ? Color.teal.opacity(0.2) : Color.gray.opacity(0.15))
          .clipShape(Capsule())
      }
      Text(metaLine)
        .font(.subheadline)
        .foregroundStyle(.secondary)

      HStack {
        NavigationLink("Изменить") {
          CardEditorView(mode: .edit(cardId: card.id)) {}
        }
        NavigationLink("Показать") {
          PresentView(cardId: card.id)
        }
        if card.isPublished {
          ShareLink(item: AppConfig.publicCardURL(slug: card.slug)) {
            Text("Открыть")
          }
        }
      }
      .buttonStyle(.bordered)

      HStack {
        if card.isPublished {
          Button("Снять с публикации", action: onUnpublish)
        } else {
          Button("Опубликовать", action: onPublish)
        }
        Button("Удалить", role: .destructive, action: onDelete)
      }
      .buttonStyle(.bordered)
    }
    .padding(.vertical, 6)
  }

  private var metaLine: String {
    [card.slug, card.jobTitle, card.companyName]
      .compactMap { $0 }
      .filter { !$0.isEmpty }
      .joined(separator: " · ")
  }
}
