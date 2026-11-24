import Foundation

actor APIClient {
  static let shared = APIClient()

  private let session: URLSession
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()

  private init() {
    let config = URLSessionConfiguration.ephemeral
    config.timeoutIntervalForRequest = 30
    session = URLSession(configuration: config)
  }

  func request<T: Decodable>(
    method: String,
    path: String,
    body: Encodable? = nil,
    authorized: Bool = true,
    includeAuthTokensHeader: Bool = false,
    retryOnUnauthorized: Bool = true
  ) async throws -> T {
    let data = try await rawRequest(
      method: method,
      path: path,
      body: body,
      authorized: authorized,
      includeAuthTokensHeader: includeAuthTokensHeader,
      retryOnUnauthorized: retryOnUnauthorized,
      asMultipart: nil
    )
    if T.self == EmptyResponse.self {
      return EmptyResponse() as! T
    }
    do {
      return try decoder.decode(T.self, from: data)
    } catch {
      throw APIError.decoding(error.localizedDescription)
    }
  }

  func requestVoid(
    method: String,
    path: String,
    body: Encodable? = nil,
    authorized: Bool = true
  ) async throws {
    _ = try await rawRequest(
      method: method,
      path: path,
      body: body,
      authorized: authorized,
      includeAuthTokensHeader: false,
      retryOnUnauthorized: true,
      asMultipart: nil
    )
  }

  func upload(
    path: String,
    fieldName: String,
    fileName: String,
    mimeType: String,
    fileData: Data
  ) async throws -> CardEnvelope {
    let data = try await rawRequest(
      method: "POST",
      path: path,
      body: nil,
      authorized: true,
      includeAuthTokensHeader: false,
      retryOnUnauthorized: true,
      asMultipart: MultipartFile(
        fieldName: fieldName,
        fileName: fileName,
        mimeType: mimeType,
        data: fileData
      )
    )
    return try decoder.decode(CardEnvelope.self, from: data)
  }

  func downloadData(path: String) async throws -> Data {
    try await rawRequest(
      method: "GET",
      path: path,
      body: nil,
      authorized: false,
      includeAuthTokensHeader: false,
      retryOnUnauthorized: false,
      asMultipart: nil
    )
  }

  private struct MultipartFile {
    let fieldName: String
    let fileName: String
    let mimeType: String
    let data: Data
  }

  private func rawRequest(
    method: String,
    path: String,
    body: Encodable?,
    authorized: Bool,
    includeAuthTokensHeader: Bool,
    retryOnUnauthorized: Bool,
    asMultipart: MultipartFile?
  ) async throws -> Data {
    var request = try makeURLRequest(method: method, path: path, authorized: authorized)
    if includeAuthTokensHeader {
      request.setValue("1", forHTTPHeaderField: "X-Auth-Tokens")
    }
    if let file = asMultipart {
      let boundary = "Boundary-\(UUID().uuidString)"
      request.setValue(
        "multipart/form-data; boundary=\(boundary)",
        forHTTPHeaderField: "Content-Type"
      )
      var payload = Data()
      payload.append("--\(boundary)\r\n".data(using: .utf8)!)
      payload.append(
        "Content-Disposition: form-data; name=\"\(file.fieldName)\"; filename=\"\(file.fileName)\"\r\n"
          .data(using: .utf8)!
      )
      payload.append("Content-Type: \(file.mimeType)\r\n\r\n".data(using: .utf8)!)
      payload.append(file.data)
      payload.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
      request.httpBody = payload
    } else if let body {
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try encoder.encode(AnyEncodable(body))
    }

    let (data, response) = try await session.data(for: request)
    if let http = response as? HTTPURLResponse, http.statusCode == 401, retryOnUnauthorized,
       authorized
    {
      try await refreshTokens()
      return try await rawRequest(
        method: method,
        path: path,
        body: body,
        authorized: authorized,
        includeAuthTokensHeader: includeAuthTokensHeader,
        retryOnUnauthorized: false,
        asMultipart: asMultipart
      )
    }
    try throwIfNeeded(data: data, response: response)
    return data
  }

  private func makeURLRequest(method: String, path: String, authorized: Bool) throws -> URLRequest {
    let root = AppConfig.apiBaseURL.absoluteString.trimmingCharacters(
      in: CharacterSet(charactersIn: "/")
    )
    let trimmedPath = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    guard let url = URL(string: "\(root)/\(trimmedPath)") else {
      throw APIError.network("Некорректный URL")
    }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    // Native clients: always ask for token bodies on auth mutations when header set by caller.
    if authorized, let token = KeychainStore.get(.accessToken) {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
#if DEBUG
    // Helps diagnose Simulator → Colima/local Nest connectivity in Xcode console.
    print("[SignetAPI] \(method) \(url.absoluteString)")
#endif
    return request
  }

  private func refreshTokens() async throws {
    guard let refresh = KeychainStore.get(.refreshToken) else {
      throw APIError.unauthorized
    }
    struct Body: Encodable { let refreshToken: String }
    let response: AuthTokensResponse = try await request(
      method: "POST",
      path: "api/v1/auth/refresh",
      body: Body(refreshToken: refresh),
      authorized: false,
      includeAuthTokensHeader: true,
      retryOnUnauthorized: false
    )
    guard let access = response.accessToken, let newRefresh = response.refreshToken else {
      throw APIError.unauthorized
    }
    KeychainStore.set(access, for: .accessToken)
    KeychainStore.set(newRefresh, for: .refreshToken)
  }

  private func throwIfNeeded(data: Data, response: URLResponse) throws {
    guard let http = response as? HTTPURLResponse else {
      throw APIError.network("Нет ответа сервера")
    }
    if (200..<300).contains(http.statusCode) {
      return
    }
    if http.statusCode == 401 {
      throw APIError.unauthorized
    }
    if let body = try? decoder.decode(APIErrorBody.self, from: data) {
      throw APIError.http(
        status: http.statusCode,
        code: body.error.code,
        message: body.error.message
      )
    }
    let text = String(data: data, encoding: .utf8) ?? "Ошибка \(http.statusCode)"
    throw APIError.http(status: http.statusCode, code: nil, message: text)
  }
}

struct EmptyResponse: Decodable {
  init() {}
}

private struct AnyEncodable: Encodable {
  private let encodeFunc: (Encoder) throws -> Void
  init(_ value: Encodable) { encodeFunc = value.encode }
  func encode(to encoder: Encoder) throws { try encodeFunc(encoder) }
}
