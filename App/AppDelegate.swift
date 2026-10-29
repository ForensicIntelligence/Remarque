import AppKit

@main @MainActor final class AppDelegate:NSObject,NSApplicationDelegate,NSMenuDelegate,NSMenuItemValidation {
    static func main(){let app=NSApplication.shared;let delegate=AppDelegate();app.delegate=delegate;app.setActivationPolicy(.regular);withExtendedLifetime(delegate){app.run()}}
    func applicationDidFinishLaunching(_ notification:Notification){
        buildMenus();Preferences.shared.applyTheme();NSApp.servicesProvider=self
        if NSDocumentController.shared.documents.isEmpty{AppWindows.shared.start()}
        NSApp.activate(ignoringOtherApps:true)
    }
    func applicationShouldOpenUntitledFile(_ sender:NSApplication)->Bool{false}
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool{false}
    @objc func newDocument(_ sender:Any?){AppWindows.shared.newDocument()}
    var activeSession:DocumentSession?{(NSDocumentController.shared.currentDocument as? RemarqueDocument)?.session}
    @objc func runCommand(_ sender:NSMenuItem){
        guard let command=sender.representedObject as? String else{return}
        switch command{
        case "start":AppWindows.shared.start()
        case "settings":AppWindows.shared.settings()
        case "help":AppWindows.shared.help()
        case "workspace":AppWindows.shared.workspace()
        case "openWorkspace":WorkspaceModel.shared.choose();AppWindows.shared.workspace()
        case "history":if let session=activeSession{AppWindows.shared.history(session)}
        case "saveVersion":Task{await activeSession?.captureVersion()}
        case "outline":activeSession?.showOutline.toggle()
        case "preview":activeSession?.showPreview.toggle()
        case "source":activeSession?.showSource.toggle()
        case "focus":activeSession?.focusMode.toggle()
        case "find":activeSession?.showFind.toggle()
        case "palette":activeSession?.showPalette=true
        case "typewriter":Preferences.shared.values.typewriter.toggle()
        case "smartEditing":Preferences.shared.values.smartEditing.toggle()
        case "liveEditing":Preferences.shared.values.liveEditing.toggle()
        case "ribbon":Preferences.shared.values.formatRibbon.toggle()
        case "grantFolder":_ = FileGrants.shared.chooseFolder();activeSession?.broadcast()
        default:activeSession?.command(command)
        }
    }
    func validateMenuItem(_ item:NSMenuItem)->Bool{
        guard let command=item.representedObject as? String else{return true}
        if ["start","settings","help","workspace","openWorkspace","typewriter","smartEditing","liveEditing","ribbon"].contains(command){return true}
        if command=="undo"{item.title="Undo"+(activeSession?.engine.undoLabel.isEmpty==false ? " "+activeSession!.engine.undoLabel:"");return activeSession?.engine.canUndo ?? false}
        if command=="redo"{item.title="Redo"+(activeSession?.engine.redoLabel.isEmpty==false ? " "+activeSession!.engine.redoLabel:"");return activeSession?.engine.canRedo ?? false}
        return activeSession != nil
    }
    @objc func openRecent(_ sender:NSMenuItem){guard let url=sender.representedObject as? URL else{return};NSDocumentController.shared.openDocument(withContentsOf:url,display:true){_,_,error in if let error{NSApp.presentError(error)}}}
    func menuNeedsUpdate(_ menu:NSMenu){guard menu.title=="Open Recent" else{return};menu.removeAllItems()
        for url in NSDocumentController.shared.recentDocumentURLs{let item=NSMenuItem(title:url.lastPathComponent,action:#selector(openRecent(_:)),keyEquivalent:"");item.representedObject=url;item.target=self;item.toolTip=url.path;menu.addItem(item)}
        menu.addItem(.separator());let clear=NSMenuItem(title:"Clear Menu",action:#selector(NSDocumentController.clearRecentDocuments(_:)),keyEquivalent:"");clear.target=NSDocumentController.shared;menu.addItem(clear)
    }
    @objc func newNoteService(_ pasteboard:NSPasteboard,userData:String?,error:AutoreleasingUnsafeMutablePointer<NSString>){if let text=pasteboard.string(forType:.string){AppWindows.shared.newDocument(text:text)}}
    @objc func appendScratchpadService(_ pasteboard:NSPasteboard,userData:String?,error errorPointer:AutoreleasingUnsafeMutablePointer<NSString>){guard let text=pasteboard.string(forType:.string) else{return};do{try Scratchpad.append(text)}catch{errorPointer.pointee=error.localizedDescription as NSString}}
    func buildMenus(){
        let main=NSMenu();NSApp.mainMenu=main
        func menu(_ title:String)->NSMenu{let root=NSMenuItem();root.title=title;let m=NSMenu(title:title);root.submenu=m;main.addItem(root);return m}
        func item(_ m:NSMenu,_ title:String,_ action:Selector?,_ key:String="",_ modifiers:NSEvent.ModifierFlags = .command,_ target:AnyObject?=nil){let i=NSMenuItem(title:title,action:action,keyEquivalent:key);i.keyEquivalentModifierMask=modifiers;i.target=target;m.addItem(i)}
        func command(_ m:NSMenu,_ title:String,_ name:String,_ key:String="",_ mods:NSEvent.ModifierFlags = .command){let i=NSMenuItem(title:title,action:#selector(runCommand(_:)),keyEquivalent:key);i.target=self;i.keyEquivalentModifierMask=mods;i.representedObject=name;m.addItem(i)}
        let app=menu("Remarque");item(app,"About Remarque",#selector(NSApplication.orderFrontStandardAboutPanel(_:)),"",[],NSApp);command(app,"Settings…","settings",",");app.addItem(.separator())
        let services=NSMenu(title:"Services"),servicesItem=NSMenuItem(title:"Services",action:nil,keyEquivalent:"");servicesItem.submenu=services;app.addItem(servicesItem);NSApp.servicesMenu=services
        app.addItem(.separator());item(app,"Hide Remarque",#selector(NSApplication.hide(_:)),"h");item(app,"Hide Others",#selector(NSApplication.hideOtherApplications(_:)),"h",[.command,.option]);item(app,"Show All",#selector(NSApplication.unhideAllApplications(_:)));app.addItem(.separator());item(app,"Quit Remarque",#selector(NSApplication.terminate(_:)),"q")
        let file=menu("File");item(file,"New",#selector(newDocument(_:)),"n",.command,self);command(file,"Show Start Window","start","n",[.command,.option,.shift]);item(file,"Open…",#selector(NSDocumentController.openDocument(_:)),"o",.command,NSDocumentController.shared)
        let recent=NSMenuItem(title:"Open Recent",action:nil,keyEquivalent:""),recentMenu=NSMenu(title:"Open Recent");recentMenu.delegate=self;recent.submenu=recentMenu;file.addItem(recent)
        file.addItem(.separator());item(file,"Close",#selector(NSWindow.performClose(_:)),"w");item(file,"Save",#selector(NSDocument.save(_:)),"s");item(file,"Save As…",#selector(NSDocument.saveAs(_:)),"s",[.command,.shift]);item(file,"Duplicate",#selector(NSDocument.duplicate(_:)));item(file,"Rename…",NSSelectorFromString("renameDocument:"));item(file,"Move To…",NSSelectorFromString("moveDocument:"));item(file,"Revert To Saved",#selector(NSDocument.revertToSaved(_:)))
        command(file,"Save Version","saveVersion","s",[.command,.control]);command(file,"Version History…","history");file.addItem(.separator());command(file,"Workspace…","workspace","0",[.command,.shift]);command(file,"Open Folder as Workspace…","openWorkspace");command(file,"Grant Media Folder Access…","grantFolder")
        file.addItem(.separator());command(file,"Import Document…","importDocument","i",[.command,.shift]);command(file,"Import Mermaid…","importMermaid","i",[.command,.option])
        let export=NSMenu(title:"Export"),exportItem=NSMenuItem(title:"Export",action:nil,keyEquivalent:"");exportItem.submenu=export;file.addItem(exportItem)
        for format in ["HTML","PDF","DOCX","RTF","Slides","EPUB","LaTeX","Remarque","Embedded Markdown"]{command(export,format+"…","export:"+format)}
        file.addItem(.separator());command(file,"Print Document…","print","p");command(file,"Print Source…","printSource");command(file,"Print Document and Source…","printCombined")
        let edit=menu("Edit");command(edit,"Undo","undo","z");command(edit,"Redo","redo","z",[.command,.shift]);edit.addItem(.separator())
        for (title,key,selector) in [("Cut","x","cut:"),("Copy","c","copy:"),("Paste","v","paste:"),("Select All","a","selectAll:")]{item(edit,title,NSSelectorFromString(selector),key)}
        command(edit,"Copy as HTML","copyHTML");edit.addItem(.separator());command(edit,"Find and Replace…","find","f");command(edit,"Command Palette…","palette","p",[.command,.shift]);item(edit,"Emoji & Symbols",#selector(NSApplication.orderFrontCharacterPalette(_:)))
        let view=menu("View");command(view,"Toggle Outline","outline","o",[.command,.option]);command(view,"Toggle Source","source");command(view,"Toggle Preview","preview","p",[.command,.option]);command(view,"Focus Mode","focus","f",[.command,.option]);command(view,"Typewriter Mode","typewriter","t",[.command,.option]);command(view,"Smart Editing","smartEditing","s",[.command,.option]);command(view,"Live Editing","liveEditing","w",[.command,.option]);command(view,"Formatting Ribbon","ribbon","r",[.command,.control]);command(view,"Start Presentation","present","\r",[.command,.option]);item(view,"Enter Full Screen",#selector(NSWindow.toggleFullScreen(_:)),"f",[.command,.control])
        let format=menu("Format");command(format,"Bold","bold","b");command(format,"Italic","italic","i");command(format,"Inline Code","code");command(format,"Strikethrough","strike");command(format,"Highlight","highlight");command(format,"Insert Link…","link","k");command(format,"Insert Image…","image");command(format,"Bullet List","bullet");command(format,"Numbered List","ordered");command(format,"Task List","task");command(format,"Blockquote","quote");command(format,"Code Block","codeBlock","c",[.command,.option]);command(format,"Equation…","equation","e",[.command,.control]);command(format,"Table Editor…","tableEditor");command(format,"Quick Table","table");command(format,"Horizontal Rule","rule");command(format,"Format Document","formatDocument","l",[.command,.option])
        let diagram=menu("Diagram");command(diagram,"Insert Diagram…","gallery","m",[.command,.option]);command(diagram,"Visual Editor…","visualDiagram","m",[.command,.shift]);command(diagram,"Edit Source…","editObject");command(diagram,"Copy Mermaid Source","copyDiagramSource");command(diagram,"Copy SVG","copySVG");command(diagram,"Export Diagram…","exportDiagram")
        let window=menu("Window");NSApp.windowsMenu=window;item(window,"Minimize",#selector(NSWindow.performMiniaturize(_:)),"m");item(window,"Zoom",#selector(NSWindow.performZoom(_:)));item(window,"Bring All to Front",#selector(NSApplication.arrangeInFront(_:)))
        let help=menu("Help");NSApp.helpMenu=help;command(help,"Remarque Documentation","help","?");command(help,"Welcome to Remarque","start");command(help,"Markdown Guide","help");command(help,"Mermaid Guide","help");command(help,"Keyboard Shortcuts","help")
    }
}
