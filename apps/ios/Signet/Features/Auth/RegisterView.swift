import SwiftUI

struct RegisterView: View {
  @EnvironmentObject private var appState: AppState
  var onSwitchToLogin: () -> Void

  @State private var lastName = ""
  @State private var firstName = ""
  @State private var patronymic = ""
  @State private var email = ""
  @State private var password = ""
  @State private var busy = false
  @State private var errorText: String?

  var body: some View {
    Form {
      Section("Имя") {
        TextField("Фамилия *", text: $lastName)
        TextField("Имя *", text: $firstName)
        TextField("Отчество", text: $patronymic)
      }
      Section("Доступ") {
        TextField("E-mail", text: $email)
          .textInputAutocapitalization(.never)
          .keyboardType(.emailAddress)
          .autocorrectionDisabled()
        SecureField("Пароль (от 8 символов)", text: $password)
      }
      if let errorText {
        Section { Text(errorText).foregroundStyle(.red) }
      }
      Section {
        Button {
          Task { await submit() }
        } label: {
          if busy { ProgressView() } else { Text("Зарегистрироваться") }
        }
        .disabled(busy || !canSubmit)

        Button("У меня уже есть аккаунт", action: onSwitchToLogin)
      }
    }
  }

  private var canSubmit: Bool {
    !lastName.isEmpty && !firstName.isEmpty && !email.isEmpty && password.count >= 8
  }

  private func submit() async {
    busy = true
    errorText = nil
    defer { busy = false }
    do {
      let response = try await AuthAPI.register(
        .init(
          email: email.trimmingCharacters(in: .whitespacesAndNewlines),
          password: password,
          lastName: lastName.trimmingCharacters(in: .whitespacesAndNewlines),
          firstName: firstName.trimmingCharacters(in: .whitespacesAndNewlines),
          patronymic: patronymic.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        )
      )
      appState.applyAuth(response)
    } catch {
      errorText = error.localizedDescription
    }
  }
}

private extension String {
  var nilIfEmpty: String? { isEmpty ? nil : self }
}
