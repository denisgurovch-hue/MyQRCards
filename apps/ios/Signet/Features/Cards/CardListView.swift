import SwiftUI

struct CardListView: View {
  @State private var cards: [Card] = []
  @State private var busy = false
  @State private var errorText: String?
  @State private var pendingDelete: Card?
  @State private var path = NavigationPath()

  var body: some View {
    List {
      if let errorText {
        Text(errorText).foregroundStyle(.red)
      }
      if cards.isEmpty && !busy {
        ContentUnavailableView(
          "Пока нет визиток",
          systemImage: "person.crop.rectangle",
          description: Text("Создайте первую — это займёт минуту.")
        )
      }
      ForEach(cards) { card in
        CardRowView(
          card: card,
          onPublish: { Task { await runStatus(card, publish: true) } },
          onUnpublish: { Task { await runStatus(card, publish: false) } },
          onDelete: { pendingDelete = card }
        )
      }
    }
    .navigationTitle("Мои визитки")
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink {
          CardEditorView(mode: .create) { await reload() }
        } label: {
          Image(systemName: "plus")
        }
      }
    }
    .refreshable { await reload() }
    .task { await reload() }
    .confirmationDialog(
      "Удалить визитку?",
      isPresented: Binding(
        get: { pendingDelete != nil },
        set: { if !$0 { pendingDelete = nil } }
      ),
      titleVisibility: .visible
    ) {
      Button("Удалить", role: .destructive) {
        if let card = pendingDelete {
          Task { await deleteCard(card) }
        }
      }
      Button("Отмена", role: .cancel) { pendingDelete = nil }
    } message: {
      if let card = pendingDelete {
        Text(
          "Визитка «\(card.displayName)» будет удалена безвозвратно. Публичная ссылка и QR-код перестанут работать."
        )
      }
    }
  }

  private func reload() async {
    busy = true
    errorText = nil
    defer { busy = false }
    do {
      cards = try await CardsAPI.list().items
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func runStatus(_ card: Card, publish: Bool) async {
    errorText = nil
    do {
      let envelope = publish
        ? try await CardsAPI.publish(id: card.id)
        : try await CardsAPI.unpublish(id: card.id)
      if let idx = cards.firstIndex(where: { $0.id == card.id }) {
        cards[idx] = envelope.card
      }
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func deleteCard(_ card: Card) async {
    pendingDelete = nil
    errorText = nil
    do {
      try await CardsAPI.delete(id: card.id)
      cards.removeAll { $0.id == card.id }
    } catch {
      errorText = error.localizedDescription
    }
  }
}
