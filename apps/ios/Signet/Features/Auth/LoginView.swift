import SwiftUI

struct LoginView: View {
  @EnvironmentObject private var appState: AppState
  var onSwitchToRegister: () -> Void

  @State private var email = ""
  @State private var password = ""
  @State private var busy = false
  @State private var errorText: String?

  var body: some View {
    Form {
      Section {
        TextField("E-mail", text: $email)
          .textInputAutocapitalization(.never)
          .keyboardType(.emailAddress)
          .autocorrectionDisabled()
        SecureField("Пароль", text: $password)
      }
      if let errorText {
        Section { Text(errorText).foregroundStyle(.red) }
      }
      Section {
        Button {
          Task { await submit() }
        } label: {
          if busy { ProgressView() } else { Text("Войти") }
        }
        .disabled(busy || email.isEmpty || password.count < 8)

        Button("Создать аккаунт", action: onSwitchToRegister)
      }
    }
    .navigationBarTitleDisplayMode(.inline)
  }

  private func submit() async {
    busy = true
    errorText = nil
    defer { busy = false }
    do {
      let response = try await AuthAPI.login(
        .init(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
      )
      appState.applyAuth(response)
    } catch {
      errorText = error.localizedDescription
    }
  }
}
