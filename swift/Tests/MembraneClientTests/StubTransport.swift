import Foundation
import HTTPTypes
import OpenAPIRuntime

/// A transport that answers every request with a canned response, so the tests
/// exercise the client's decoding and mapping without a running service.
struct StubTransport: ClientTransport {
  let status: HTTPResponse.Status
  let contentType: String?
  let body: String

  /// Records what the client actually sent.
  final class Recorder: @unchecked Sendable {
    private(set) var requests: [(HTTPRequest, URL, String)] = []

    func record(_ request: HTTPRequest, _ baseURL: URL, _ operationID: String) {
      requests.append((request, baseURL, operationID))
    }
  }

  let recorder: Recorder

  init(
    status: HTTPResponse.Status = .ok,
    contentType: String? = "application/json",
    body: String,
    recorder: Recorder = Recorder()
  ) {
    self.status = status
    self.contentType = contentType
    self.body = body
    self.recorder = recorder
  }

  func send(
    _ request: HTTPRequest,
    body: HTTPBody?,
    baseURL: URL,
    operationID: String
  ) async throws -> (HTTPResponse, HTTPBody?) {
    recorder.record(request, baseURL, operationID)

    var response = HTTPResponse(status: status)

    if let contentType {
      response.headerFields[.contentType] = contentType
    }

    return (response, HTTPBody(self.body))
  }
}
