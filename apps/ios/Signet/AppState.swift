import Foundation
import SwiftUI

@MainActor
final class AppState: ObservableObject {
  enum Phase: Equatable {
    case launching
    case signedOut
    case signedIn
  }

  @Published var phase: Phase = .launching
  @Published var user: User?
  @Published var globalError: String?

  func bootstrap() async {
    phase = .launching
    guard KeychainStore.get(.accessToken) != nil else {
      phase = .signedOut
      return
    }
    do {
      let envelope = try await AuthAPI.me()
      user = envelope.user
      phase = .signedIn
    } catch {
      KeychainStore.clear()
      user = nil
      phase = .signedOut
    }
  }

  func applyAuth(_ response: AuthTokensResponse) {
    if let access = response.accessToken {
      KeychainStore.set(access, for: .accessToken)
    }
    if let refresh = response.refreshToken {
      KeychainStore.set(refresh, for: .refreshToken)
    }
    user = response.user
    phase = .signedIn
    globalError = nil
  }

  func signOut() async {
    try? await AuthAPI.logout()
    KeychainStore.clear()
    user = nil
    phase = .signedOut
  }

  func refreshMe() async {
    do {
      user = try await AuthAPI.me().user
    } catch {
      globalError = error.localizedDescription
    }
  }
}
