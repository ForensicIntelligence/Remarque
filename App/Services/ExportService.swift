import AppKit
import WebKit
import PDFKit
import UniformTypeIdentifiers

@MainActor final class ExportService:NSObject,WKNavigationDelegate,WKScriptMessageHandler {
    static let shared=ExportService()
    private var jobs:[UUID:WKWebView]=[:]
    private var completions:[ObjectIdentifier:()->Void]=[:]
    private var presentation:NSWindowController?
    func receive(_ body:[String:Any],session:DocumentSession){
        guard let format=body["format"] as? String,let ext=body["extension"] as? String else{return}
        let title=(body["title"] as? String ?? "Document").replacingOccurrences(of:"/",with:"-").replacingOccurrences(of:":",with:"-")
        if format=="present",let html=body["text"] as? String{present(html);return}
        if format.hasPrefix("print"),let html=body["text"] as? String{printHTML(html,pdf:nil,session:session);return}
        let panel=NSSavePanel();panel.title="Export \(format)";panel.nameFieldStringValue=title+"."+ext;panel.canCreateDirectories=true
        if let type=UTType(filenameExtension:ext){panel.allowedContentTypes=[type]}
        guard panel.runModal() == .OK,let selected=panel.url else{return}
        let url=selected.pathExtension.isEmpty ? selected.appendingPathExtension(ext):selected
        do{
            if format=="PDF",let html=body["text"] as? String{printHTML(html,pdf:url,session:session);return}
            let data:Data
            if format=="RTF",let html=body["text"] as? String{
                let rich=try NSAttributedString(data:Data(html.utf8),options:[.documentType:NSAttributedString.DocumentType.html,.characterEncoding:String.Encoding.utf8.rawValue],documentAttributes:nil)
                data=try rich.data(from:NSRange(location:0,length:rich.length),documentAttributes:[.documentType:NSAttributedString.DocumentType.rtf])
            }else if let text=body["text"] as? String{data=Data(text.utf8)}
            else if let raw=body["base64"] as? String,let decoded=Data(base64Encoded:raw){data=decoded}
            else{throw CocoaError(.fileWriteUnknown)}
            try data.write(to:url,options:.atomic);NSWorkspace.shared.activateFileViewerSelecting([url])
            if let warnings=body["warnings"] as? [String],!warnings.isEmpty{session.error="Export completed with these notes:\n"+warnings.joined(separator:"\n")}
        }catch{session.error="Export failed: \(error.localizedDescription)"}
    }
    private func printHTML(_ html:String,pdf:URL?,session:DocumentSession){
        let id=UUID(),config=WKWebViewConfiguration();config.websiteDataStore = .nonPersistent()
        let web=WKWebView(frame:NSRect(x:0,y:0,width:720,height:900),configuration:config);jobs[id]=web;web.navigationDelegate=self
        completions[ObjectIdentifier(web)]={ [weak self,weak web,weak session] in
            guard let self,let web else{return};defer{self.jobs.removeValue(forKey:id);self.completions.removeValue(forKey:ObjectIdentifier(web))}
            let prefs=Preferences.shared.values,info=NSPrintInfo();info.paperSize=prefs.pageSize=="A4" ? NSSize(width:595.28,height:841.89):NSSize(width:612,height:792)
            info.orientation=prefs.landscape ? .landscape:.portrait;info.topMargin=45;info.bottomMargin=45;info.leftMargin=45;info.rightMargin=45;info.isHorizontallyCentered=false
            let temporary=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString+".pdf")
            if pdf != nil{info.jobDisposition = .save;info.dictionary()[NSPrintInfo.AttributeKey.jobSavingURL]=temporary}
            let operation=web.printOperation(with:info);operation.showsPrintPanel=pdf==nil;operation.showsProgressPanel=true
            if operation.run(),let pdf{do{var data=try Data(contentsOf:temporary);if prefs.pageNumbers{data=try Self.numberedPDF(data)};try data.write(to:pdf,options:.atomic);try? FileManager.default.removeItem(at:temporary);NSWorkspace.shared.activateFileViewerSelecting([pdf])}catch{session?.error=error.localizedDescription}}
        }
        let safe=html.replacingOccurrences(of:"<head>",with:"<head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;\">")
        web.loadHTMLString(safe,baseURL:nil)
    }
    static func numberedPDF(_ data:Data)throws->Data{
        guard let document=PDFDocument(data:data) else{throw CocoaError(.fileReadCorruptFile)}
        let output=NSMutableData();guard let consumer=CGDataConsumer(data:output),let context=CGContext(consumer:consumer,mediaBox:nil,nil) else{throw CocoaError(.fileWriteUnknown)}
        for index in 0..<document.pageCount{guard let page=document.page(at:index) else{continue};var box=page.bounds(for:.mediaBox);context.beginPDFPage([kCGPDFContextMediaBox as String:NSData(bytes:&box,length:MemoryLayout<CGRect>.size)] as CFDictionary);page.draw(with:.mediaBox,to:context);NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:context,flipped:false);let label="\(index+1)" as NSString;label.draw(at:NSPoint(x:box.width/2-5,y:20),withAttributes:[.font:NSFont.systemFont(ofSize:10),.foregroundColor:NSColor.gray]);NSGraphicsContext.restoreGraphicsState();context.endPDFPage()};context.closePDF();return output as Data
    }
    func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){completions[ObjectIdentifier(webView)]?()}
    func webView(_ webView:WKWebView,didFail navigation:WKNavigation!,withError error:Error){NSApp.presentError(error)}
    private func present(_ html:String){
        let config=WKWebViewConfiguration();config.userContentController.add(self,name:"remarque");let web=WKWebView(frame:NSRect(x:0,y:0,width:1200,height:780),configuration:config)
        let window=NSWindow(contentRect:web.frame,styleMask:[.titled,.closable,.resizable,.miniaturizable],backing:.buffered,defer:false);window.title="Remarque Presentation";window.contentView=web;window.center();presentation=NSWindowController(window:window);presentation?.showWindow(nil);web.loadHTMLString(html,baseURL:nil)
    }
    func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage){guard let body=message.body as? [String:Any],body["type"] as? String=="closePresentation" else{return};presentation?.close();presentation=nil}
    func printSource(_ session:DocumentSession){let text=NSTextView(frame:NSRect(x:0,y:0,width:540,height:700));text.string=session.source;text.font = .monospacedSystemFont(ofSize:11,weight:.regular);let operation=NSPrintOperation(view:text,printInfo:NSPrintInfo());operation.run()}
}
