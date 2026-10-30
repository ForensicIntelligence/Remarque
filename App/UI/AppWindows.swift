import AppKit
import SwiftUI
import RemarqueCore

@MainActor final class AppWindows {
    static let shared=AppWindows()
    private var windows:[String:NSWindowController]=[:]
    func show<Content:View>(_ key:String,title:String,size:NSSize=NSSize(width:800,height:600),minimumSize:NSSize=NSSize(width:480,height:360),resizable:Bool=true,content:()->Content){
        if let controller=windows[key]{
            if let window=controller.window{fitToScreen(window);window.makeKeyAndOrderFront(nil)}
            return
        }
        var style:NSWindow.StyleMask=[.titled,.closable,.miniaturizable]
        if resizable{style.insert(.resizable)}
        let window=NSWindow(contentRect:NSRect(origin:.zero,size:size),styleMask:style,backing:.buffered,defer:false)
        window.identifier=NSUserInterfaceItemIdentifier(key)
        window.tabbingMode = .disallowed
        window.title=title;window.contentView=NSHostingView(rootView:content());window.isReleasedWhenClosed=false
        let screenSize=(NSScreen.main?.visibleFrame.size ?? size)
        window.contentMinSize=NSSize(width:min(minimumSize.width,screenSize.width),height:min(minimumSize.height,max(0,screenSize.height-28)))
        window.center();fitToScreen(window)
        let controller=NSWindowController(window:window);windows[key]=controller;controller.showWindow(nil)
    }
    private func fitToScreen(_ window:NSWindow){
        guard let screen=window.screen ?? NSScreen.main else{return}
        var frame=window.frame
        frame.size.width=min(frame.width,screen.visibleFrame.width)
        frame.size.height=min(frame.height,screen.visibleFrame.height)
        window.setFrame(window.constrainFrameRect(frame,to:screen),display:true)
    }
    func about(){show("about",title:"About Remarque",size:NSSize(width:560,height:590),minimumSize:NSSize(width:480,height:400),resizable:false){AboutView()}}
    func settings(_ section:String?=nil){if let section{SettingsNavigation.shared.section=section};show("settings",title:"Remarque Settings"){SettingsView()}}
    func workspace(){show("workspace",title:"Workspace"){WorkspaceView()}}
    func history(_ session:DocumentSession){show("history-"+session.id,title:"Version History"){HistoryView(session:session)}}
    func start(){
        show("start",title:"Welcome to Remarque",size:NSSize(width:900,height:660),minimumSize:NSSize(width:760,height:500)){StartView()}
        NotificationCenter.default.post(name:.remarqueRefreshStart,object:nil)
    }
    func help(_ article:String="Welcome"){HelpNavigation.shared.open(article);show("help",title:"Remarque Documentation",size:NSSize(width:1100,height:760)){HelpView()}}
    func newDocument(text:String=""){
        let doc=RemarqueDocument();doc.session.load(text)
        if !text.isEmpty{doc.session.engineMarkInitialUnsaved()}
        NSDocumentController.shared.addDocument(doc);doc.makeWindowControllers();doc.showWindows()
    }
}
extension Notification.Name {
    static let remarqueRefreshStart=Notification.Name("RemarqueRefreshStart")
}
struct StartView:View {
    @State private var recoveries:[RecoveryEntry]=[]
    @State private var recentDocuments:[URL]=[]
    @State private var hasMoreRecentDocuments=false
    let templates=["Blank Document","Guided Tour","Technical Spec","Meeting Notes","Diagram Doc","Product Plan"]
    var body:some View{
        HStack(spacing:0){
            VStack(alignment:.leading,spacing:18){Image(nsImage:NSApp.applicationIconImage).resizable().frame(width:74,height:74);Text("Remarque").font(.system(size:32,weight:.bold));Text("Markdown. Beautifully refined.").foregroundStyle(.secondary);Text(BuildInfo.label).font(.caption).foregroundStyle(.secondary)
                Button("Open Document…"){NSDocumentController.shared.openDocument(nil)}.keyboardShortcut("o");Button("Documentation"){AppWindows.shared.help()};Button("Settings…"){AppWindows.shared.settings()};Spacer()
                Link("Forensic Intelligence",destination:URL(string:"https://forensicintelligence.ca")!)
            }.padding(30).frame(width:280).background(.quaternary.opacity(0.3))
            ScrollView{VStack(alignment:.leading,spacing:18){
                Text("Create a document").font(.title2)
                LazyVGrid(columns:[GridItem(.flexible()),GridItem(.flexible())],spacing:12){ForEach(templates,id:\.self){name in Button{AppWindows.shared.newDocument(text:template(name))}label:{HStack{Image(systemName:"doc.text").font(.title2).foregroundStyle(.blue);Text(name);Spacer()}.padding(16).frame(maxWidth:.infinity,alignment:.leading)}.buttonStyle(.bordered)}}
                VStack(alignment:.leading,spacing:10){
                    Text("Recent documents").font(.headline)
                    if recentDocuments.isEmpty{Text("No recent documents.").foregroundStyle(.secondary)}
                    ForEach(recentDocuments,id:\.self){url in
                        Button{NSDocumentController.shared.openDocument(withContentsOf:url,display:true){_,_,error in if let error{NSApp.presentError(error)}}}label:{
                            HStack(spacing:10){
                                Image(systemName:"doc.text").foregroundStyle(.secondary).accessibilityHidden(true)
                                VStack(alignment:.leading,spacing:2){
                                    Text(url.lastPathComponent).lineLimit(1).truncationMode(.middle)
                                    Text(url.deletingLastPathComponent().path).font(.caption).foregroundStyle(.secondary).lineLimit(1).truncationMode(.middle)
                                }
                                Spacer(minLength:0)
                                Image(systemName:"arrow.up.right").font(.caption2).foregroundStyle(.tertiary).accessibilityHidden(true)
                            }.padding(.vertical,4).contentShape(Rectangle())
                        }.buttonStyle(.plain).help(url.path)
                    }
                    if hasMoreRecentDocuments{Text("More in File → Open Recent").font(.caption).foregroundStyle(.secondary)}
                }.frame(maxWidth:.infinity,alignment:.leading)
                if !recoveries.isEmpty{Text("Recover unsaved work").font(.headline);ForEach(recoveries){entry in Button("Recover \(entry.filePath.map{URL(fileURLWithPath:$0).lastPathComponent} ?? "Untitled") · \(entry.date.formatted())"){AppWindows.shared.newDocument(text:entry.source);Task{try? await LocalStorage.history.removeRecovery(entry.id);recoveries.removeAll{$0.id==entry.id}}}}}
            }.padding(28)}
        }.frame(maxWidth:.infinity,maxHeight:.infinity)
        .onAppear{refreshRecents()}
        .onReceive(NotificationCenter.default.publisher(for:.remarqueRefreshStart)){_ in refreshRecents()}
        .onReceive(NotificationCenter.default.publisher(for:NSWindow.didBecomeKeyNotification)){notification in
            if (notification.object as? NSWindow)?.identifier?.rawValue=="start"{refreshRecents()}
        }
        .task{recoveries=(try? await LocalStorage.history.recoveries()) ?? []}
    }
    private func refreshRecents(){
        let all=NSDocumentController.shared.recentDocumentURLs
        recentDocuments=Array(all.prefix(5));hasMoreRecentDocuments=all.count>5
    }
    func template(_ name:String)->String{guard name != "Blank Document",let url=Bundle.main.url(forResource:name,withExtension:"md",subdirectory:"Templates") else{return ""};return (try? String(contentsOf:url,encoding:.utf8)) ?? ""}
}
