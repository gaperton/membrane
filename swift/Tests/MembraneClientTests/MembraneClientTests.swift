import Foundation
import HTTPTypes
import OpenAPIRuntime
import Testing

@testable import MembraneClient

private let serverURL = URL(string: "http://localhost:3000")!

@Suite("MembraneClient.health()")
struct HealthTests {
  @Test("reports the documented status")
  func reportsStatus() async throws {
    let client = MembraneClient(
      serverURL: serverURL,
      transport: StubTransport(body: #"{"status":"ok"}"#)
    )

    #expect(try await client.health() == .ok)
  }

  @Test("requests GET /health and accepts JSON")
  func sendsDocumentedRequest() async throws {
    let recorder = StubTransport.Recorder()
    let client = MembraneClient(
      serverURL: serverURL,
      transport: StubTransport(body: #"{"status":"ok"}"#, recorder: recorder)
    )

    _ = try await client.health()

    let (request, baseURL, operationID) = try #require(recorder.requests.first)

    #expect(recorder.requests.count == 1)
    #expect(request.method == .get)
    #expect(request.path == "/health")
    #expect(baseURL == serverURL)
    #expect(operationID == "get/health")
    #expect(request.headerFields[.accept]?.contains("application/json") == true)
  }

  @Test("reports a status outside the documented contract as unexpected")
  func rejectsUndocumentedStatusValue() async {
    await #expect(throws: MembraneClientError.self) {
      try await client(body: #"{"status":"degraded"}"#).health()
    }
    #expect(await failure(body: #"{"status":"degraded"}"#)?.isUnexpected == true)
  }

  @Test("reports an undocumented response code as unexpected")
  func rejectsUndocumentedResponseCode() async {
    let error = await failure(
      status: .internalServerError,
      body: #"{"message":"boom"}"#
    )

    #expect(error?.isUnexpected == true)
  }

  @Test("reports a non-JSON body as unexpected")
  func rejectsNonJSONResponse() async {
    let error = await failure(
      contentType: "text/html",
      body: "<html></html>"
    )

    #expect(error?.isUnexpected == true)
  }

  @Test("reports a transport failure as unreachable")
  func reportsTransportFailure() async {
    let client = MembraneClient(
      serverURL: serverURL,
      transport: FailingTransport()
    )

    var captured: MembraneClientError?

    do {
      _ = try await client.health()
    } catch {
      captured = error
    }

    #expect(captured?.isTransportFailure == true)
  }
}

// MARK: - Helpers

private func client(
  status: HTTPResponse.Status = .ok,
  contentType: String? = "application/json",
  body: String
) -> MembraneClient {
  MembraneClient(
    serverURL: serverURL,
    transport: StubTransport(
      status: status,
      contentType: contentType,
      body: body
    )
  )
}

private func failure(
  status: HTTPResponse.Status = .ok,
  contentType: String? = "application/json",
  body: String
) async -> MembraneClientError? {
  do {
    _ = try await client(status: status, contentType: contentType, body: body)
      .health()
    return nil
  } catch {
    return error
  }
}

extension MembraneClientError {
  fileprivate var isUnexpected: Bool {
    if case .unexpectedResponse = self { return true }
    return false
  }

  fileprivate var isTransportFailure: Bool {
    if case .transportFailure = self { return true }
    return false
  }
}
