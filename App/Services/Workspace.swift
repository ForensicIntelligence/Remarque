import AppKit
import SwiftUI
import UniformTypeIdentifiers

@MainActor final class FileGrants {
    static let shared=FileGrants()
    private(set) var roots:[URL]=[]
    private init(){for data in UserDefaults.standard.array(forKey:"folderGrants.v3") as? [Data] ?? [] {var stale=false;if let url=try? URL(resolvingBookmarkData:data,options:.withSecurityScope,relativeTo:nil,bookmarkDataIsStale:&stale),url.startAccessingSecurityScopedResource(){roots.append(url)}}}
    func grant(_ url:URL){
        guard !roots.contains(url) else{return};_ = url.startAccessingSecurityScopedResource();roots.append(url)
        UserDefaults.standard.set(roots.compactMap{try? $0.bookmarkData(options:.withSecurityScope,includingResourceValuesForKeys:nil,relativeTo:nil)},forKey:"folderGrants.v3")
    }
    func contains(_ url:URL)->Bool {let path=url.resolvingSymlinksInPath().path;return roots.contains{let root=$0.resolvingSymlinksInPath().path;return path==root || path.hasPrefix(root+"/")}}
    func chooseFolder(title:String="Grant Folder Access")->URL?{
        let panel=NSOpenPanel();panel.title=title;panel.canChooseFiles=false;panel.canChooseDirectories=true;panel.allowsMultipleSelection=false
        guard panel.runModal() == .OK,let url=panel.url else{return nil};grant(url);return url
    }
}
struct WorkspaceNote:Identifiable,Sendable {var path:String;var relative:String;var name:String;var text:String;var id:String{path}}
struct WorkspaceHit:Identifiable {var note:WorkspaceNote;var line:Int;var excerpt:String;var offset:Int;var id:String{note.path+":\(line)"}}
@MainActor final class WorkspaceModel:ObservableObject {
    static let shared=WorkspaceModel()
    @Published var folder:URL?
    @Published var notes:[WorkspaceNote]=[]
    @Published var query=""
    @Published var tab="Notes"
    @Published var loading=false
    @Published var error:String?
    private var scan:Task<Void,Never>?
    private init(){if let path=UserDefaults.standard.string(forKey:"workspace.path"),let root=FileGrants.shared.roots.first(where:{$0.path==path}){folder=root;refresh()}}
    func choose(){guard let url=FileGrants.shared.chooseFolder(title:"Open Folder as Workspace") else{return};folder=url;UserDefaults.standard.set(url.path,forKey:"workspace.path");refresh()}
    func refresh(){
        guard let folder else{return};scan?.cancel();loading=true
        scan=Task{let entries=await Task.detached(priority:.utility){()->[WorkspaceNote] in
            var result:[WorkspaceNote]=[];let fm=FileManager.default
            guard let enumerator=fm.enumerator(at:folder,includingPropertiesForKeys:[.isDirectoryKey,.isSymbolicLinkKey,.fileSizeKey],options:[.skipsHiddenFiles,.skipsPackageDescendants]) else{return []}
            while let url=enumerator.nextObject() as? URL{
                if Task.isCancelled{break};let values=try? url.resourceValues(forKeys:[.isDirectoryKey,.isSymbolicLinkKey,.fileSizeKey])
                if values?.isSymbolicLink==true || ["node_modules","vendor","DerivedData","build","dist"].contains(url.lastPathComponent){enumerator.skipDescendants();continue}
                guard ["md","markdown","mdown"].contains(url.pathExtension.lowercased()),values?.fileSize ?? 0 < 10_485_760 else{continue}
                if let text=try? String(contentsOf:url,encoding:.utf8){result.append(.init(path:url.path,relative:String(url.path.dropFirst(folder.path.count+1)),name:url.deletingPathExtension().lastPathComponent,text:text))}
                if result.count>=10000{break}
            }
            return result.sorted{$0.relative.localizedStandardCompare($1.relative) == .orderedAscending}
        }.value
            guard !Task.isCancelled else{return};notes=entries;loading=false
        }
    }
    func open(_ note:WorkspaceNote,offset:Int?=nil){NSDocumentController.shared.openDocument(withContentsOf:URL(fileURLWithPath:note.path),display:true){doc,_,error in
        if let error{self.error=error.localizedDescription};if let offset,let doc=doc as? RemarqueDocument {doc.session.select(.init(offset,offset),surface:"workspace",reveal:true)}
    }}
    func wiki(_ target:String){let name=target.components(separatedBy:"#")[0];let candidates=notes.filter{$0.name.caseInsensitiveCompare(name) == .orderedSame || $0.relative.lowercased()==name.lowercased() || ($0.relative as NSString).deletingPathExtension.lowercased()==name.lowercased()};if candidates.count==1 {open(candidates[0])}else{query=name;tab="Notes";AppWindows.shared.workspace()}}
    func search(_ query:String)->[WorkspaceHit]{
        guard !query.isEmpty else{return []};var hits:[WorkspaceHit]=[]
        for note in notes {var offset=0;for (index,line) in note.text.components(separatedBy:"\n").enumerated(){if line.localizedCaseInsensitiveContains(query){hits.append(.init(note:note,line:index+1,excerpt:line,offset:offset));if hits.count>=1000{return hits}};offset+=line.utf16.count+1}}
        return hits
    }
    func backlinks(to url:URL?)->[WorkspaceNote]{guard let url else{return []};let name=url.deletingPathExtension().lastPathComponent.lowercased();return notes.filter{note in note.path != url.path && note.text.lowercased().range(of:"\\[\\["+NSRegularExpression.escapedPattern(for:name)+"(?:\\||#|\\]\\])",options:.regularExpression) != nil}}
}
struct WorkspaceView:View {
    @ObservedObject var model=WorkspaceModel.shared
    @State private var selected:String?
    var filtered:[WorkspaceNote]{model.notes.filter{model.query.isEmpty || $0.relative.localizedCaseInsensitiveContains(model.query)}}
    var body:some View{
        VStack{
            HStack{Text(model.folder?.lastPathComponent ?? "Workspace").font(.title2);Spacer();if model.loading{ProgressView().controlSize(.small)};Button("Refresh"){model.refresh()};Button("Open Folder…"){model.choose()}}.padding(.horizontal)
            Picker("Workspace view",selection:$model.tab){Text("Notes").tag("Notes");Text("Search").tag("Search");Text("Backlinks").tag("Backlinks")}.pickerStyle(.segmented).padding(.horizontal)
            if model.folder==nil{ContentUnavailableView("Choose a folder of Markdown notes",systemImage:"folder",description:Text("Browse notes, search across files, and follow wiki links."))}
            else{
                TextField(model.tab=="Search" ? "Search across notes":"Quick open",text:$model.query).textFieldStyle(.roundedBorder).padding(.horizontal).onSubmit{if let note=filtered.first{model.open(note)}}
                if model.tab=="Search"{List(model.search(model.query)){hit in Button{model.open(hit.note,offset:hit.offset)}label:{VStack(alignment:.leading){Text("\(hit.note.relative):\(hit.line)").font(.headline);Text(hit.excerpt).lineLimit(2).foregroundStyle(.secondary)}}.buttonStyle(.plain)}}
                else{List(model.tab=="Backlinks" ? model.backlinks(to:(NSDocumentController.shared.currentDocument as? RemarqueDocument)?.fileURL):filtered,selection:$selected){note in VStack(alignment:.leading){Text(note.name);Text(note.relative).font(.caption).foregroundStyle(.secondary)}.tag(note.path).onTapGesture(count:2){model.open(note)}}.onSubmit{if let note=model.notes.first(where:{$0.path==selected}){model.open(note)}}}
            }
        }.padding(.vertical).frame(width:760,height:600).alert("Workspace",isPresented:Binding(get:{model.error != nil},set:{if !$0{model.error=nil}})){Button("OK"){model.error=nil}}message:{Text(model.error ?? "")}
    }
}
