import SwiftUI
import RemarqueCore

struct FindBar:View {
    @ObservedObject var session:DocumentSession
    @State private var query=""
    @State private var replacement=""
    @State private var caseSensitive=false
    @State private var wholeWord=false
    @State private var regex=false
    @State private var index=0
    @FocusState private var focused:Bool
    var options:SearchOptions{.init(caseSensitive:caseSensitive,wholeWord:wholeWord,regularExpression:regex)}
    var results:[SourceRange]{(try? DocumentSearch.matches(session.source,query:query,options:options)) ?? []}
    var error:String?{do{_ = try DocumentSearch.expression(query,options:options);return nil}catch{return error.localizedDescription}}
    var body:some View{
        VStack(spacing:7){
            HStack{
                TextField("Find in source",text:$query).focused($focused).onSubmit{advance(1)}
                Text(error==nil ? "\(results.count) matches":"Invalid expression").font(.caption).foregroundStyle(error==nil ? Color.secondary:Color.red).help(error ?? "")
                Button{advance(-1)}label:{Image(systemName:"chevron.up")}.help("Previous match")
                Button{advance(1)}label:{Image(systemName:"chevron.down")}.help("Next match")
                Button{session.showFind=false}label:{Image(systemName:"xmark")}.help("Close Find")
            }
            HStack{
                TextField("Replace with",text:$replacement)
                Toggle("Case",isOn:$caseSensitive);Toggle("Whole word",isOn:$wholeWord);Toggle("Regex",isOn:$regex)
                Button("Replace"){replace(all:false)}.disabled(results.isEmpty)
                Button("Replace All"){replace(all:true)}.disabled(results.isEmpty)
            }.font(.caption)
        }.padding(10).background(.bar).onAppear{focused=true}.onChange(of:query){_,_ in index=0;reveal()}.onExitCommand{session.showFind=false}
    }
    func advance(_ delta:Int){guard !results.isEmpty else{return};index=(index+delta+results.count)%results.count;reveal()}
    func reveal(){guard !results.isEmpty else{return};index=min(index,results.count-1);session.select(results[index],surface:"find",reveal:true)}
    func replace(all:Bool){do{let patches=try DocumentSearch.replacements(session.source,query:query,replacement:replacement,options:options);guard !patches.isEmpty else{return};session.apply(all ? patches:[patches[min(index,patches.count-1)]],label:all ? "Replace All":"Replace");reveal()}catch{session.error=error.localizedDescription}}
}
struct PaletteCommand:Identifiable {var id:String;var title:String;var action:()->Void}
struct CommandPalette:View {
    @ObservedObject var session:DocumentSession
    @State private var query=""
    @State private var selected:String?
    @FocusState private var focused:Bool
    @Environment(\.dismiss) var dismiss
    var commands:[PaletteCommand]{
        var items:[PaletteCommand]=[
            .init(id:"outline",title:"Toggle Outline"){session.showOutline.toggle()},.init(id:"preview",title:"Toggle Preview"){session.showPreview.toggle()},.init(id:"focus",title:"Toggle Focus Mode"){session.focusMode.toggle()},
            .init(id:"find",title:"Find and Replace"){session.showFind=true},.init(id:"settings",title:"Settings"){AppWindows.shared.settings()},.init(id:"workspace",title:"Open Workspace"){AppWindows.shared.workspace()},.init(id:"history",title:"Version History"){AppWindows.shared.history(session)}]
        for (id,title) in [("gallery","Insert Mermaid Diagram"),("visualDiagram","Edit Diagram Visually"),("table","Insert Quick Table"),("tableEditor","Table Editor"),("equation","Insert Equation"),("link","Insert Link"),("image","Insert Image"),("task","Task List"),("codeBlock","Code Block"),("formatDocument","Format Document"),("copyHTML","Copy as HTML"),("present","Start Presentation")] {items.append(.init(id:id,title:title){session.command(id)})}
        for item in session.outline {items.append(.init(id:"outline-\(item.id)",title:"Go to: "+item.title){session.select(.init(item.start,item.end),surface:"outline",reveal:true)})}
        for snippet in Preferences.shared.values.snippets {items.append(.init(id:snippet.id.uuidString,title:"Snippet: "+snippet.name){session.insertSnippet(snippet)})}
        for theme in ["System","Paper","Midnight","Graphite"]{items.append(.init(id:theme,title:"Theme: "+theme){Preferences.shared.values.theme=theme})}
        return items
    }
    var matches:[PaletteCommand]{commands.filter{fuzzy(query,$0.title)}}
    var body:some View{
        VStack(spacing:0){TextField("Search commands, headings, and snippets",text:$query).textFieldStyle(.plain).font(.title3).padding(18).focused($focused).onSubmit{run()}
            Divider();List(matches,selection:$selected){command in Text(command.title).padding(.vertical,5).tag(command.id).onTapGesture(count:2){selected=command.id;run()}}.overlay{if matches.isEmpty{ContentUnavailableView.search(text:query)}}
            HStack{Text("↑ ↓ to select · Return to run · Esc to close").font(.caption).foregroundStyle(.secondary);Spacer();Button("Run"){run()}.keyboardShortcut(.defaultAction)}.padding(12)
        }.frame(width:560,height:440).onAppear{focused=true;selected=matches.first?.id}.onChange(of:query){_,_ in selected=matches.first?.id}.onMoveCommand{direction in guard !matches.isEmpty else{return};let i=matches.firstIndex{$0.id==selected} ?? 0;selected=matches[min(matches.count-1,max(0,i+(direction == .up ? -1:1)))].id}.onExitCommand{dismiss()}
    }
    func run(){guard let command=matches.first(where:{$0.id==selected}) ?? matches.first else{return};dismiss();command.action()}
    func fuzzy(_ needle:String,_ haystack:String)->Bool{var chars=Array(needle.lowercased()).makeIterator();var current=chars.next();for c in haystack.lowercased(){if c==current{current=chars.next()}};return current==nil}
}
