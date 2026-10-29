import AppKit
import SwiftUI
import RemarqueCore

@MainActor @objc(RemarqueDocument) final class RemarqueDocument: NSDocument {
    let session = DocumentSession()
    private var resolvingExternalChange=false
    override init() {
        super.init()
        session.onChange = { [weak self] in self?.updateChangeCount(.changeDone) }
        hasUndoManager = false
    }
    override class var autosavesInPlace: Bool { true }
    override var fileURL:URL? {didSet{MainActor.assumeIsolated{session.fileURL=fileURL}}}
    override var isDocumentEdited: Bool { session.dirty }
    override func data(ofType typeName: String) throws -> Data { Data(session.source.utf8) }
    nonisolated override func read(from data: Data, ofType typeName: String) throws {
        let text = try SourceBuffer(data: data).text
        MainActor.assumeIsolated { session.load(text) }
    }
    override func updateChangeCount(_ change:NSDocument.ChangeType){
        super.updateChangeCount(change)
        // Autosaving an untitled draft to macOS's recovery directory is not a
        // user save. It must remain Edited and continue prompting on close.
        if fileURL != nil && (change == .changeCleared || change == .changeAutosaved){session.markSaved(session.source)}
    }
    override func makeWindowControllers() {
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 860), styleMask: [.titled,.closable,.miniaturizable,.resizable], backing: .buffered, defer: false)
        window.minSize = NSSize(width: 800, height: 540)
        window.title = "Remarque"
        window.tabbingMode = .preferred
        window.setFrameAutosaveName("RemarqueDocument")
        window.contentView = NSHostingView(rootView: EditorWorkspace(session: session))
        addWindowController(NSWindowController(window: window)); window.center()
    }
    override func close(){session.closed();super.close()}
    nonisolated override func presentedItemDidChange(){
        Task{@MainActor [weak self] in await self?.checkExternalChange()}
    }
    private func checkExternalChange()async{
        guard !resolvingExternalChange,let url=fileURL else{return}
        do{
            let incoming=try SourceBuffer(data:Data(contentsOf:url)).text
            guard incoming != session.source,!session.engine.isSavedVersion(incoming) else{return}
            resolvingExternalChange=true;defer{resolvingExternalChange=false}
            if session.dirty{
                let alert=NSAlert();alert.messageText="This document changed outside Remarque.";alert.informativeText="Reload the changed file, or keep your current edits. A local version is captured before reloading.";alert.addButton(withTitle:"Keep Editing");alert.addButton(withTitle:"Reload File")
                let response:NSApplication.ModalResponse
                if let window=windowControllers.first?.window{response=await alert.beginSheetModal(for:window)}else{response=alert.runModal()}
                if response == .alertFirstButtonReturn{session.acceptExternalBaseline(incoming);return}
            }
            try await LocalStorage.history.capture(key:url.path,text:session.source,manual:true,label:"Before External Reload")
            session.load(incoming);updateChangeCount(.changeCleared)
        }catch{session.error="External file change could not be read: \(error.localizedDescription)"}
    }
}
