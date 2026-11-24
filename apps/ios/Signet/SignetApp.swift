import SwiftUI

@main
struct SignetApp: App {
  @StateObject private var appState = AppState()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(appState)
        .task { await appState.bootstrap() }
    }
  }
}

struct RootView: View {
  @EnvironmentObject private var appState: AppState

  var body: some View {
    Group {
      switch appState.phase {
      case .launching:
        ProgressView("Загрузка…")
      case .signedOut:
        AuthGateView()
      case .signedIn:
        MainTabView()
      }
    }
  }
}

struct MainTabView: View {
  var body: some View {
    TabView {
      NavigationStack {
        CardListView()
      }
      .tabItem { Label("Визитки", systemImage: "person.crop.rectangle.stack") }

      NavigationStack {
        AccountView()
      }
      .tabItem { Label("Аккаунт", systemImage: "gearshape") }
    }
  }
}
