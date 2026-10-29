import AppKit
import UniformTypeIdentifiers
import RemarqueCore

@MainActor enum MediaStore {
    static func read(_ path:String,document:URL?)throws->(Data,String){
        guard !path.contains("\0"),!path.lowercased().hasPrefix("http:"),!path.lowercased().hasPrefix("https:") else{throw CocoaError(.fileReadNoPermission)}
        let url:URL
        if path.hasPrefix("file:"),let file=URL(string:path){url=file}
        else if path.hasPrefix("/"){url=URL(fileURLWithPath:path)}
        else {guard let document else{throw CocoaError(.fileReadNoSuchFile)};url=document.deletingLastPathComponent().appendingPathComponent(path.removingPercentEncoding ?? path)}
        let resolved=url.resolvingSymlinksInPath().standardizedFileURL
        let base=document?.deletingLastPathComponent().resolvingSymlinksInPath().path
        guard FileGrants.shared.contains(resolved) || (base != nil && resolved.path.hasPrefix(base!+"/")) else{throw CocoaError(.fileReadNoPermission)}
        let ext=resolved.pathExtension.lowercased();guard let mime=["png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg","gif":"image/gif","svg":"image/svg+xml","webp":"image/webp","tiff":"image/tiff"][ext] else{throw CocoaError(.fileReadUnknown)}
        let values=try resolved.resourceValues(forKeys:[.fileSizeKey]);guard values.fileSize ?? 0 <= 25*1024*1024 else{throw CocoaError(.fileReadTooLarge)}
        return(try Data(contentsOf:resolved),mime)
    }
    static func insertFile(in session:DocumentSession){
        let panel=NSOpenPanel();panel.allowedContentTypes=[.png,.jpeg,.gif,.svg,.tiff];panel.allowsMultipleSelection=false
        guard panel.runModal() == .OK,let url=panel.url else{return}
        do{let data=try Data(contentsOf:url);try insert(data,extension:url.pathExtension,name:url.deletingPathExtension().lastPathComponent,in:session)}catch{session.error=error.localizedDescription}
    }
    static func insert(_ data:Data,extension ext:String,name:String="Image",in session:DocumentSession)throws{
        guard data.count<=20*1024*1024 else{throw CocoaError(.fileReadTooLarge)}
        let mime=["png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg","gif":"image/gif","svg":"image/svg+xml","tiff":"image/tiff"][ext.lowercased()] ?? "image/png"
        var reference="data:\(mime);base64,"+data.base64EncodedString()
        if Preferences.shared.values.imageStorage=="Linked",let document=session.fileURL{
            let folder=document.deletingLastPathComponent(),assets=folder.appendingPathComponent("assets",isDirectory:true)
            let name="image-"+String(DocumentEngine.digest(data.base64EncodedString()).prefix(16))+"."+ext.lowercased()
            do{try FileManager.default.createDirectory(at:assets,withIntermediateDirectories:true);try data.write(to:assets.appendingPathComponent(name),options:.atomic)}catch{
                guard let grant=FileGrants.shared.chooseFolder(title:"Grant access to the document’s folder to save images"),folder.path==grant.path || folder.path.hasPrefix(grant.path+"/") else{throw error}
                try FileManager.default.createDirectory(at:assets,withIntermediateDirectories:true);try data.write(to:assets.appendingPathComponent(name),options:.atomic)
            }
            reference="assets/"+name
        }
        let edit=MarkdownCommands.insert("!["+name.replacingOccurrences(of:"]",with:"\\]")+"]("+reference+")",at:session.selection.range)
        session.apply([edit.patch],selection:.init(edit.selection),label:"Insert Image")
    }
}
