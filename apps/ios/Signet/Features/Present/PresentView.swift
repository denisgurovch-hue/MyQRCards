import SwiftUI

struct PresentView: View {
  let cardId: String

  @State private var card: Card?
  @State private var qrImage: UIImage?
  @State private var errorText: String?
  @State private var busy = true

  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        if let errorText {
          Text(errorText).foregroundStyle(.red)
        }
        if let card {
          Text(card.displayName).font(.title2.bold())
          if let job = card.jobTitle, !job.isEmpty {
            Text(job).foregroundStyle(.secondary)
          }
          if let company = card.companyName, !company.isEmpty {
            Text(company).foregroundStyle(.secondary)
          }
          if let summary = card.summary, !summary.isEmpty {
            Text(summary).padding(.top, 4)
          }

          if card.isPublished {
            if let qrImage {
              Image(uiImage: qrImage)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: 240)
                .padding()
            } else {
              ProgressView("QR…")
            }
            ShareLink(
              item: AppConfig.publicCardURL(slug: card.slug),
              message: Text(card.displayName)
            ) {
              Label("Поделиться ссылкой", systemImage: "square.and.arrow.up")
            }
            .buttonStyle(.borderedProminent)
          } else {
            Text(
              "Предпросмотр. Визитка не опубликована — QR-код и публичная ссылка недоступны"
            )
            .multilineTextAlignment(.center)
            .foregroundStyle(.secondary)
            .padding()
          }
        } else if busy {
          ProgressView()
        }
      }
      .padding()
      .frame(maxWidth: .infinity)
    }
    .navigationTitle("Показать")
    .navigationBarTitleDisplayMode(.inline)
    .task { await load() }
  }

  private func load() async {
    busy = true
    errorText = nil
    defer { busy = false }
    do {
      let loaded = try await CardsAPI.get(id: cardId).card
      card = loaded
      if loaded.isPublished {
        let data = try await CardsAPI.qrPNG(slug: loaded.slug)
        qrImage = UIImage(data: data)
      }
    } catch {
      errorText = error.localizedDescription
    }
  }
}
