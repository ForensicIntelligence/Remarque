import AppKit
import PDFKit
import UniformTypeIdentifiers

@MainActor enum ImportService {
    static func openDocument(_ session:DocumentSession){
        let panel=NSOpenPanel();panel.allowedContentTypes=[.pdf,.rtf,UTType(filenameExtension:"docx") ?? .data];guard panel.runModal() == .OK,let url=panel.url else{return}
        do{let data=try Data(contentsOf:url)
            switch url.pathExtension.lowercased(){
            case "docx":session.sendWeb?(["type":"command","name":"importDOCX","value":data.base64EncodedString()])
            case "pdf":
                guard let pdf=PDFDocument(data:data) else{throw CocoaError(.fileReadCorruptFile)}
                var pages:[String]=[],missing:[Int]=[];for index in 0..<pdf.pageCount{let text=pdf.page(at:index)?.string ?? "";if text.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty{missing.append(index+1)};pages.append(text)}
                AppWindows.shared.newDocument(text:pages.joined(separator:"\n\n---\n\n"));if !missing.isEmpty{session.error="PDF text import: pages \(missing.map(String.init).joined(separator:", ")) had no extractable text. OCR is not performed."}
            default:
                let rich=try NSAttributedString(data:data,options:[.documentType:NSAttributedString.DocumentType.rtf],documentAttributes:nil)
                let html=try rich.data(from:NSRange(location:0,length:rich.length),documentAttributes:[.documentType:NSAttributedString.DocumentType.html]);session.sendWeb?(["type":"command","name":"importHTML","value":String(data:html,encoding:.utf8) ?? rich.string])
            }
        }catch{session.error="Import failed: \(error.localizedDescription)"}
    }
    static func mermaid(_ session:DocumentSession){
        let panel=NSOpenPanel();panel.allowedContentTypes=[.plainText,UTType(filenameExtension:"md") ?? .plainText,UTType(filenameExtension:"mmd") ?? .plainText];panel.allowsOtherFileTypes=true
        guard panel.runModal() == .OK,let url=panel.url else{return}
        do{let text=try String(contentsOf:url,encoding:.utf8);session.sendWeb?(["type":"command","name":"importMermaidData","value":text,"start":session.selection.range.start,"end":session.selection.range.end,"surface":session.selection.surface])}catch{session.error=error.localizedDescription}
    }
}
