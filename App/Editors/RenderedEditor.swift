import AppKit
import SwiftUI
import WebKit
import RemarqueCore

struct RenderedEditor: NSViewRepresentable {
    @ObservedObject var session:DocumentSession
    @ObservedObject private var preferences=Preferences.shared
    func makeCoordinator()->Coordinator{Coordinator(session)}
    func makeNSView(context:Context)->WKWebView{
        let config=WKWebViewConfiguration();config.websiteDataStore = .nonPersistent()
        config.userContentController.add(context.coordinator,name:"remarque")
        let view=WKWebView(frame:.zero,configuration:config)
        view.navigationDelegate=context.coordinator;context.coordinator.webView=view
        view.setAccessibilityLabel("Rendered document editor");view.setAccessibilityIdentifier("renderedEditor")
        view.isInspectable = true
        session.sendWeb = { [weak view] message in
            view?.callAsyncJavaScript("window.Remarque?.receive(message)",arguments:["message":message],in:nil,in:.page) { _ in }
        }
        if let url=Bundle.main.url(forResource:"index",withExtension:"html",subdirectory:"Editor") {
            let rules="""
            [{"trigger":{"url-filter":"^https?://"},"action":{"type":"block"}}]
            """
            WKContentRuleListStore.default().compileContentRuleList(forIdentifier:"RemarqueOffline",encodedContentRuleList:rules) { [weak view,weak session] rule,error in
                guard let view else{return}
                guard let rule else{session?.error=error?.localizedDescription ?? "Cannot establish offline editor policy.";return}
                view.configuration.userContentController.add(rule)
                view.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent())
            }
        }
        else{session.error="The bundled editor is missing. Rebuild the local editor resources."}
        return view
    }
    func updateNSView(_ view:WKWebView,context:Context){
        let data=try? JSONEncoder().encode(preferences.values)
        if context.coordinator.lastPreferences != data{context.coordinator.lastPreferences=data;session.sendWeb?(["type":"preferences","values":preferences.web])}
    }
    @MainActor final class Coordinator:NSObject,WKScriptMessageHandler,WKNavigationDelegate{
        let session:DocumentSession
        weak var webView:WKWebView?
        var lastPreferences:Data?
        init(_ session:DocumentSession){self.session=session}
        func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage){
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
                  let body=message.body as? [String:Any],let type=body["type"] as? String else{return}
            if type=="ready" {session.webReady=true;session.broadcast();return}
            guard body["documentID"] as? String == session.id else{return}
            switch type{
            case "edit":
                guard let base=body["revision"] as? Int,let raw=body["patches"],JSONSerialization.isValidJSONObject(raw),
                      let data=try? JSONSerialization.data(withJSONObject:raw),data.count<16_777_216,
                      let patches=try? JSONDecoder().decode([SourcePatch].self,from:data),patches.count<10000 else{return}
                let start=body["start"] as? Int ?? 0,end=body["end"] as? Int ?? start
                session.apply(patches,base:base,selection:.init(.init(start,end),surface:"rendered"),label:body["label"] as? String ?? "Edit",group:body["group"] as? String,transactionID:body["transactionID"] as? String)
            case "selection":
                guard body["revision"] as? Int == session.revision,let start=body["start"] as? Int,let end=body["end"] as? Int else{return}
                session.select(.init(start,end),surface:"rendered")
                if let kind=body["kind"] as? String {if kind=="mermaid" {session.activeTab="Mermaid"} else if kind.contains("math"){session.activeTab="LaTeX"}}
            case "outline":
                guard body["revision"] as? Int == session.revision,let rows=body["items"],let data=try? JSONSerialization.data(withJSONObject:rows),let entries=try? JSONDecoder().decode([OutlineEntry].self,from:data) else{return}
                session.outline=entries;session.wordCount=body["words"] as? Int ?? 0;session.diagramCount=entries.filter{$0.kind=="diagram"}.count
            case "undo":session.undo()
            case "redo":session.redo()
            case "error":session.error=body["message"] as? String
            case "openLink":
                if let value=body["url"] as? String,let url=URL(string:value){
                    if url.scheme=="remarque-note"{WorkspaceModel.shared.wiki(String(value.dropFirst("remarque-note:".count)).removingPercentEncoding ?? value)}
                    else if Preferences.shared.values.externalLinks,["https","http","mailto"].contains(url.scheme?.lowercased() ?? ""){NSWorkspace.shared.open(url)}
                }
            case "copy":
                if let text=body["text"] as? String{NSPasteboard.general.clearContents();NSPasteboard.general.setString(text,forType:body["format"] as? String == "html" ? .html:.string)}
            case "asset":
                if let path=body["path"] as? String,let token=body["token"] as? String{
                    do{let (data,mime)=try MediaStore.read(path,document:session.fileURL);session.sendWeb?(["type":"asset","token":token,"mime":mime,"base64":data.base64EncodedString()])}
                    catch{session.missingMedia=path;session.sendWeb?(["type":"asset","token":token,"error":"Image unavailable. Save the document or grant its folder access."])}
                }
            case "pasteImage":
                if let raw=body["base64"] as? String,let data=Data(base64Encoded:raw),let ext=body["extension"] as? String{
                    do{try MediaStore.insert(data,extension:ext,in:session)}catch{session.error=error.localizedDescription}
                }
            case "export":ExportService.shared.receive(body,session:session)
            default:break
            }
        }
        func webView(_ webView:WKWebView,decidePolicyFor navigationAction:WKNavigationAction,decisionHandler:@escaping @MainActor (WKNavigationActionPolicy)->Void){
            if navigationAction.navigationType == .linkActivated {decisionHandler(.cancel);return}
            decisionHandler(navigationAction.request.url?.isFileURL == true ? .allow : .cancel)
        }
        func webViewWebContentProcessDidTerminate(_ webView:WKWebView){session.webReady=false;webView.reload()}
    }
}
