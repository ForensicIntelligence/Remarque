import AppKit
import Combine
import RemarqueCore

struct OutlineEntry: Identifiable, Codable {
    var title: String
    var level: Int
    var start: Int
    var end: Int
    var kind: String
    var id: Int { start }
}

@MainActor final class DocumentSession: ObservableObject {
    let id = UUID().uuidString
    private(set) var engine: DocumentEngine
    @Published private(set) var source: String
    @Published private(set) var revision = 0
    @Published var selection = EditorSelection()
    @Published var outline: [OutlineEntry] = []
    @Published var error: String?
    @Published var activeMarks:Set<String>=[]
    @Published var selectedKind="text"
    @Published var selectionInTable=false
    @Published var showOutline = true
    @Published var showSource = true
    @Published var showPreview = true
    @Published var sourceSize: Double = 15
    @Published var previewSize: Double = 17
    @Published var wordCount = 0
    @Published var diagramCount = 0
    @Published var webReady = false
    @Published var focusMode = false
    @Published var showFind = false
    @Published var showPalette = false
    var readOnly = false
    @Published var fileURL:URL?{didSet{
        if let old=oldValue?.path,let new=fileURL?.path,old != new{Task{do{try await LocalStorage.history.copyHistory(from:old,to:new)}catch{self.error="History could not follow the renamed file: \(error.localizedDescription)"}}}
    }}
    @Published var missingMedia:String?
    private var recoveryTask:Task<Void,Never>?
    var onChange: (() -> Void)?
    var webReceivers:[UUID:([String:Any])->Void]=[:]
    var sendWeb: (([String: Any]) -> Void)? {{[weak self] message in self?.webReceivers.values.forEach{$0(message)}}}
    var revealSource: ((NSRange) -> Void)?
    var scrollSource: ((Int)->Void)?
    var inputGroup: (String, String, Date)?
    init(_ source: String = "") { self.source = source; engine = DocumentEngine(source) }
    var dirty: Bool { engine.isDirty }
    func engineMarkInitialUnsaved(){engine.markSaved("");objectWillChange.send();onChange?();scheduleRecovery()}
    func load(_ text: String) {
        if webReady || revision>0{engine.reload(text)}else{engine=DocumentEngine(text)}
        source=text;revision=engine.revision;selection=engine.selection;broadcast()
    }
    func select(_ range: SourceRange, surface: String, reveal: Bool = false) {
        engine.select(.init(range, surface: surface)); selection = engine.selection
        if surface == "rendered" || reveal { revealSource?(selection.range.nsRange) }
        if surface == "rendered"{sendWeb?(["type":"selection","target":"liveSource","revision":revision,"start":range.start,"end":range.end,"reveal":true])}
        if surface != "rendered" { sendWeb?(["type":"selection", "documentID":id, "revision":revision, "start":range.start,"end":range.end,"reveal":reveal]) }
    }
    func synchronizeScroll(from surface:String,offset:Int,at revision:Int){
        guard Preferences.shared.values.scrollSync,revision==self.revision else{return}
        let start=max(0,min(offset,source.utf16.count))
        if surface=="rendered"{scrollSource?(start)}
        sendWeb?(["type":"scroll","target":surface=="rendered" ? "liveSource":"rendered","revision":revision,"start":start])
    }
    func group(for surface: String) -> String {
        let now = Date()
        if let (name, previous, time) = inputGroup, previous == surface, now.timeIntervalSince(time) < 0.5 { inputGroup = (name, surface, now); return name }
        let name = UUID().uuidString; inputGroup = (name, surface, now); return name
    }
    func apply(_ patches: [SourcePatch], base: Int? = nil, selection next: EditorSelection? = nil, label: String = "Edit", group: String? = nil, transactionID: String? = nil) {
        do {
            try engine.apply(patches, baseRevision: base ?? revision, selection: next, label: label, group: group)
            source = engine.text; revision = engine.revision; selection = engine.selection
            onChange?(); scheduleRecovery(); broadcast(transactionID: transactionID, patches: patches)
        } catch { self.error = error.localizedDescription; broadcast(rejected: transactionID) }
    }
    func replaceSource(_ text: String, selection range: NSRange) {
        guard text != source else { return }
        apply([DocumentEngine.minimalPatch(from: source, to: text)], selection: .init(.init(range.location, range.location + range.length)), group: group(for: "source"))
    }
    func undo() { do { if try engine.undo() != nil { didUndo() } } catch { self.error = error.localizedDescription } }
    func redo() { do { if try engine.redo() != nil { didUndo() } } catch { self.error = error.localizedDescription } }
    private func didUndo() { inputGroup = nil; source = engine.text; revision = engine.revision; selection = engine.selection; onChange?(); scheduleRecovery(); broadcast(); revealSource?(selection.range.nsRange) }
    func markSaved(_ text: String) {
        engine.markSaved(text);objectWillChange.send()
        Task{if let key=fileURL?.path{do{try await LocalStorage.history.capture(key:key,text:text,label:"Saved")}catch{self.error=error.localizedDescription}};try? await LocalStorage.history.removeRecovery(id)}
    }
    func acceptExternalBaseline(_ text:String){
        engine.markSaved(text);objectWillChange.send();scheduleRecovery()
    }
    private func scheduleRecovery(){
        guard !readOnly else{return};recoveryTask?.cancel()
        recoveryTask=Task{[weak self] in
            do{try await Task.sleep(for:.seconds(2));guard let self else{return}
                try await LocalStorage.history.journal(.init(id:self.id,filePath:self.fileURL?.path,source:self.source,selection:self.selection.range))
                try await Task.sleep(for:.seconds(28));if let key=self.fileURL?.path{try await LocalStorage.history.capture(key:key,text:self.source)}
            }catch is CancellationError{}catch{self?.error="Local recovery could not be saved: \(error.localizedDescription)"}
        }
    }
    func captureVersion()async{
        guard let key=fileURL?.path else{error="Save this document before capturing a version.";return}
        do{try await LocalStorage.history.capture(key:key,text:source,manual:true,label:"Manual")}catch{self.error=error.localizedDescription}
    }
    func closed(){recoveryTask?.cancel();Task{try? await LocalStorage.history.removeRecovery(id)}}
    func broadcast(transactionID: String? = nil, patches: [SourcePatch] = [], rejected: String? = nil) {
        let encoded = (try? JSONSerialization.jsonObject(with: JSONEncoder().encode(patches))) ?? []
        sendWeb?(["type":"state", "documentID":id, "revision":revision, "source":source,
                  "start":selection.range.start,"end":selection.range.end,"surface":selection.surface,
                  "transactionID":transactionID ?? "", "rejected":rejected ?? "", "patches":encoded,"readOnly":readOnly,"preferences":Preferences.shared.web])
    }
    func command(_ name: String, value: Any? = nil) {
        if name == "undo" { undo(); return }; if name == "redo" { redo(); return }
        if name == "image"{MediaStore.insertFile(in:self);return}
        if name == "printSource"{ExportService.shared.printSource(self);return}
        if name == "importDocument"{ImportService.openDocument(self);return}
        if name == "importMermaid"{ImportService.mermaid(self);return}
        inputGroup = nil
        if name.hasPrefix("export:") || name=="present"{sendWeb?(["type":"preferences","values":Preferences.shared.web])}
        if name == "formatDocument" && !webReady {
            replaceSource(MarkdownCommands.format(source),selection:selection.range.nsRange);inputGroup=nil;return
        }
        if selection.surface != "rendered",let edit=sourceCommand(name,value:value){
            apply([edit.patch],selection:.init(edit.selection),label:name)
            revealSource?(edit.selection.nsRange);return
        }
        var message: [String:Any] = ["type":"command","name":name,"start":selection.range.start,"end":selection.range.end,"surface":selection.surface]
        if let value { message["value"] = value }
        sendWeb?(message)
    }
    func insertSnippet(_ snippet:Snippet,range:SourceRange?=nil){
        let edit=MarkdownCommands.insert(snippet.body,at:range ?? selection.range)
        apply([edit.patch],selection:.init(edit.selection),label:"Insert Snippet");revealSource?(edit.selection.nsRange)
    }
    private func sourceCommand(_ name:String,value:Any?)->CommandEdit?{
        let r=selection.range
        let markers=["bold":"**","italic":"*","strike":"~~","highlight":"==","code":"`","sup":"^","sub":"~"]
        if let marker=markers[name]{return MarkdownCommands.wrap(source,selection:r,marker:marker)}
        if name=="heading" {return MarkdownCommands.prefixLines(source,selection:r,prefix:String(repeating:"#",count:value as? Int ?? 0)+((value as? Int ?? 0)>0 ? " ":""))}
        if let prefix=["quote":"> ","bullet":"- ","ordered":"1. ","task":"- [ ] "][name]{return MarkdownCommands.prefixLines(source,selection:r,prefix:prefix)}
        let templates=["codeBlock":"```\n$0\n```","table":"| $0 | Header |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |","rule":"\n---\n","callout":"> [!NOTE]\n> $0","details":"<details>\n<summary>Details</summary>\n\n$0\n\n</details>","footnote":"[^note]\n\n[^note]: $0"]
        if let text=templates[name]{return MarkdownCommands.insert(text,at:r)}
        return nil
    }
}
