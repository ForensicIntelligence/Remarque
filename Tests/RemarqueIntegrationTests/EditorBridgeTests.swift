import XCTest
import WebKit
import AppKit
import PDFKit
@testable import Remarque
import RemarqueCore

@MainActor final class EditorBridgeTests: XCTestCase {
    func waitUntil(_ condition: @escaping @MainActor () -> Bool) async throws {
        for _ in 0..<200 { if condition() { return }; try await Task.sleep(for: .milliseconds(50)) }
        XCTFail("Timed out waiting for editor bridge")
    }
    func find<T: NSView>(_ type:T.Type, in view:NSView) -> T? {
        if let found=view as? T {return found}
        return view.subviews.lazy.compactMap{self.find(type,in:$0)}.first
    }
    func js(_ web:WKWebView,_ script:String) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            web.callAsyncJavaScript(script,in:nil,in:.page) { result in
                switch result {case .success(let value):continuation.resume(returning:String(describing:value));case .failure(let error):continuation.resume(throwing:error)}
            }
        }
    }
    func testRealWebKitBridgeAndSharedHistory() async throws {
        let doc=RemarqueDocument();doc.session.load("# Same\n\nAlpha\n\n# Same\n\nBeta\n")
        doc.makeWindowControllers();doc.showWindows();defer{doc.close()}
        try await waitUntil{doc.session.webReady}
        let window=try XCTUnwrap(doc.windowControllers.first?.window)
        let web=try XCTUnwrap(find(WKWebView.self,in:try XCTUnwrap(window.contentView)))
        let source=try XCTUnwrap(find(SourceTextView.self,in:try XCTUnwrap(window.contentView)))
        _ = try await js(web,"window.Remarque.receive({type:'selection',revision:0,start:21,end:21}); window.Remarque.view.focus(); window.Remarque.view.dispatch(window.Remarque.view.state.tr.insertText(' revised')); return true;")
        try await waitUntil{doc.session.revision==1}
        XCTAssertEqual(doc.session.source,"# Same\n\nAlpha\n\n# Same revised\n\nBeta\n")
        try await waitUntil{source.string==doc.session.source}
        XCTAssertEqual(doc.session.selection.range.start,29)
        XCTAssertFalse(window.firstResponder===source,"Source reveal must not steal right editor focus")
        doc.session.replaceSource(doc.session.source+"Left edit",selection:NSRange(location:doc.session.source.utf16.count+9,length:0))
        try await waitUntil{doc.session.revision==2}
        let webSource=try await js(web,"return window.Remarque.getState().source;")
        XCTAssertEqual(webSource,doc.session.source)
        doc.session.undo();XCTAssertEqual(doc.session.source,"# Same\n\nAlpha\n\n# Same revised\n\nBeta\n")
        doc.session.undo();XCTAssertEqual(doc.session.source,"# Same\n\nAlpha\n\n# Same\n\nBeta\n")
        doc.session.redo();doc.session.redo();XCTAssertTrue(doc.session.source.hasSuffix("Left edit"))
        XCTAssertNil(doc.session.error)
    }
    func testDocumentRoundTripAndIdentity() throws {
        let bytes=Data([0xEF,0xBB,0xBF])+Data("# Title\r\n\r\ntext\n".utf8)
        let doc=RemarqueDocument();try doc.read(from:bytes,ofType:"net.daringfireball.markdown")
        XCTAssertEqual(try doc.data(ofType:"net.daringfireball.markdown"),bytes)
        XCTAssertEqual(Bundle.main.bundleIdentifier,"ca.forensicintelligence.remarque")
        XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey:"CFBundleVersion") as? String,"734")
    }
    func testUntitledAutosaveRemainsEdited(){
        let doc=RemarqueDocument();doc.session.load("Draft");doc.session.engineMarkInitialUnsaved()
        doc.updateChangeCount(.changeAutosaved)
        XCTAssertTrue(doc.isDocumentEdited,"Recovery autosave must not mark an untitled document saved")
        doc.close()
    }
    func testNativePDFPagination()async throws{
        let session=DocumentSession(),url=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString+".pdf")
        defer{try? FileManager.default.removeItem(at:url)}
        let body=(1...160).map{"<p>Paragraph \($0): This is a pagination test of the locally rendered document.</p>"}.joined()
        ExportService.shared.exportPDF("<!doctype html><html><head><style>body{font:14pt Arial}p{margin:18pt 0}</style></head><body><h1>Pagination test</h1>"+body+"</body></html>",to:url,session:session)
        try await waitUntil{FileManager.default.fileExists(atPath:url.path) || session.error != nil}
        XCTAssertNil(session.error)
        let pdf=try XCTUnwrap(PDFDocument(url:url));XCTAssertGreaterThan(pdf.pageCount,2)
        XCTAssertTrue(pdf.string?.contains("Paragraph 160") ?? false,"The final paragraph must survive pagination")
    }
}
