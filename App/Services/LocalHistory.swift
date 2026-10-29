import AppKit
import SwiftUI
import RemarqueCore

@MainActor enum LocalStorage {
    static let root=FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("Remarque",isDirectory:true)
    static let history=HistoryStore(root:root)
}
struct HistoryView:View {
    @ObservedObject var session:DocumentSession
    @State private var versions:[HistorySnapshot]=[]
    @State private var selected:String?
    @State private var oldText=""
    var body:some View{
        VStack(spacing:0){
            HStack{Text("Version History").font(.title2);Spacer();Button("Snapshot Now"){Task{await session.captureVersion();await refresh()}}.disabled(session.fileURL==nil)}.padding()
            if session.fileURL==nil{ContentUnavailableView("Save this document first",systemImage:"clock",description:Text("Versions are stored locally after a document has a filename."))}
            else{HSplitView{
                List(versions,selection:$selected){version in VStack(alignment:.leading){Text(version.date.formatted(date:.abbreviated,time:.standard));Text("\(version.label) · \(version.bytes) bytes").font(.caption).foregroundStyle(.secondary)}.tag(version.id)}.frame(minWidth:230)
                ScrollView{Text(diff).font(.system(size:12,design:.monospaced)).textSelection(.enabled).frame(maxWidth:.infinity,alignment:.leading).padding()}.frame(minWidth:440)
            }}
            HStack{Text("Current work is captured before a restore.").font(.caption).foregroundStyle(.secondary);Spacer();Button("Restore Selected Version"){Task{guard let selected,let key=session.fileURL?.path else{return};do{try await LocalStorage.history.capture(key:key,text:session.source,manual:true,label:"Before Restore");let text=try await LocalStorage.history.text(key:key,id:selected);session.replaceSource(text,selection:NSRange(location:0,length:0));await refresh()}catch{session.error=error.localizedDescription}}}.disabled(selected==nil)}.padding()
        }.frame(width:850,height:600).task{await refresh()}.onChange(of:selected){_,id in Task{guard let id,let key=session.fileURL?.path else{return};oldText=(try? await LocalStorage.history.text(key:key,id:id)) ?? ""}}
    }
    var diff:String{
        guard selected != nil else{return versions.isEmpty ? "No versions yet.":"Select a version to compare it with the current document."}
        let before=oldText.components(separatedBy:"\n"),after=session.source.components(separatedBy:"\n");let changes=after.difference(from:before)
        var added:[String]=[],removed:[String]=[]
        for c in changes{switch c{case .insert(_,let line,_):added.append("+ "+line);case .remove(_,let line,_):removed.append("− "+line)}}
        return "+\(added.count) −\(removed.count)\n\n"+(removed+added).joined(separator:"\n")+(changes.isEmpty ? "No changes.":"")
    }
    func refresh()async{guard let key=session.fileURL?.path else{return};do{versions=try await LocalStorage.history.list(key:key)}catch{session.error=error.localizedDescription}}
}
