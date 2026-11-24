import SwiftUI

struct AccountView: View {
  @EnvironmentObject private var appState: AppState

  @State private var displayName = ""
  @State private var currentPassword = ""
  @State private var newPassword = ""
  @State private var message: String?
  @State private var errorText: String?
  @State private var busy = false
  @State private var confirmDelete = false

  var body: some View {
    Form {
      Section("Профиль") {
        if let email = appState.user?.email {
          LabeledContent("E-mail", value: email)
        }
        TextField("Отображаемое имя", text: $displayName)
        Button("Сохранить профиль") { Task { await saveProfile() } }
          .disabled(busy || displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
      }
      Section("Пароль") {
        SecureField("Текущий пароль", text: $currentPassword)
        SecureField("Новый пароль", text: $newPassword)
        Button("Сменить пароль") { Task { await changePassword() } }
          .disabled(busy || currentPassword.isEmpty || newPassword.count < 8)
      }
      if let message {
        Section { Text(message).foregroundStyle(.green) }
      }
      if let errorText {
        Section { Text(errorText).foregroundStyle(.red) }
      }
      Section {
        Button("Выйти", role: .destructive) {
          Task { await appState.signOut() }
        }
        Button("Удалить аккаунт…", role: .destructive) {
          confirmDelete = true
        }
      }
    }
    .navigationTitle("Аккаунт")
    .task {
      displayName = appState.user?.displayName
        ?? [appState.user?.lastName, appState.user?.firstName]
        .compactMap { $0 }
        .joined(separator: " ")
    }
    .confirmationDialog(
      "Удалить аккаунт навсегда?",
      isPresented: $confirmDelete,
      titleVisibility: .visible
    ) {
      Button("Удалить навсегда", role: .destructive) {
        Task { await deleteAccount() }
      }
      Button("Отмена", role: .cancel) {}
    } message: {
      Text("Все визитки будут удалены. Действие нельзя отменить.")
    }
  }

  private func saveProfile() async {
    busy = true
    errorText = nil
    message = nil
    defer { busy = false }
    do {
      let envelope = try await AuthAPI.updateMe(
        .init(displayName: displayName.trimmingCharacters(in: .whitespacesAndNewlines))
      )
      appState.user = envelope.user
      message = "Профиль сохранён"
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func changePassword() async {
    busy = true
    errorText = nil
    message = nil
    defer { busy = false }
    do {
      let response = try await AuthAPI.changePassword(
        .init(currentPassword: currentPassword, newPassword: newPassword)
      )
      appState.applyAuth(response)
      currentPassword = ""
      newPassword = ""
      message = "Пароль обновлён"
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func deleteAccount() async {
    busy = true
    errorText = nil
    defer { busy = false }
    do {
      try await AuthAPI.deleteAccount()
      KeychainStore.clear()
      appState.user = nil
      appState.phase = .signedOut
    } catch {
      errorText = error.localizedDescription
    }
  }
}
