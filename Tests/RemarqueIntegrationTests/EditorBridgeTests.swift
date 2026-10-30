import XCTest
import WebKit
import AppKit
import PDFKit
@testable import Remarque
import RemarqueCore

@MainActor final class EditorBridgeTests: XCTestCase {
    func waitUntil(limit:Int=200,_ condition: @escaping @MainActor () -> Bool) async throws {
        for _ in 0..<limit { if condition() { return }; try await Task.sleep(for: .milliseconds(50)) }
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
    func testTwoWebKitPanesShareOneSourceInLiveMode()async throws{
        let saved=Preferences.shared.values.liveEditing;Preferences.shared.values.liveEditing=true
        let doc=RemarqueDocument();doc.session.load("# Title\n\nAlpha")
        doc.makeWindowControllers();doc.showWindows();defer{doc.close();Preferences.shared.values.liveEditing=saved}
        let root=try XCTUnwrap(doc.windowControllers.first?.window?.contentView)
        func allWeb(_ view:NSView)->[WKWebView]{(view as? WKWebView).map{[$0]} ?? view.subviews.flatMap(allWeb)}
        try await waitUntil{doc.session.webReady && allWeb(root).count==2}
        let panes=allWeb(root),left=panes[0],right=panes[1]
        for _ in 0..<100{let leftID=try? await js(left,"return window.Remarque?.getState().documentID;"),rightID=try? await js(right,"return window.Remarque?.getState().documentID;");if leftID==doc.session.id && rightID==doc.session.id{break};try await Task.sleep(for:.milliseconds(50))}
        _ = try await js(left,"window.Remarque.receive({type:'selection',revision:0,start:9,end:9,reveal:true}); const area=document.querySelector('.live-source-block'); area.value='Beta';area.dispatchEvent(new Event('input',{bubbles:true}));return true;")
        try await waitUntil{doc.session.source=="# Title\n\nBeta"}
        let rightSource=try await js(right,"return window.Remarque.getState().source;");XCTAssertEqual(rightSource,doc.session.source)
        _ = try await js(right,"window.Remarque.receive({type:'selection',revision:1,start:13,end:13});window.Remarque.view.focus();window.Remarque.view.dispatch(window.Remarque.view.state.tr.insertText(' edited'));return true;")
        try await waitUntil{doc.session.source=="# Title\n\nBeta edited"}
        let leftSource=try await js(left,"return window.Remarque.getState().source;");XCTAssertEqual(leftSource,doc.session.source)
        doc.session.undo();doc.session.undo();XCTAssertEqual(doc.session.source,"# Title\n\nAlpha")
    }
    func testDocumentRoundTripAndIdentity() throws {
        let bytes=Data([0xEF,0xBB,0xBF])+Data("# Title\r\n\r\ntext\n".utf8)
        let doc=RemarqueDocument();try doc.read(from:bytes,ofType:"net.daringfireball.markdown")
        XCTAssertEqual(try doc.data(ofType:"net.daringfireball.markdown"),bytes)
        XCTAssertEqual(Bundle.main.bundleIdentifier,"ca.forensicintelligence.remarkable")
        XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey:"CFBundleName") as? String,"Remarque")
        XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey:"CFBundleDisplayName") as? String,"Remarque")
        XCTAssertGreaterThanOrEqual(Int(BuildInfo.build) ?? 0,734)
        XCTAssertEqual(BuildInfo.version,"3.0.4")
        XCTAssertEqual(BuildInfo.label,"3.0.4 (742)")
        XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey:"RemarqueReleaseChannel") as? String,"release")
    }
    func testScrollPreferencePersistsAndRoutesBothModesWithoutBlockingSelection()throws{
        XCTAssertTrue(PreferenceValues().scrollSync)
        let old=Preferences.shared.values.scrollSync;defer{Preferences.shared.values.scrollSync=old}
        let session=DocumentSession("# Title\n\nText"),receiver=UUID();var messages:[[String:Any]]=[];var scrolled:[Int]=[];var reveals:[NSRange]=[]
        session.webReceivers[receiver]={messages.append($0)};session.scrollSource={scrolled.append($0)};session.revealSource={reveals.append($0)}
        Preferences.shared.values.scrollSync=true
        session.synchronizeScroll(from:"source",offset:9,at:0);XCTAssertEqual(messages.last?["target"] as? String,"rendered")
        session.synchronizeScroll(from:"rendered",offset:9,at:0);XCTAssertEqual(messages.last?["target"] as? String,"liveSource");XCTAssertEqual(scrolled,[9])
        session.synchronizeScroll(from:"liveSource",offset:9,at:0);XCTAssertEqual(messages.last?["target"] as? String,"rendered")
        let count=messages.count;Preferences.shared.values.scrollSync=false
        session.synchronizeScroll(from:"rendered",offset:1,at:0);session.synchronizeScroll(from:"source",offset:1,at:0);XCTAssertEqual(messages.count,count);XCTAssertEqual(scrolled,[9])
        let saved=try XCTUnwrap(UserDefaults.standard.data(forKey:"preferences.v3"));XCTAssertFalse(try JSONDecoder().decode(PreferenceValues.self,from:saved).scrollSync)
        session.select(.init(2,7),surface:"rendered");XCTAssertEqual(reveals.last,NSRange(location:2,length:5))
        Preferences.shared.values.scrollSync=true
        let beforeStale=messages.count;session.synchronizeScroll(from:"source",offset:1,at:99);XCTAssertEqual(messages.count,beforeStale)
        session.synchronizeScroll(from:"source",offset:1,at:0);XCTAssertEqual(messages.count,beforeStale+1)
    }
    func testNativeHelpReaderRendersBundledGuide()async throws{
        let coordinator=HelpReader.Coordinator(),web=HelpReader.makeView(coordinator:coordinator)
        let window=NSWindow(contentRect:NSRect(x:0,y:0,width:900,height:700),styleMask:[.titled],backing:.buffered,defer:false);window.isReleasedWhenClosed=false;window.contentView=web;window.orderFront(nil)
        defer{web.configuration.userContentController.removeScriptMessageHandler(forName:"remarqueHelp");window.close()}
        coordinator.show(try XCTUnwrap(HelpLibrary.articles.first{$0.id=="Math and Equations"}),theme:"Paper",scale:1)
        try await waitUntil{coordinator.ready}
        var rendered=false
        for _ in 0..<200{if (try? await js(web,"return document.querySelector('#help').dataset.ready;"))=="true"{rendered=true;break};try await Task.sleep(for:.milliseconds(50))}
        XCTAssertTrue(rendered)
        let result=try await js(web,"return document.querySelectorAll('.example-result svg').length;");XCTAssertEqual(result,"2")
        let glyphs=try await js(web,"return String([...document.querySelectorAll('.example-result svg')].every(svg=>[...svg.querySelectorAll('path')].some(path=>!path.closest('defs'))));");XCTAssertEqual(glyphs,"true")
        let editable=try await js(web,"return String(document.querySelector('[contenteditable=true]')===null);");XCTAssertEqual(editable,"true")
    }
    func testLivePaneScrollSynchronizationCanBeDisabled()async throws{
        let oldLive=Preferences.shared.values.liveEditing,oldSync=Preferences.shared.values.scrollSync
        Preferences.shared.values.liveEditing=true;Preferences.shared.values.scrollSync=true
        let doc=RemarqueDocument();doc.session.load((0..<90).map{"## Section \($0)\n\nParagraph \($0) with enough text to scroll."}.joined(separator:"\n\n"))
        doc.makeWindowControllers();doc.showWindows();defer{doc.close();Preferences.shared.values.liveEditing=oldLive;Preferences.shared.values.scrollSync=oldSync}
        let root=try XCTUnwrap(doc.windowControllers.first?.window?.contentView)
        func panes(_ v:NSView)->[WKWebView]{(v as? WKWebView).map{[$0]} ?? v.subviews.flatMap(panes)}
        try await waitUntil{doc.session.webReady && panes(root).count==2}
        let left=panes(root)[0],right=panes(root)[1]
        for web in [left,right]{for _ in 0..<100{if (try? await js(web,"return document.querySelectorAll('.ProseMirror h2').length;"))=="90"{break};try await Task.sleep(for:.milliseconds(50))}}
        _ = try await js(left,"window.scrollTo(0,1300);return true;")
        var followed=false
        for _ in 0..<100{if (Double(try await js(right,"return window.scrollY;")) ?? 0)>700{followed=true;break};try await Task.sleep(for:.milliseconds(50))}
        XCTAssertTrue(followed,"Scrolling the live source pane must move the rendered pane")
        Preferences.shared.values.scrollSync=false
        try await Task.sleep(for:.milliseconds(350))
        let before=try await js(left,"return window.scrollY;")
        _ = try await js(right,"window.scrollTo(0,2800);return true;")
        try await Task.sleep(for:.milliseconds(350))
        let after=try await js(left,"return window.scrollY;");XCTAssertEqual(before,after)
        Preferences.shared.values.scrollSync=true
        try await Task.sleep(for:.milliseconds(350))
        _ = try await js(right,"window.scrollTo(0,3900);return true;")
        followed=false
        for _ in 0..<100{if (Double(try await js(left,"return window.scrollY;")) ?? 0)>3000{followed=true;break};try await Task.sleep(for:.milliseconds(50))}
        XCTAssertTrue(followed,"Re-enabling synchronization must take effect in the other direction")
    }
    func testUntitledAutosaveRemainsEdited(){
        let doc=RemarqueDocument();doc.session.load("Draft");doc.session.engineMarkInitialUnsaved()
        doc.updateChangeCount(.changeAutosaved)
        XCTAssertTrue(doc.isDocumentEdited,"Recovery autosave must not mark an untitled document saved")
        doc.close()
    }
    func testRTFEmbedsHTMLImage()throws{
        let bitmap=try XCTUnwrap(NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:30,pixelsHigh:30,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0))
        for y in 0..<30{for x in 0..<30{bitmap.setColor(.systemRed,atX:x,y:y)}}
        let png=try XCTUnwrap(bitmap.representation(using:.png,properties:[:])).base64EncodedString()
        let html="<html><body><h1>Heading</h1><p>Before <b>bold</b> <img src=\"data:image/png;base64,\(png)\" width=\"30\" height=\"30\"> After</p></body></html>"
        let rich=try NSAttributedString(data:Data(html.utf8),options:[.documentType:NSAttributedString.DocumentType.html],documentAttributes:nil)
        var attachments=0;rich.enumerateAttribute(.attachment,in:NSRange(location:0,length:rich.length)){value,_,_ in if value != nil{attachments+=1}}
        XCTAssertEqual(attachments,1)
        let data=try RichTextCodec.rtf(from:rich)
        let decoded=try RichTextCodec.html(fromRTF:data)
        XCTAssertTrue(decoded.contains("bold"));XCTAssertTrue(decoded.contains("data:image/png;base64,"))
        XCTAssertTrue(String(decoding:data,as:UTF8.self).contains("\\pict\\pngblip"))
        try data.write(to:FileManager.default.temporaryDirectory.appendingPathComponent("remarque-rtf-verification.rtf"))
    }
    func testAllMermaidFamiliesInNativePDF()async throws{
        let fixture=try XCTUnwrap(Bundle(for:Self.self).url(forResource:"all-diagrams",withExtension:"html",subdirectory:"Fixtures"))
        let html=try String(contentsOf:fixture,encoding:.utf8),session=DocumentSession(),url=FileManager.default.temporaryDirectory.appendingPathComponent("remarque-all-diagrams.pdf")
        try? FileManager.default.removeItem(at:url)
        ExportService.shared.exportPDF(html,to:url,session:session)
        try await waitUntil(limit:600){FileManager.default.fileExists(atPath:url.path)||session.error != nil}
        XCTAssertNil(session.error);let pdf=try XCTUnwrap(PDFDocument(url:url));XCTAssertGreaterThan(pdf.pageCount,5)
        XCTAssertTrue(pdf.string?.contains("railroad-peg") ?? false)
        XCTAssertTrue(pdf.string?.contains("flowchart") ?? false)
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
