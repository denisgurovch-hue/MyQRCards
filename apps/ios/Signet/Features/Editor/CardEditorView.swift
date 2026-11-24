import PhotosUI
import SwiftUI

struct CardEditorView: View {
  enum Mode {
    case create
    case edit(cardId: String)
  }

  let mode: Mode
  var onSaved: () async -> Void

  @Environment(\.dismiss) private var dismiss

  @State private var cardId: String?
  @State private var lastName = ""
  @State private var firstName = ""
  @State private var patronymic = ""
  @State private var jobTitle = ""
  @State private var companyName = ""
  @State private var summary = ""
  @State private var phone = ""
  @State private var email = ""
  @State private var showEmail = false
  @State private var websiteUrl = ""
  @State private var slug = ""
  @State private var linkType = "telegram"
  @State private var linkURL = ""
  @State private var linkLabel = ""
  @State private var links: [CardLink] = []

  @State private var pickerItem: PhotosPickerItem?
  @State private var busy = false
  @State private var errorText: String?

  var body: some View {
    Form {
      Section("Основное") {
        TextField("Фамилия *", text: $lastName)
        TextField("Имя *", text: $firstName)
        TextField("Отчество", text: $patronymic)
        TextField("Должность", text: $jobTitle)
        TextField("Компания", text: $companyName)
        TextField("О себе", text: $summary, axis: .vertical)
          .lineLimit(3...6)
      }
      Section("Контакты") {
        TextField("Телефон", text: $phone)
          .keyboardType(.phonePad)
        TextField("E-mail карточки", text: $email)
          .textInputAutocapitalization(.never)
          .keyboardType(.emailAddress)
        Toggle("Показывать e-mail публично", isOn: $showEmail)
        TextField("Сайт (https://…)", text: $websiteUrl)
          .textInputAutocapitalization(.never)
          .keyboardType(.URL)
        TextField("Slug", text: $slug)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
      }
      Section("Ссылки") {
        ForEach(links) { link in
          HStack {
            Text(link.label?.nilIfEmpty ?? link.type ?? "link")
            Spacer()
            Text(link.url).foregroundStyle(.secondary).lineLimit(1)
          }
        }
        .onDelete { links.remove(atOffsets: $0) }

        TextField("Тип (telegram, linkedin…)", text: $linkType)
          .textInputAutocapitalization(.never)
        TextField("URL https://…", text: $linkURL)
          .textInputAutocapitalization(.never)
        TextField("Подпись", text: $linkLabel)
        Button("Добавить ссылку") {
          guard let url = linkURL.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
          else { return }
          links.append(
            CardLink(
              type: linkType.nilIfEmpty,
              url: url,
              label: linkLabel.nilIfEmpty
            )
          )
          linkURL = ""
          linkLabel = ""
        }
      }
      if cardId != nil {
        Section("Фото") {
          PhotosPicker(selection: $pickerItem, matching: .images) {
            Text("Выбрать фото")
          }
          .onChange(of: pickerItem) { _, item in
            Task { await uploadPhoto(item) }
          }
          Button("Удалить фото", role: .destructive) {
            Task { await removePhoto() }
          }
        }
      }
      if let errorText {
        Section { Text(errorText).foregroundStyle(.red) }
      }
    }
    .navigationTitle(cardId == nil ? "Новая визитка" : "Изменить")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Сохранить") { Task { await save() } }
          .disabled(busy || lastName.isEmpty || firstName.isEmpty)
      }
    }
    .task { await loadIfNeeded() }
  }

  private func loadIfNeeded() async {
    if case let .edit(id) = mode {
      cardId = id
      do {
        let card = try await CardsAPI.get(id: id).card
        lastName = card.lastName ?? ""
        firstName = card.firstName ?? ""
        patronymic = card.patronymic ?? ""
        jobTitle = card.jobTitle ?? ""
        companyName = card.companyName ?? ""
        summary = card.summary ?? ""
        phone = card.phone ?? ""
        email = card.email ?? ""
        showEmail = card.showEmail ?? false
        websiteUrl = card.websiteUrl ?? ""
        slug = card.slug
        links = card.links ?? []
      } catch {
        errorText = error.localizedDescription
      }
    }
  }

  private func save() async {
    busy = true
    errorText = nil
    defer { busy = false }
    let body = CardsAPI.UpsertBody(
      lastName: lastName.trimmingCharacters(in: .whitespacesAndNewlines),
      firstName: firstName.trimmingCharacters(in: .whitespacesAndNewlines),
      patronymic: patronymic.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
      jobTitle: jobTitle.nilIfEmpty,
      companyName: companyName.nilIfEmpty,
      summary: summary.nilIfEmpty,
      phone: phone.nilIfEmpty,
      email: email.nilIfEmpty,
      showEmail: showEmail,
      websiteUrl: websiteUrl.nilIfEmpty,
      slug: slug.nilIfEmpty,
      links: links.isEmpty ? nil : links
    )
    do {
      let envelope: CardEnvelope
      if let cardId {
        envelope = try await CardsAPI.update(id: cardId, body)
      } else {
        envelope = try await CardsAPI.create(body)
        self.cardId = envelope.card.id
      }
      await onSaved()
      dismiss()
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func uploadPhoto(_ item: PhotosPickerItem?) async {
    guard let item, let cardId else { return }
    do {
      guard let data = try await item.loadTransferable(type: Data.self) else { return }
      _ = try await CardsAPI.uploadPhoto(id: cardId, jpeg: data)
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func removePhoto() async {
    guard let cardId else { return }
    do {
      _ = try await CardsAPI.deletePhoto(id: cardId)
    } catch {
      errorText = error.localizedDescription
    }
  }
}

private extension String {
  var nilIfEmpty: String? {
    let t = trimmingCharacters(in: .whitespacesAndNewlines)
    return t.isEmpty ? nil : t
  }
}
