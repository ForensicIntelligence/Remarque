import SwiftUI
import RemarqueCore

struct EditorWorkspace:View{
    @ObservedObject var session:DocumentSession
    var body:some View{
        VStack(spacing:0){
            HStack(spacing:12){
                Image(systemName:"doc.richtext").font(.title3).foregroundStyle(.blue)
                Text("Remarque").font(.headline)
                Text("3.0 · Development").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Button{session.showOutline.toggle()}label:{Image(systemName:"sidebar.left")}.help("Toggle Outline (⌥⌘O)")
                Picker("Layout",selection:Binding(get:{session.showSource && session.showPreview ? "split":session.showSource ? "source":"preview"},set:{session.showSource=$0 != "preview";session.showPreview=$0 != "source"})){
                    Text("Editor + Preview").tag("split");Text("Editor").tag("source");Text("Preview").tag("preview")
                }.frame(width:180)
            }.padding(.horizontal,16).padding(.vertical,10)
            Divider()
            HSplitView{
                if session.showOutline{
                    VStack(alignment:.leading,spacing:12){
                        Text("OUTLINE").font(.caption.weight(.semibold)).foregroundStyle(.secondary).padding(.horizontal,16).padding(.top,18)
                        if session.outline.isEmpty{Text("Headings and diagrams appear here.").font(.callout).foregroundStyle(.secondary).padding()}
                        ScrollView{LazyVStack(alignment:.leading,spacing:2){ForEach(session.outline){entry in
                            Button{session.select(.init(entry.start,entry.end),surface:"outline",reveal:true)}label:{HStack(alignment:.top){Image(systemName:entry.kind=="diagram" ? "point.3.connected.trianglepath.dotted":"number").frame(width:16);Text(entry.title).lineLimit(2);Spacer(minLength:0)}.padding(.leading,CGFloat(max(0,entry.level-1))*10).padding(.vertical,7).padding(.horizontal,12)}.buttonStyle(.plain).font(.system(size:12))
                        }}}
                    }.frame(minWidth:140,idealWidth:190,maxWidth:280).background(.quaternary.opacity(0.3))
                }
                if session.showSource{
                    VStack(spacing:0){
                        HStack{Text("MARKDOWN SOURCE").font(.caption.weight(.semibold)).foregroundStyle(.secondary);Spacer();Text("UTF-8").font(.caption2).foregroundStyle(.tertiary)}.padding(.horizontal,18).frame(height:34)
                        Divider();SourceEditor(session:session)
                    }.frame(minWidth:240)
                }
                if session.showPreview{
                    VStack(spacing:0){RightToolbar(session:session);Divider();RenderedEditor(session:session)}.frame(minWidth:300)
                }
            }
            Divider()
            HStack(spacing:16){
                Text("\(session.wordCount) words");Text("\(session.wordCount == 0 ? 0 : max(1,Int(ceil(Double(session.wordCount)/200)))) min read")
                Text("\(session.diagramCount) diagrams");Spacer()
                Text(cursorPosition);Text(session.dirty ? "Edited":"Saved").foregroundStyle(session.dirty ? .orange:.secondary)
            }.font(.system(size:11)).foregroundStyle(.secondary).padding(.horizontal,16).frame(height:27)
        }
        .alert("Remarque",isPresented:Binding(get:{session.error != nil},set:{if !$0{session.error=nil}})){Button("OK"){session.error=nil}}message:{Text(session.error ?? "")}
    }
    var cursorPosition:String{
        let prefix=(session.source as NSString).substring(to:min(session.selection.range.start,(session.source as NSString).length))
        let parts=prefix.components(separatedBy:"\n");return "Line \(parts.count), Col \((parts.last ?? "").utf16.count+1)"
    }
}

struct RightToolbar:View{
    @ObservedObject var session:DocumentSession
    var body:some View{
        VStack(spacing:0){
            HStack(spacing:4){ForEach(["markdown","Mermaid","LaTeX"],id:\.self){tab in
                Button{session.activeTab=tab;session.command("tab",value:tab)}label:{Text(tab).font(.system(size:12,weight:session.activeTab==tab ? .semibold:.regular)).padding(.horizontal,15).padding(.vertical,7).background(session.activeTab==tab ? Color.accentColor.opacity(0.13):Color.clear,in:RoundedRectangle(cornerRadius:6))}.buttonStyle(.plain).accessibilityAddTraits(session.activeTab==tab ? .isSelected:[])
            };Spacer()}.padding(.horizontal,10).padding(.top,7)
            ScrollView(.horizontal,showsIndicators:false){HStack(spacing:3){
                tool("Undo","arrow.uturn.backward","undo");tool("Redo","arrow.uturn.forward","redo");Divider().frame(height:20)
                if session.activeTab=="markdown"{
                    Menu("Style"){
                        Button("Body"){session.command("heading",value:0)}
                        ForEach(1...6,id:\.self){level in Button("Heading \(level)"){session.command("heading",value:level)}}
                        Button("Quote"){session.command("quote")}
                    }.fixedSize()
                    tool("Bold (⌘B)","bold","bold");tool("Italic (⌘I)","italic","italic");tool("Strikethrough","strikethrough","strike");tool("Highlight","highlighter","highlight");tool("Inline code","chevron.left.forwardslash.chevron.right","code")
                    Divider().frame(height:20)
                    tool("Bullet list","list.bullet","bullet");tool("Numbered list","list.number","ordered");tool("Task list","checklist","task")
                    Menu{Button("Link…"){session.command("link")};Button("Image…"){session.command("image")};Button("Table"){session.command("table")};Button("Code Block"){session.command("codeBlock")};Button("Horizontal Rule"){session.command("rule")};Button("Callout"){session.command("callout")};Button("Footnote"){session.command("footnote")};Button("Details"){session.command("details")}}label:{Image(systemName:"plus.square")}.fixedSize().help("Insert")
                }else if session.activeTab=="Mermaid"{
                    Button("Insert Diagram…"){session.command("gallery")}.font(.caption)
                    Button("Edit Source"){session.command("editObject")}.font(.caption)
                    Button("Visual Editor"){session.command("visualDiagram")}.font(.caption)
                    Button("Copy SVG"){session.command("copySVG")}.font(.caption)
                }else{
                    Button("Insert Equation"){session.command("equation")}.font(.caption)
                    Button("Edit LaTeX"){session.command("editObject")}.font(.caption)
                    Button("Inline / Display"){session.command("mathMode")}.font(.caption)
                }
            }.buttonStyle(.borderless).padding(.horizontal,10).frame(height:38)}
        }.background(.bar)
    }
    func tool(_ title:String,_ symbol:String,_ command:String)->some View{Button{session.command(command)}label:{Image(systemName:symbol).frame(width:25,height:26)}.help(title).accessibilityLabel(title)}
}
