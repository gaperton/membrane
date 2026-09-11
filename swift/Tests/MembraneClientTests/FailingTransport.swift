import Foundation
import HTTPTypes
import OpenAPIRuntime

/// A transport that never reaches a service, standing in for a connection
/// failure without binding a real socket.
struct FailingTransport: ClientTransport {
  struct Unreachable: Error {}

  func send(
    _ request: HTTPRequest,
    body: HTTPBody?,
    baseURL: URL,
    operationID: String
  ) async throws -> (HTTPResponse, HTTPBody?) {
    throw Unreachable()
  }
}
