import SwiftUI

struct AuthGateView: View {
  @State private var mode: Mode = .login

  enum Mode { case login, register }

  var body: some View {
    NavigationStack {
      Group {
        switch mode {
        case .login:
          LoginView(onSwitchToRegister: { mode = .register })
        case .register:
          RegisterView(onSwitchToLogin: { mode = .login })
        }
      }
      .navigationTitle("Signet")
    }
  }
}
