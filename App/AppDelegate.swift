import AppKit

@main @MainActor final class AppDelegate: NSObject, NSApplicationDelegate {
    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate(); app.delegate = delegate
        app.setActivationPolicy(.regular)
        withExtendedLifetime(delegate) { app.run() }
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenus()
        if NSDocumentController.shared.documents.isEmpty { newDocument(nil) }
        NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldOpenUntitledFile(_ sender: NSApplication) -> Bool { false }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    @objc func newDocument(_ sender: Any?) {
        let doc = RemarqueDocument(); NSDocumentController.shared.addDocument(doc);doc.makeWindowControllers();doc.showWindows()
    }
    var activeSession: DocumentSession? { (NSDocumentController.shared.currentDocument as? RemarqueDocument)?.session }
    @objc func runCommand(_ sender: NSMenuItem) {
        guard let command = sender.representedObject as? String else { return }
        switch command {
        case "outline": activeSession?.showOutline.toggle()
        case "preview": activeSession?.showPreview.toggle()
        case "source": activeSession?.showSource.toggle()
        default: activeSession?.command(command)
        }
    }
    func buildMenus() {
        let main = NSMenu(); NSApp.mainMenu = main
        func menu(_ title: String) -> NSMenu { let root=NSMenuItem();root.title=title;let m=NSMenu(title:title);root.submenu=m;main.addItem(root);return m }
        func item(_ m:NSMenu,_ title:String,_ action:Selector?,_ key:String="",_ modifiers:NSEvent.ModifierFlags = .command,_ target:AnyObject?=nil) { let i=NSMenuItem(title:title,action:action,keyEquivalent:key);i.keyEquivalentModifierMask=modifiers;i.target=target;m.addItem(i) }
        func command(_ m:NSMenu,_ title:String,_ name:String,_ key:String="",_ mods:NSEvent.ModifierFlags = .command){let i=NSMenuItem(title:title,action:#selector(runCommand(_:)),keyEquivalent:key);i.target=self;i.keyEquivalentModifierMask=mods;i.representedObject=name;m.addItem(i)}
        let app=menu("Remarque")
        item(app,"About Remarque",#selector(NSApplication.orderFrontStandardAboutPanel(_:)),"",[],NSApp)
        app.addItem(.separator());item(app,"Hide Remarque",#selector(NSApplication.hide(_:)),"h");item(app,"Hide Others",#selector(NSApplication.hideOtherApplications(_:)),"h",[.command,.option]);item(app,"Show All",#selector(NSApplication.unhideAllApplications(_:)))
        app.addItem(.separator());item(app,"Quit Remarque",#selector(NSApplication.terminate(_:)),"q")
        let file=menu("File")
        item(file,"New",#selector(newDocument(_:)),"n",.command,self)
        item(file,"Open…",#selector(NSDocumentController.openDocument(_:)),"o",.command,NSDocumentController.shared)
        let recent=NSMenuItem(title:"Open Recent",action:nil,keyEquivalent:"");let recentMenu=NSMenu(title:"Open Recent");recentMenu.perform(NSSelectorFromString("_setMenuName:"),with:"NSRecentDocumentsMenu");recent.submenu=recentMenu;file.addItem(recent)
        item(recentMenu,"Clear Menu",#selector(NSDocumentController.clearRecentDocuments(_:)),"",[],NSDocumentController.shared)
        file.addItem(.separator());item(file,"Close",#selector(NSWindow.performClose(_:)),"w");item(file,"Save",#selector(NSDocument.save(_:)),"s");item(file,"Save As…",#selector(NSDocument.saveAs(_:)),"s",[.command,.shift]);item(file,"Duplicate",#selector(NSDocument.duplicate(_:)))
        let edit=menu("Edit");command(edit,"Undo","undo","z");command(edit,"Redo","redo","z",[.command,.shift]);edit.addItem(.separator())
        for (title,key,selector) in [("Cut","x","cut:"),("Copy","c","copy:"),("Paste","v","paste:"),("Select All","a","selectAll:")] { item(edit,title,NSSelectorFromString(selector),key) }
        let view=menu("View");command(view,"Toggle Outline","outline","o",[.command,.option]);command(view,"Toggle Source","source");command(view,"Toggle Preview","preview","p",[.command,.option]);item(view,"Enter Full Screen",#selector(NSWindow.toggleFullScreen(_:)),"f",[.command,.control])
        let format=menu("Format");command(format,"Bold","bold","b");command(format,"Italic","italic","i");command(format,"Inline Code","code");command(format,"Strikethrough","strike");command(format,"Highlight","highlight");command(format,"Insert Link…","link","k");command(format,"Bullet List","bullet");command(format,"Numbered List","ordered");command(format,"Task List","task");command(format,"Blockquote","quote");command(format,"Code Block","codeBlock","c",[.command,.option]);command(format,"Insert Table","table");command(format,"Horizontal Rule","rule")
        let window=menu("Window");NSApp.windowsMenu=window;item(window,"Minimize",#selector(NSWindow.performMiniaturize(_:)),"m");item(window,"Zoom",#selector(NSWindow.performZoom(_:)));item(window,"Bring All to Front",#selector(NSApplication.arrangeInFront(_:)))
    }
}
